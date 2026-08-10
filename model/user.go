package model

import "time"

// User 访客用户（ers_user）
type User struct {
	UserID            uint       `gorm:"primaryKey;autoIncrement;column:user_id" json:"id"`
	Username          string     `gorm:"size:50;not null;uniqueIndex:uk_username" json:"username"`
	Password          string     `gorm:"size:100;not null" json:"-"`
	RealName          string     `gorm:"size:50" json:"realName"`
	Mobile            string     `gorm:"size:20;not null;uniqueIndex:uk_mobile" json:"phone"`
	Email             string     `gorm:"size:100" json:"email"`
	Status            int8       `gorm:"default:1" json:"status"` // 0禁用 1启用
	BlacklistFlag     int8       `gorm:"default:0;index" json:"blacklistFlag"` // 0否 1是
	BlacklistExpire   *time.Time `json:"blacklistExpireTime"`
	BlacklistReason   string     `gorm:"size:500" json:"blacklistReason"`
	NoShowCount       int        `gorm:"default:0" json:"noShowCount"`
	LastLoginTime     *time.Time `json:"lastLoginTime"`
	LastLoginIP       string     `gorm:"size:50" json:"lastLoginIp"`
	RegisterTime      time.Time  `json:"registerTime"`
	CreateTime        time.Time  `json:"createTime"`
}

func (User) TableName() string { return "ers_user" }
