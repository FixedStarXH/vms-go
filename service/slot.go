package service

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"time"

	"gorm.io/gorm"

	"ers-go/model"
)

// SlotService 入校时段配置（管理端"系统设置"）
type SlotService struct {
	db *gorm.DB
}

func NewSlotService(db *gorm.DB) *SlotService { return &SlotService{db: db} }

var timeRe = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)

// validateTime 校验 HH:MM 格式（00:00-23:59）
func validateTime(v string) error {
	if !timeRe.MatchString(v) {
		return errors.New("时间格式须为 HH:MM（如 08:30）")
	}
	return nil
}

// validate 时段字段校验（名称/时间格式/起止先后/名额）
func validateSlot(name, start, end string, maxCount int) error {
	if name == "" {
		return errors.New("时段名称不能为空")
	}
	if err := validateTime(start); err != nil {
		return err
	}
	if err := validateTime(end); err != nil {
		return err
	}
	sh, _ := strconv.Atoi(start[:2])
	sm, _ := strconv.Atoi(start[3:])
	eh, _ := strconv.Atoi(end[:2])
	em, _ := strconv.Atoi(end[3:])
	if eh*60+em <= sh*60+sm {
		return errors.New("结束时间必须晚于开始时间")
	}
	if maxCount < 1 {
		return errors.New("名额上限至少为 1")
	}
	return nil
}

// List 全部时段（按 sort 排序）
func (s *SlotService) List() ([]model.TimeSlot, error) {
	var slots []model.TimeSlot
	if err := s.db.Order("sort ASC, slot_id ASC").Find(&slots).Error; err != nil {
		return nil, err
	}
	return slots, nil
}

// Save 新增（SlotID==0）或更新时段；更新时不允许改动已用名额
func (s *SlotService) Save(slot model.TimeSlot) (model.TimeSlot, error) {
	if err := validateSlot(slot.SlotName, slot.StartTime, slot.EndTime, slot.MaxCount); err != nil {
		return slot, err
	}
	slot.StartTime = slot.StartTime[:5]
	slot.EndTime = slot.EndTime[:5]
	if slot.Sort < 0 {
		slot.Sort = 0
	}

	if slot.SlotID == 0 {
		slot.CurrentCount = 0
		slot.Status = 1 // 新增默认启用
		slot.CreateTime = time.Now()
		slot.UpdateTime = time.Now()
		if err := s.db.Create(&slot).Error; err != nil {
			return slot, err
		}
		return slot, nil
	}

	// 更新：只改配置字段，保留已用名额
	var old model.TimeSlot
	if err := s.db.First(&old, slot.SlotID).Error; err != nil {
		return slot, errors.New("时段不存在")
	}
	if slot.CurrentCount == 0 {
		slot.CurrentCount = old.CurrentCount
	}
	slot.UpdateTime = time.Now()
	if err := s.db.Model(&model.TimeSlot{}).Where("slot_id = ?", slot.SlotID).
		Select("slot_name", "start_time", "end_time", "max_count", "status", "sort", "remark", "update_time").
		Updates(map[string]any{
			"slot_name": slot.SlotName, "start_time": slot.StartTime, "end_time": slot.EndTime,
			"max_count": slot.MaxCount, "status": slot.Status, "sort": slot.Sort,
			"remark": slot.Remark, "update_time": slot.UpdateTime,
		}).Error; err != nil {
		return slot, err
	}
	slot.CurrentCount = old.CurrentCount
	return slot, nil
}

// Toggle 启停时段（0 禁用 1 启用）
func (s *SlotService) Toggle(id uint, status int8) error {
	if status != 0 && status != 1 {
		return errors.New("状态参数错误")
	}
	res := s.db.Model(&model.TimeSlot{}).Where("slot_id = ?", id).
		Updates(map[string]any{"status": status, "update_time": time.Now()})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("时段不存在")
	}
	return nil
}

// Delete 删除时段：已被申请引用（有历史预约）时不允许删除，仅提示改名/停用
func (s *SlotService) Delete(id uint) error {
	var count int64
	if err := s.db.Model(&model.Application{}).Where("slot_id = ?", id).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("该时段已有 %d 条申请记录，不允许删除（可改名称或停用）", count)
	}
	res := s.db.Delete(&model.TimeSlot{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("时段不存在")
	}
	return nil
}
