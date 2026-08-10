package model

import "time"

// NoShowLog 爽约记录（ers_no_show_log）
type NoShowLog struct {
	ID            uint      `gorm:"primaryKey;autoIncrement;column:id" json:"id"`
	VisitorID     uint      `gorm:"not null;index:idx_visitor_id" json:"visitorId"`
	ApplicationID uint      `json:"applicationId"`
	NoShowDate    string    `gorm:"size:10" json:"noShowDate"`
	IsCleared     int8      `gorm:"default:0" json:"isCleared"` // 0未清零 1已清零（移出黑名单时清零）
	CreateTime    time.Time `json:"createTime"`
}

func (NoShowLog) TableName() string { return "ers_no_show_log" }
