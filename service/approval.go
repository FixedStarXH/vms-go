package service

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
)

// ApprovalService 审批：通过（生成防伪二维码 + 入校记录）、拒绝、批量操作（逐条失败隔离）
type ApprovalService struct {
	db    *gorm.DB
	cache *cache.RedisCache
	cfg   *config.Config
	apps  *ApplicationService
}

func NewApprovalService(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config, apps *ApplicationService) *ApprovalService {
	return &ApprovalService{db: db, cache: rc, cfg: cfg, apps: apps}
}

// AdminList 管理员申请列表（条件查询 + 分页）
func (s *ApprovalService) AdminList(keyword, status, startDate, endDate string, page, pageSize int) ([]map[string]any, int64, error) {
	q := s.db.Model(&model.Application{}).Where("deleted = 0")
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("(visitor_name LIKE ? OR phone LIKE ? OR application_no LIKE ?)", like, like, like)
	}
	if status != "" && status != "all" {
		q = q.Where("status = ?", status)
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

// Detail 管理员查看申请详情（含入校记录）
func (s *ApprovalService) Detail(id uint) (map[string]any, error) {
	var app model.Application
	if err := s.db.Where("application_id = ? AND deleted = 0", id).First(&app).Error; err != nil {
		return nil, ErrNotFound
	}
	m := appToMap(&app)
	m["statusText"] = model.AppStatusText[app.Status]
	var rec model.EntryRecord
	if app.RecordNo != "" {
		s.db.Where("application_id = ?", id).First(&rec)
		if rec.RecordID > 0 {
			m["record"] = recordToMap(&rec)
			// 完整二维码内容（含 HMAC 签名），供核销页复制/扫码演示
			if rec.QRCodeContent != "" {
				m["qrContent"] = rec.QRCodeContent
			}
		}
	}
	return m, nil
}

// Approve 审批通过：生成记录编号（Redis 原子序列）→ 生成防伪二维码 → 更新申请 → 创建入校记录
func (s *ApprovalService) Approve(id, adminID uint, remark string) error {
	now := time.Now()
	adminName := s.adminName(adminID)
	return s.db.Transaction(func(tx *gorm.DB) error {
		var app model.Application
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&app, id).Error; err != nil {
			return ErrNotFound
		}
		if app.Deleted == 1 {
			return ErrNotFound
		}
		if app.Status != model.AppStatusPending {
			return ErrStatusIllegal
		}
		// 记录编号：Redis 原子自增，并发审批不重复
		recordNo, err := s.apps.nextRecordNo()
		if err != nil {
			return err
		}
		// 二维码内容含 HMAC 签名，扫码验签防伪
		qrContent := buildQRContent(recordNo, app.VisitorID, app.EntryDate, s.cfg.App.QRSecret)
		if _, err := GenerateQRPNG(qrContent, s.cfg.App.QRDir, recordNo); err != nil {
			return fmt.Errorf("生成二维码失败: %w", err)
		}

		if err := tx.Model(&model.Application{}).Where("application_id = ?", id).Updates(map[string]any{
			"status": model.AppStatusApproved, "approval_user_id": adminID,
			"approval_time": now, "approval_remark": remark,
			"record_no": recordNo, "qr_code_content": qrContent,
		}).Error; err != nil {
			return err
		}
		// 生成入校记录（核销凭证）
		rec := &model.EntryRecord{
			RecordNo:       recordNo,
			ApplicationID:  app.ApplicationID,
			VisitorID:      app.VisitorID,
			VisitorName:    app.VisitorName,
			Phone:          app.Phone,
			EntryDate:      app.EntryDate,
			EntryStartTime: app.EntryStartTime,
			EntryEndTime:   app.EntryEndTime,
			QRCodeContent:  qrContent,
			RecordStatus:   model.RecStatusWaiting,
			CreateTime:     now,
			UpdateTime:     now,
		}
		if err := tx.Create(rec).Error; err != nil {
			return err
		}
		operator := adminName
		if operator == "" {
			operator = fmt.Sprintf("管理员#%d", adminID)
		}
		text := "审批通过，已生成入校凭证"
		if remark != "" {
			text += "（" + remark + "）"
		}
		return tx.Create(&model.ApplicationLog{
			ApplicationID: id, Status: model.AppStatusApproved,
			StatusText:   model.AppStatusText[model.AppStatusApproved],
			OperatorName: operator, Remark: text, CreateTime: now,
		}).Error
	})
}

// Reject 审批拒绝
func (s *ApprovalService) Reject(id, adminID uint, reason string) error {
	if reason == "" {
		return errors.New("拒绝原因不能为空")
	}
	now := time.Now()
	adminName := s.adminName(adminID)
	return s.db.Transaction(func(tx *gorm.DB) error {
		var app model.Application
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&app, id).Error; err != nil {
			return ErrNotFound
		}
		if app.Status != model.AppStatusPending {
			return ErrStatusIllegal
		}
		if err := tx.Model(&model.Application{}).Where("application_id = ?", id).Updates(map[string]any{
			"status": model.AppStatusRejected, "approval_user_id": adminID,
			"approval_time": now, "approval_remark": reason,
		}).Error; err != nil {
			return err
		}
		operator := adminName
		if operator == "" {
			operator = fmt.Sprintf("管理员#%d", adminID)
		}
		return tx.Create(&model.ApplicationLog{
			ApplicationID: id, Status: model.AppStatusRejected,
			StatusText:   model.AppStatusText[model.AppStatusRejected],
			OperatorName: operator, Remark: "拒绝原因：" + reason, CreateTime: now,
		}).Error
	})
}

// BatchResult 批量操作结果（失败隔离）
type BatchResult struct {
	Success int      `json:"success"`
	Failed  []string `json:"failed"`
}

// BatchApprove 批量审批通过：逐条独立事务，单条失败不中断整体
func (s *ApprovalService) BatchApprove(ids []uint, adminID uint, remark string) (*BatchResult, error) {
	if len(ids) == 0 {
		return nil, errors.New("请选择要审批的申请")
	}
	result := &BatchResult{Failed: []string{}}
	for _, id := range ids {
		if err := s.Approve(id, adminID, remark); err != nil {
			result.Failed = append(result.Failed, fmt.Sprintf("申请#%d: %s", id, err.Error()))
		} else {
			result.Success++
		}
	}
	return result, nil
}

// BatchReject 批量拒绝：逐条独立事务，单条失败不中断整体
func (s *ApprovalService) BatchReject(ids []uint, adminID uint, reason string) (*BatchResult, error) {
	if len(ids) == 0 {
		return nil, errors.New("请选择要拒绝的申请")
	}
	result := &BatchResult{Failed: []string{}}
	for _, id := range ids {
		if err := s.Reject(id, adminID, reason); err != nil {
			result.Failed = append(result.Failed, fmt.Sprintf("申请#%d: %s", id, err.Error()))
		} else {
			result.Success++
		}
	}
	return result, nil
}

// adminName 根据管理员 ID 查询姓名（用于流转日志）
func (s *ApprovalService) adminName(id uint) string {
	var a model.Admin
	if s.db.Select("real_name").First(&a, id).Error == nil {
		return a.RealName
	}
	return fmt.Sprintf("管理员#%d", id)
}

// Delete 逻辑删除申请（仅可删除已拒绝/已取消/已爽约/已完成的）
func (s *ApprovalService) Delete(id uint) error {
	var app model.Application
	if err := s.db.Where("application_id = ? AND deleted = 0", id).First(&app).Error; err != nil {
		return ErrNotFound
	}
	if app.Status == model.AppStatusPending || app.Status == model.AppStatusApproved {
		return ErrStatusIllegal
	}
	return s.db.Model(&model.Application{}).Where("application_id = ?", id).
		Update("deleted", 1).Error
}
