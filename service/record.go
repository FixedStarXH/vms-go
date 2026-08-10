package service

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
)

var ErrRecordNotFound = errors.New("入校凭证不存在")

// RecordService 入校记录：扫码核销（幂等）、列表、今日概览
type RecordService struct {
	db    *gorm.DB
	cache *cache.RedisCache
	cfg   *config.Config
}

func NewRecordService(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config) *RecordService {
	return &RecordService{db: db, cache: rc, cfg: cfg}
}

// VerifyResult 核销结果
type VerifyResult struct {
	RecordNo    string `json:"recordNo"`
	VisitorName string `json:"visitorName"`
	Phone       string `json:"phone"`
	Message     string `json:"message"`
	Status      int8   `json:"recordStatus"`
}

// Verify 扫码核销（幂等）：
// 1) 校验二维码 HMAC 签名（防伪造）
// 2) Redis SETNX 锁防止并发重复核销
// 3) 状态机：待入校→入校（记录实际入校时间）；已入校→离校（记录离校时间，完成）
func (s *RecordService) Verify(qrContent, gate string, operatorID uint) (*VerifyResult, error) {
	recordNo, err := VerifyQRContent(qrContent, s.cfg.App.QRSecret)
	if err != nil {
		return nil, err
	}
	// 幂等锁：同一凭证同一时刻只允许一次核销
	lockKey := "ers:verify:" + recordNo
	if s.cache != nil {
		if ok, err := s.cache.SetNX(lockKey, "1", 10*time.Second); err == nil && !ok {
			return nil, ErrVerifyLocked
		}
		defer s.cache.Del(lockKey)
	}

	var rec model.EntryRecord
	if err := s.db.Where("record_no = ?", recordNo).First(&rec).Error; err != nil {
		return nil, ErrRecordNotFound
	}
	now := time.Now()

	switch rec.RecordStatus {
	case model.RecStatusWaiting:
		// 首次核销：入校
		rec.RecordStatus = model.RecStatusEntered
		rec.ActualEntryTime = &now
		rec.VerifyStatus = 1
		rec.VerifyGate = gate
		rec.VerifyUserID = &operatorID
		rec.UpdateTime = now
		if err := s.db.Save(&rec).Error; err != nil {
			return nil, err
		}
		// 申请标记为已完成
		s.db.Model(&model.Application{}).Where("application_id = ?", rec.ApplicationID).
			Update("status", model.AppStatusDone)
		return &VerifyResult{RecordNo: rec.RecordNo, VisitorName: rec.VisitorName, Phone: rec.Phone,
			Message: "核销成功，欢迎入校", Status: rec.RecordStatus}, nil
	case model.RecStatusEntered:
		// 第二次核销：离校
		if rec.ActualLeaveTime == nil {
			rec.ActualLeaveTime = &now
			rec.RecordStatus = model.RecStatusDone
			rec.UpdateTime = now
			if err := s.db.Save(&rec).Error; err != nil {
				return nil, err
			}
			return &VerifyResult{RecordNo: rec.RecordNo, VisitorName: rec.VisitorName, Phone: rec.Phone,
				Message: "核销成功，已离校", Status: rec.RecordStatus}, nil
		}
		return nil, errors.New("该凭证已完成核销，请勿重复操作")
	default:
		return nil, fmt.Errorf("当前状态（%s）不可核销", model.RecStatusText[rec.RecordStatus])
	}
}

// AdminList 入校记录列表（条件查询 + 分页）
func (s *RecordService) AdminList(keyword, status, startDate, endDate string, page, pageSize int) ([]map[string]any, int64, error) {
	q := s.db.Model(&model.EntryRecord{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("(record_no LIKE ? OR visitor_name LIKE ? OR phone LIKE ?)", like, like, like)
	}
	if status != "" && status != "all" {
		q = q.Where("record_status = ?", status)
	}
	if startDate != "" {
		q = q.Where("entry_date >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("entry_date <= ?", endDate)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var records []model.EntryRecord
	if err := q.Order("create_time DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&records).Error; err != nil {
		return nil, 0, err
	}
	list := make([]map[string]any, 0, len(records))
	for i := range records {
		list = append(list, recordToMap(&records[i]))
	}
	return list, total, nil
}

// TodayOverview 今日概览：预约/已入校/未入校/当前时段/校门统计
func (s *RecordService) TodayOverview() map[string]any {
	today := time.Now().Format("2006-01-02")
	nowTime := time.Now().Format("15:04")

	var records []model.EntryRecord
	s.db.Where("entry_date = ?", today).Find(&records)

	totalAppointment, entered, notEntered := 0, 0, 0
	gateStats := map[string]map[string]int{}
	for i := range records {
		r := &records[i]
		if r.RecordStatus == model.RecStatusEntered || r.RecordStatus == model.RecStatusDone {
			totalAppointment++
		}
		if r.ActualEntryTime != nil {
			entered++
		} else {
			notEntered++
		}
		if r.VerifyGate != "" {
			if gateStats[r.VerifyGate] == nil {
				gateStats[r.VerifyGate] = map[string]int{"entered": 0, "leaved": 0}
			}
			gateStats[r.VerifyGate]["entered"]++
			if r.ActualLeaveTime != nil {
				gateStats[r.VerifyGate]["leaved"]++
			}
		}
	}

	var apps []model.Application
	s.db.Where("entry_date = ? AND status IN (1,5) AND deleted = 0", today).Find(&apps)
	todayApps := make([]map[string]any, 0, len(apps))
	for i := range apps {
		todayApps = append(todayApps, appToMap(&apps[i]))
	}

	gateList := make([]map[string]any, 0, len(gateStats))
	for gate, m := range gateStats {
		gateList = append(gateList, map[string]any{"gate": gate, "entered": m["entered"], "leaved": m["leaved"]})
	}

	return map[string]any{
		"totalAppointment": totalAppointment,
		"entered":          entered,
		"notEntered":       notEntered,
		"currentTime":      nowTime,
		"gateStats":        gateList,
		"todayApplications": todayApps,
	}
}
