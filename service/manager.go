package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"ers-go/config"
	"ers-go/model"
	"ers-go/utils"
)

var (
	ErrManagerExists = errors.New("该管理员用户名已存在")
)

// ManagerService 管理端：访客账号列表/删除、管理员账号 CRUD、管理员改密码
type ManagerService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewManagerService(db *gorm.DB, cfg *config.Config) *ManagerService {
	return &ManagerService{db: db, cfg: cfg}
}

// AdminUserList 访客账号列表（对齐旧前端字段：userId/username/mobile/status/createTime）
func (s *ManagerService) AdminUserList(keyword, status string, page, pageSize int) ([]map[string]any, int64, error) {
	q := s.db.Model(&model.User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("(username LIKE ? OR mobile LIKE ? OR real_name LIKE ?)", like, like, like)
	}
	// 前端 status：1=正常 0=黑名单
	if status == "0" {
		q = q.Where("blacklist_flag = 1")
	} else if status == "1" {
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
		st := 1 // 正常
		if u.BlacklistFlag == 1 && (u.BlacklistExpire == nil || time.Now().Before(*u.BlacklistExpire)) {
			st = 0 // 黑名单
		}
		list = append(list, map[string]any{
			"userId":     u.UserID,
			"username":   u.Username,
			"mobile":     u.Mobile,
			"status":     st,
			"createTime": u.CreateTime.Format("2006-01-02 15:04:05"),
		})
	}
	return list, total, nil
}

// DisableUsers 删除访客账号（软删：禁用账号并移入黑名单，保留历史申请）
func (s *ManagerService) DisableUsers(userIDs []uint) error {
	if len(userIDs) == 0 {
		return errors.New("请选择要删除的账号")
	}
	expire := time.Now().AddDate(0, 0, s.cfg.App.NoShowBlacklistDays)
	return s.db.Model(&model.User{}).Where("user_id IN ?", userIDs).Updates(map[string]any{
		"status": 0, "blacklist_flag": 1, "blacklist_expire": expire,
		"blacklist_reason": "管理员删除账号",
	}).Error
}

// ManagerList 管理员列表
func (s *ManagerService) ManagerList() ([]map[string]any, error) {
	var admins []model.Admin
	if err := s.db.Order("admin_id ASC").Find(&admins).Error; err != nil {
		return nil, err
	}
	list := make([]map[string]any, 0, len(admins))
	for i := range admins {
		a := &admins[i]
		list = append(list, map[string]any{
			"adminId":    a.AdminID,
			"username":   a.Username,
			"realName":   a.RealName,
			"phone":      a.Phone,
			"createTime": a.CreateTime.Format("2006-01-02 15:04:05"),
		})
	}
	return list, nil
}

// AddManager 新增管理员
func (s *ManagerService) AddManager(username, phone, password string) error {
	if username == "" || password == "" {
		return errors.New("用户名和密码不能为空")
	}
	var count int64
	if err := s.db.Model(&model.Admin{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrManagerExists
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	return s.db.Create(&model.Admin{
		Username: username, Password: hash, Phone: phone,
		Status: 1, CreateTime: time.Now(),
	}).Error
}

// DeleteManager 删除管理员（不允许删除超级管理员 id=1）
func (s *ManagerService) DeleteManager(id uint) error {
	if id == 1 {
		return errors.New("不允许删除超级管理员")
	}
	var a model.Admin
	if err := s.db.First(&a, id).Error; err != nil {
		return errors.New("管理员不存在")
	}
	return s.db.Delete(&a).Error
}

// ChangeAdminPassword 管理员修改自己的密码
func (s *ManagerService) ChangeAdminPassword(id uint, newPwd string) error {
	if newPwd == "" || len(newPwd) < 6 {
		return errors.New("新密码至少 6 位")
	}
	hash, err := utils.HashPassword(newPwd)
	if err != nil {
		return err
	}
	return s.db.Model(&model.Admin{}).Where("admin_id = ?", id).Update("password", hash).Error
}
