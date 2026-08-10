package model

import (
	"time"

	"gorm.io/gorm"

	"ers-go/utils"
)

// AutoMigrate 自动建表 + 种子数据
func AutoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		&User{}, &Admin{}, &Application{}, &EntryRecord{},
		&TimeSlot{}, &ApplicationLog{}, &NoShowLog{},
	)
	if err != nil {
		return err
	}
	return seed(db)
}

func seed(db *gorm.DB) error {
	// 默认管理员 admin / admin123（仅首次初始化）
	var adminCount int64
	if err := db.Model(&Admin{}).Count(&adminCount).Error; err != nil {
		return err
	}
	if adminCount == 0 {
		hash, err := utils.HashPassword("admin123")
		if err != nil {
			return err
		}
		admin := Admin{Username: "admin", Password: hash, RealName: "超级管理员", Phone: "13800000000", Status: 1, CreateTime: time.Now()}
		if err := db.Create(&admin).Error; err != nil {
			return err
		}
	}

	// 默认时间段
	var slotCount int64
	if err := db.Model(&TimeSlot{}).Count(&slotCount).Error; err != nil {
		return err
	}
	if slotCount == 0 {
		now := time.Now()
		slots := []TimeSlot{
			{SlotName: "上午时段", StartTime: "08:00", EndTime: "12:00", MaxCount: 100, CurrentCount: 0, Status: 1, Sort: 1, Remark: "默认上午入校时段", CreateTime: now, UpdateTime: now},
			{SlotName: "下午时段", StartTime: "14:00", EndTime: "18:00", MaxCount: 100, CurrentCount: 0, Status: 1, Sort: 2, Remark: "默认下午入校时段", CreateTime: now, UpdateTime: now},
		}
		return db.Create(&slots).Error
	}
	return nil
}
