package service

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"sync/atomic"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
)

var (
	ErrSlotFull      = errors.New("该时段名额已满")
	ErrDateInvalid   = errors.New("预约日期无效，仅可预约未来 7 天内的日期")
	ErrSlotDisabled  = errors.New("所选时间段已停用")
	ErrNotFound      = errors.New("申请不存在")
	ErrStatusIllegal = errors.New("当前状态不允许该操作")
	ErrBlacklisted   = errors.New("您已被列入黑名单，无法提交申请")
	ErrDuplicate     = errors.New("您在同一时段已存在待审批/已通过的申请")
	ErrVerifyLocked  = errors.New("正在核销中，请勿重复操作")
)

// 名额抢占 Lua：原子 INCR + 首次设置 15 天过期 + 超限返回 -1
const reserveLua = `
local cur = redis.call('INCR', KEYS[1])
if cur == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if cur > tonumber(ARGV[1]) then
    return -1
end
return cur
`

// 原子自增并设置过期时间（记录编号序列复用）
const incrExpireLua = `
local cur = redis.call('INCR', KEYS[1])
if cur == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return cur
`

// ApplicationService 入校申请：提交（含抢名额并发控制）、列表、取消、时间线
type ApplicationService struct {
	db    *gorm.DB
	cache *cache.RedisCache
	cfg   *config.Config
}

func NewApplicationService(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config) *ApplicationService {
	return &ApplicationService{db: db, cache: rc, cfg: cfg}
}

// SubmitRequest 兼容新旧前端字段（entryDate 风格 + visitDate 风格）
type SubmitRequest struct {
	VisitorName    string `json:"visitorName"`
	Phone          string `json:"phone"`
	VisitorPhone   string `json:"visitorPhone"`
	IDCard         string `json:"idCard"`
	EntryDate      string `json:"entryDate"`
	VisitDate      string `json:"visitDate"`
	SlotID         uint   `json:"slotId"`
	VisitTime      string `json:"visitTime"`      // 08:00-12:00
	EntryStartTime string `json:"entryStartTime"` // 2026-08-11 08:00:00（旧前端完整时间）
	EntryEndTime   string `json:"entryEndTime"`
	VisitUnit      string `json:"visitUnit"`
	Department     string `json:"department"`
	VehiclePlate   string `json:"vehiclePlate"`
	Reason         string `json:"reason"`
	CompanionCount int    `json:"companionCount"`
}

func (r *SubmitRequest) normalize() {
	if r.Phone == "" {
		r.Phone = r.VisitorPhone
	}
	if r.EntryDate == "" {
		r.EntryDate = r.VisitDate
	}
	if r.VisitUnit == "" {
		r.VisitUnit = r.Department
	}
	// 旧前端不传 slotId/visitTime，只传完整开始结束时间 → 推导 HH:mm-HH:mm 匹配时段
	if r.VisitTime == "" && len(r.EntryStartTime) >= 16 && len(r.EntryEndTime) >= 16 {
		r.VisitTime = r.EntryStartTime[11:16] + "-" + r.EntryEndTime[11:16]
	}
}

// Submit 提交申请：校验 → 抢占名额（Redis Lua 原子 / DB 悲观锁降级）→ 入库
func (s *ApplicationService) Submit(visitor *model.User, req *SubmitRequest) (*model.Application, error) {
	req.normalize()
	if req.VisitorName == "" || req.Phone == "" || req.Reason == "" || req.EntryDate == "" {
		return nil, errors.New("姓名、手机号、入校事由、预约日期为必填项")
	}
	// 黑名单校验
	if visitor.BlacklistFlag == 1 {
		if visitor.BlacklistExpire == nil || time.Now().Before(*visitor.BlacklistExpire) {
			return nil, ErrBlacklisted
		}
	}

	// 日期校验：今天 ≤ 日期 ≤ 今天+7
	today, err := time.ParseInLocation("2006-01-02", time.Now().Format("2006-01-02"), time.Local)
	if err != nil {
		return nil, ErrDateInvalid
	}
	entryDate, err := time.ParseInLocation("2006-01-02", req.EntryDate, time.Local)
	if err != nil || entryDate.Before(today) || entryDate.After(today.AddDate(0, 0, 7)) {
		return nil, ErrDateInvalid
	}

	// 时间段解析
	var slot model.TimeSlot
	if req.SlotID > 0 {
		if err := s.db.First(&slot, req.SlotID).Error; err != nil {
			return nil, ErrSlotDisabled
		}
	} else if req.VisitTime != "" {
		parts := strings.Split(req.VisitTime, "-")
		if len(parts) != 2 {
			return nil, ErrSlotDisabled
		}
		if err := s.db.Where("start_time = ? AND end_time = ?", strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])).
			First(&slot).Error; err != nil {
			return nil, ErrSlotDisabled
		}
	} else {
		return nil, errors.New("请选择预约时间段")
	}
	if slot.Status != 1 {
		return nil, ErrSlotDisabled
	}

	// 同一访客同日同时段去重（待审批/已通过）
	var dup int64
	s.db.Model(&model.Application{}).
		Where("visitor_id = ? AND entry_date = ? AND slot_id = ? AND status IN (0,1) AND deleted = 0",
			visitor.UserID, req.EntryDate, slot.SlotID).Count(&dup)
	if dup > 0 {
		return nil, ErrDuplicate
	}

	start, err := buildDateTime(req.EntryDate, slot.StartTime)
	if err != nil {
		return nil, errors.New("时间段格式错误")
	}
	end, err := buildDateTime(req.EntryDate, slot.EndTime)
	if err != nil {
		return nil, errors.New("时间段格式错误")
	}

	now := time.Now()
	app := &model.Application{
		ApplicationNo:  genApplicationNo(),
		VisitorID:      visitor.UserID,
		VisitorName:    req.VisitorName,
		Phone:          req.Phone,
		IDCard:         req.IDCard,
		EntryDate:      req.EntryDate,
		SlotID:         slot.SlotID,
		TimeSlot:       slot.StartTime + "-" + slot.EndTime,
		EntryStartTime: start,
		EntryEndTime:   end,
		Reason:         req.Reason,
		VisitUnit:      req.VisitUnit,
		VehiclePlate:   req.VehiclePlate,
		CompanionCount: req.CompanionCount,
		Status:         model.AppStatusPending,
		CreateTime:     now,
		UpdateTime:     now,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		// 核心：抢占名额（原子扣减，防超卖）
		ok, err := s.reserveSlot(tx, slot.SlotID, req.EntryDate, slot.MaxCount)
		if err != nil {
			return err
		}
		if !ok {
			return ErrSlotFull
		}
		if err := tx.Create(app).Error; err != nil {
			return err
		}
		return tx.Create(&model.ApplicationLog{
			ApplicationID: app.ApplicationID,
			Status:        model.AppStatusPending,
			StatusText:    model.AppStatusText[model.AppStatusPending],
			OperatorName:  req.VisitorName,
			Remark:        "提交入校申请",
			CreateTime:    now,
		}).Error
	})
	if err != nil {
		if !errors.Is(err, ErrSlotFull) {
			// 事务回滚会恢复 DB 计数，需手动释放 Redis 计数
			s.releaseRedisSlot(slot.SlotID, req.EntryDate)
		}
		return nil, err
	}
	return app, nil
}

// reserveSlot 抢占名额
// 主路径：Redis Lua 原子 INCR，超限返回 false（O(1) 且并发安全）
// 降级路径：Redis 不可用时用 DB 悲观锁（SELECT ... FOR UPDATE）保证不超卖
func (s *ApplicationService) reserveSlot(tx *gorm.DB, slotID uint, date string, maxCount int) (bool, error) {
	key := s.slotKey(slotID, date)
	if s.cache != nil {
		res, err := s.cache.Eval(reserveLua, []string{key}, maxCount, 15*24*3600)
		if err == nil {
			if n, ok := res.(int64); ok {
				// Lua 超限返回 -1（已 INCR，需回退）；正常返回 1..maxCount
				if n == -1 || n > int64(maxCount) {
					// 已 INCR，超限需回退
					s.cache.Decr(key)
					return false, nil
				}
				// 占用成功，同步 DB 计数器（便于后台展示）
				return true, s.incrDBSlotCount(tx, slotID)
			}
		}
		// Redis 异常 → 降级 DB 悲观锁
	}
	return s.reserveSlotByDBLock(tx, slotID)
}

// reserveSlotByDBLock 悲观锁兜底：锁住时间段行，校验并占用
func (s *ApplicationService) reserveSlotByDBLock(tx *gorm.DB, slotID uint) (bool, error) {
	var slot model.TimeSlot
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&slot, slotID).Error; err != nil {
		return false, err
	}
	if slot.CurrentCount >= slot.MaxCount {
		return false, nil
	}
	if err := tx.Model(&model.TimeSlot{}).Where("slot_id = ?", slotID).
		Update("current_count", slot.CurrentCount+1).Error; err != nil {
		return false, err
	}
	return true, nil
}

func (s *ApplicationService) incrDBSlotCount(tx *gorm.DB, slotID uint) error {
	return tx.Model(&model.TimeSlot{}).Where("slot_id = ?", slotID).
		Update("current_count", gorm.Expr("current_count + 1")).Error
}

func (s *ApplicationService) slotKey(slotID uint, date string) string {
	return fmt.Sprintf("ers:slot:count:%d:%s", slotID, date)
}

// releaseSlot 释放名额（取消/过期/爽约时调用）
func (s *ApplicationService) releaseSlot(slotID uint, date string) {
	s.releaseRedisSlot(slotID, date)
	// DB 计数不低于 0
	s.db.Model(&model.TimeSlot{}).Where("slot_id = ?", slotID).
		Update("current_count", gorm.Expr("GREATEST(current_count - 1, 0)"))
}

func (s *ApplicationService) releaseRedisSlot(slotID uint, date string) {
	if s.cache == nil {
		return
	}
	key := s.slotKey(slotID, date)
	s.cache.Eval("if tonumber(redis.call('GET', KEYS[1]) or '0') > 0 then return redis.call('DECR', KEYS[1]) else return 0 end", []string{key})
}

// MyList 访客申请列表（分页）
func (s *ApplicationService) MyList(visitorID uint, status *int, page, pageSize int) ([]map[string]any, int64, error) {
	q := s.db.Model(&model.Application{}).Where("visitor_id = ? AND deleted = 0", visitorID)
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var apps []model.Application
	if err := q.Order("create_time DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&apps).Error; err != nil {
		return nil, 0, err
	}
	list := make([]map[string]any, 0, len(apps))
	for i := range apps {
		list = append(list, appToMap(&apps[i]))
	}
	return list, total, nil
}

// Detail 访客查看自己的申请详情
func (s *ApplicationService) Detail(id, visitorID uint) (*model.Application, error) {
	var app model.Application
	if err := s.db.Where("application_id = ? AND visitor_id = ? AND deleted = 0", id, visitorID).First(&app).Error; err != nil {
		return nil, ErrNotFound
	}
	return &app, nil
}

// Cancel 取消申请：仅待审批可取消；成功后释放名额
func (s *ApplicationService) Cancel(id, visitorID uint) error {
	var app model.Application
	if err := s.db.Where("application_id = ? AND visitor_id = ? AND deleted = 0", id, visitorID).First(&app).Error; err != nil {
		return ErrNotFound
	}
	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var locked model.Application
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, id).Error; err != nil {
			return ErrNotFound
		}
		if locked.Status != model.AppStatusPending {
			return ErrStatusIllegal
		}
		if err := tx.Model(&model.Application{}).Where("application_id = ?", id).Updates(map[string]any{
			"status": model.AppStatusCanceled, "cancel_time": now, "cancel_reason": "用户主动取消",
		}).Error; err != nil {
			return err
		}
		return tx.Create(&model.ApplicationLog{
			ApplicationID: id, Status: model.AppStatusCanceled,
			StatusText:   model.AppStatusText[model.AppStatusCanceled],
			OperatorName: app.VisitorName, Remark: "用户主动取消", CreateTime: now,
		}).Error
	})
	if err != nil {
		return err
	}
	// 释放名额（事务外）
	s.releaseSlot(app.SlotID, app.EntryDate)
	return nil
}

// Timeline 申请流转时间线
func (s *ApplicationService) Timeline(id, visitorID uint) ([]map[string]any, error) {
	var app model.Application
	if err := s.db.Where("application_id = ? AND visitor_id = ? AND deleted = 0", id, visitorID).First(&app).Error; err != nil {
		return nil, ErrNotFound
	}
	var logs []model.ApplicationLog
	if err := s.db.Where("application_id = ?", id).Order("create_time ASC").Find(&logs).Error; err != nil {
		return nil, err
	}
	list := make([]map[string]any, 0, len(logs))
	for _, l := range logs {
		status := "default"
		switch l.Status {
		case model.AppStatusApproved:
			status = "success"
		case model.AppStatusRejected, model.AppStatusNoShow:
			status = "error"
		case model.AppStatusPending:
			status = "processing"
		}
		list = append(list, map[string]any{
			"time":        formatTimeVal(l.CreateTime),
			"title":       l.StatusText,
			"description": l.Remark,
			"status":      status,
		})
	}
	return list, nil
}

// 申请编号进程内序列（同一毫秒内自增，避免并发碰撞）
var appNoSeq uint32

// genApplicationNo 申请编号：APP + 毫秒时间戳 + 进程内原子序列
// 秒级时间戳 + 纯随机在并发下会撞唯一索引 uk_application_no，故序列必须原子自增
func genApplicationNo() string {
	seq := atomic.AddUint32(&appNoSeq, 1) % 1000
	return fmt.Sprintf("APP%s%03d", time.Now().Format("20060102150405.000"), seq)
}

// nextRecordNo 生成记录编号：EC + 日期 + Redis 原子序列（防并发重复），Redis 不可用降级时间戳+随机
func (s *ApplicationService) nextRecordNo() (string, error) {
	date := time.Now().Format("20060102")
	if s.cache != nil {
		key := "ers:record:seq:" + date
		if n, err := s.cache.Eval(incrExpireLua, []string{key}, 2*24*3600); err == nil {
			if seq, ok := n.(int64); ok {
				return fmt.Sprintf("EC%s%06d", date, seq), nil
			}
		}
	}
	return fmt.Sprintf("EC%s%03d", time.Now().Format("20060102150405"), rand.Intn(1000)), nil
}

// buildDateTime 由日期 + HH:MM 构建本地时区时间
func buildDateTime(date, hm string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", date+" "+strings.TrimSpace(hm), time.Local)
}
