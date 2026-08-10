package model

import "time"

// Application 入校申请（ers_entry_application）
type Application struct {
	ApplicationID  uint       `gorm:"primaryKey;autoIncrement;column:application_id" json:"id"`
	ApplicationNo  string     `gorm:"size:50;not null;uniqueIndex:uk_application_no" json:"applicationNo"`
	VisitorID      uint       `gorm:"not null;index:idx_visitor_id" json:"visitorId"`
	VisitorName    string     `gorm:"size:50;not null" json:"visitorName"`
	Phone          string     `gorm:"size:20;not null" json:"phone"`
	IDCard         string     `gorm:"size:255" json:"idCard"`
	EntryDate      string     `gorm:"size:10;not null;index:idx_entry_date" json:"entryDate"` // 2026-05-01
	SlotID         uint       `gorm:"not null;index:idx_slot_id" json:"slotId"`
	TimeSlot       string     `gorm:"size:50" json:"timeSlot"` // 08:00-12:00
	EntryStartTime time.Time  `json:"entryStartTime"`
	EntryEndTime   time.Time  `json:"entryEndTime"`
	Reason         string     `gorm:"size:500;not null" json:"reason"`
	VisitUnit      string     `gorm:"size:100" json:"visitUnit"`
	VehiclePlate   string     `gorm:"size:20" json:"vehiclePlate"`
	CompanionCount int        `gorm:"default:0" json:"companionCount"`
	AttachmentURL  string     `gorm:"size:500" json:"attachmentUrl"`
	Status         int8       `gorm:"default:0;index:idx_status" json:"status"` // 0待审批 1已通过 2已拒绝 3已取消 4已爽约 5已完成
	ApprovalUserID *uint      `json:"approvalUserId"`
	ApprovalTime   *time.Time `json:"approvalTime"`
	ApprovalRemark string     `gorm:"size:500" json:"approvalRemark"`
	CancelTime     *time.Time `json:"cancelTime"`
	CancelReason   string     `gorm:"size:255" json:"cancelReason"`
	RecordNo       string     `gorm:"size:50;index:idx_record_no" json:"entryCode"` // 通过后生成，唯一性由 Redis 原子序列保证
	QRCodeContent  string     `gorm:"type:text" json:"-"`
	Deleted        int8       `gorm:"default:0;index:idx_deleted" json:"deleted"` // 逻辑删除
	CreateTime     time.Time  `json:"createTime"`
	UpdateTime     time.Time  `json:"updateTime"`
}

func (Application) TableName() string { return "ers_entry_application" }
