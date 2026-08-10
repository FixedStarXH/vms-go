package model

import "time"

// Admin 管理员（ers_admin）
type Admin struct {
	AdminID    uint      `gorm:"primaryKey;autoIncrement;column:admin_id" json:"adminId"`
	Username   string    `gorm:"size:50;not null;uniqueIndex:uk_username" json:"username"`
	Password   string    `gorm:"size:100;not null" json:"-"`
	RealName   string    `gorm:"size:50" json:"realName"`
	Phone      string    `gorm:"size:20" json:"phone"`
	Email      string    `gorm:"size:100" json:"email"`
	Status     int8      `gorm:"default:1" json:"status"` // 0禁用 1正常
	CreateTime time.Time `json:"createTime"`
}

func (Admin) TableName() string { return "ers_admin" }
