package model

import "time"

// TimeSlot 入校时间段（ers_time_slot）
type TimeSlot struct {
	SlotID       uint      `gorm:"primaryKey;autoIncrement;column:slot_id" json:"slotId"`
	SlotName     string    `gorm:"size:50;not null" json:"slotName"`
	StartTime    string    `gorm:"size:5;not null" json:"startTime"` // 08:00
	EndTime      string    `gorm:"size:5;not null" json:"endTime"`   // 12:00
	MaxCount     int       `gorm:"not null;default:0" json:"maxCount"`
	CurrentCount int       `gorm:"not null;default:0" json:"currentCount"`
	Status       int8      `gorm:"not null;default:1" json:"status"` // 0禁用 1启用
	Sort         int       `gorm:"default:0" json:"sort"`
	Remark       string    `gorm:"size:255" json:"remark"`
	CreateTime   time.Time `json:"createTime"`
	UpdateTime   time.Time `json:"updateTime"`
}

func (TimeSlot) TableName() string { return "ers_time_slot" }
