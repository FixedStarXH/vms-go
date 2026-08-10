package model

import "time"

// ApplicationLog 申请流转日志（ers_application_log），供时间线接口使用
type ApplicationLog struct {
	LogID         uint      `gorm:"primaryKey;autoIncrement;column:log_id" json:"id"`
	ApplicationID uint      `gorm:"not null;index:idx_application_id" json:"applicationId"`
	Status        int8      `json:"status"`
	StatusText    string    `gorm:"size:50" json:"statusText"`
	OperatorName  string    `gorm:"size:50" json:"operatorName"`
	Remark        string    `gorm:"size:500" json:"remark"`
	CreateTime    time.Time `json:"createTime"`
}

func (ApplicationLog) TableName() string { return "ers_application_log" }
