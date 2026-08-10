package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
)

var ErrVisitorNotFound = errors.New("访客不存在")

// VisitorService 访客管理：列表、黑名单、爽约规则（供定时任务复用）
type VisitorService struct {
	db    *gorm.DB
	cache *cache.RedisCache
	cfg   *config.Config
}

func NewVisitorService(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config) *VisitorService {
	return &VisitorService{db: db, cache: rc, cfg: cfg}
}

// AdminList 访客列表（支持关键字/黑名单过滤 + 分页）
func (s *VisitorService) AdminList(keyword, status string, page, pageSize int) ([]map[string]any, int64, error) {
	q := s.db.Model(&model.User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("(username LIKE ? OR mobile LIKE ? OR real_name LIKE ?)", like, like, like)
	}
	if status == "blacklist" {
		q = q.Where("blacklist_flag = 1")
	} else if status == "normal" {
		q = q.Where("blacklist_flag = 0")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var users []model.User
	if err := q.Order("create_time DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	list := make([]map[string]any, 0, len(users))
	for i := range users {
		u := &users[i]
		status := "normal"
		inBlacklist := u.BlacklistFlag == 1 && (u.BlacklistExpire == nil || time.Now().Before(*u.BlacklistExpire))
		if inBlacklist {
			status = "blacklist"
		}
		list = append(list, map[string]any{
			"id": u.UserID, "name": u.RealName, "username": u.Username, "phone": u.Mobile,
			"idCard": "", "status": status, "noShowCount": u.NoShowCount,
			"blacklistReason": u.BlacklistReason,
			"blacklistExpire": formatTimePtr(u.BlacklistExpire),
			"createTime":      formatTimeVal(u.CreateTime),
		})
	}
	return list, total, nil
}

// AddBlacklist 拉黑访客（可指定天数）
func (s *VisitorService) AddBlacklist(userID uint, reason string, days int) error {
	if days <= 0 {
		days = s.cfg.App.NoShowBlacklistDays
	}
	expire := time.Now().AddDate(0, 0, days)
	return s.db.Model(&model.User{}).Where("user_id = ?", userID).Updates(map[string]any{
		"blacklist_flag": 1, "blacklist_expire": expire,
		"blacklist_reason": reason,
	}).Error
}

// RemoveBlacklist 移出黑名单：清除标记 + 爽约记录清零（给予改过机会）
func (s *VisitorService) RemoveBlacklist(userID uint) error {
	err := s.db.Model(&model.User{}).Where("user_id = ?", userID).Updates(map[string]any{
		"blacklist_flag": 0, "blacklist_expire": nil,
		"blacklist_reason": "", "no_show_count": 0,
	}).Error
	if err != nil {
		return err
	}
	return s.db.Model(&model.NoShowLog{}).Where("visitor_id = ?", userID).
		Update("is_cleared", 1).Error
}

// ToggleBlacklist 拉黑/移出
func (s *VisitorService) ToggleBlacklist(userID uint, action, reason string, days int) error {
	var u model.User
	if err := s.db.First(&u, userID).Error; err != nil {
		return ErrVisitorNotFound
	}
	if action == "remove" {
		return s.RemoveBlacklist(userID)
	}
	return s.AddBlacklist(userID, reason, days)
}

// MarkNoShow 将一条已过期未核销的申请标记为爽约，并按规则自动拉黑
// 由定时任务调用；返回是否触发拉黑
func (s *VisitorService) MarkNoShow(rec *model.EntryRecord, now time.Time) (bool, error) {
	// 1) 更新记录状态为爽约
	if err := s.db.Model(&model.EntryRecord{}).Where("record_id = ?", rec.RecordID).Updates(map[string]any{
		"record_status": model.RecStatusNoShow, "update_time": now,
	}).Error; err != nil {
		return false, err
	}
	// 2) 申请标记为爽约（若仍是已通过）
	s.db.Model(&model.Application{}).Where("application_id = ? AND status = ?",
		rec.ApplicationID, model.AppStatusApproved).
		Update("status", model.AppStatusNoShow)
	// 3) 记录爽约日志
	s.db.Create(&model.NoShowLog{VisitorID: rec.VisitorID, ApplicationID: rec.ApplicationID,
		NoShowDate: rec.EntryDate, CreateTime: now})
	// 4) 访客爽约次数 +1
	var user model.User
	if err := s.db.First(&user, rec.VisitorID).Error; err == nil {
		newCount := user.NoShowCount + 1
		s.db.Model(&user).Update("no_show_count", newCount)
		// 5) 达到阈值自动拉黑（规则：累计 N 次 → 黑名单 D 天）
		if newCount >= s.cfg.App.NoShowMaxCount {
			expire := now.AddDate(0, 0, s.cfg.App.NoShowBlacklistDays)
			s.db.Model(&user).Updates(map[string]any{
				"blacklist_flag": 1, "blacklist_expire": expire,
				"blacklist_reason": "爽约次数超过上限自动拉黑",
			})
			return true, nil
		}
	}
	return false, nil
}
