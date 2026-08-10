package model

import "time"

// EntryRecord 入校记录（ers_entry_record），审批通过时生成，扫码核销
type EntryRecord struct {
	RecordID        uint       `gorm:"primaryKey;autoIncrement;column:record_id" json:"id"`
	RecordNo        string     `gorm:"size:50;not null;uniqueIndex:uk_record_no" json:"recordNo"`
	ApplicationID   uint       `gorm:"not null;uniqueIndex:uk_application_id" json:"applicationId"`
	VisitorID       uint       `gorm:"not null;index:idx_visitor_id" json:"visitorId"`
	VisitorName     string     `gorm:"size:50;not null" json:"visitorName"`
	Phone           string     `gorm:"size:20;not null" json:"phone"`
	EntryDate       string     `gorm:"size:10;not null;index:idx_entry_date" json:"entryDate"`
	EntryStartTime  time.Time  `json:"entryStartTime"`
	EntryEndTime    time.Time  `json:"entryEndTime"`
	ActualEntryTime *time.Time `json:"actualEntryTime"` // 实际入校时间
	ActualLeaveTime *time.Time `json:"actualLeaveTime"` // 实际离校时间
	VerifyStatus    int8       `gorm:"default:0;index:idx_verify_status" json:"verifyStatus"` // 0未核销 1已核销
	VerifyGate      string     `gorm:"size:100" json:"verifyGate"`                            // 核验校门
	VerifyUserID    *uint      `json:"verifyUserId"`
	QRCodeContent   string     `gorm:"type:text" json:"-"`
	RecordStatus    int8       `gorm:"default:0;index:idx_record_status" json:"recordStatus"` // 0待入校 1已入校 2已过期 3已爽约 4已完成
	Remark          string     `gorm:"size:255" json:"remark"`
	CreateTime      time.Time  `json:"createTime"`
	UpdateTime      time.Time  `json:"updateTime"`
}

func (EntryRecord) TableName() string { return "ers_entry_record" }
