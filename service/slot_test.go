package service

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"ers-go/model"
)

func newSlotTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	if err := db.AutoMigrate(&model.TimeSlot{}, &model.Application{}); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

func seedSlot(t *testing.T, db *gorm.DB, name, start, end string, max int) model.TimeSlot {
	t.Helper()
	now := time.Now()
	slot := model.TimeSlot{SlotName: name, StartTime: start, EndTime: end, MaxCount: max, Status: 1, CreateTime: now, UpdateTime: now}
	if err := db.Create(&slot).Error; err != nil {
		t.Fatalf("seed 失败: %v", err)
	}
	return slot
}

func TestSlotValidate(t *testing.T) {
	cases := []struct {
		name    string
		slot    model.TimeSlot
		wantErr bool
	}{
		{"正常时段", model.TimeSlot{SlotName: "上午", StartTime: "08:00", EndTime: "12:00", MaxCount: 50}, false},
		{"名称空", model.TimeSlot{StartTime: "08:00", EndTime: "12:00", MaxCount: 50}, true},
		{"时间格式错", model.TimeSlot{SlotName: "上午", StartTime: "8:00", EndTime: "12:00", MaxCount: 50}, true},
		{"结束早于开始", model.TimeSlot{SlotName: "上午", StartTime: "13:00", EndTime: "12:00", MaxCount: 50}, true},
		{"首尾相同", model.TimeSlot{SlotName: "上午", StartTime: "12:00", EndTime: "12:00", MaxCount: 50}, true},
		{"跨天允许", model.TimeSlot{SlotName: "夜班", StartTime: "22:00", EndTime: "02:00", MaxCount: 50}, true},
		{"名额为0", model.TimeSlot{SlotName: "上午", StartTime: "08:00", EndTime: "12:00", MaxCount: 0}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateSlot(c.slot.SlotName, c.slot.StartTime, c.slot.EndTime, c.slot.MaxCount)
			if (err != nil) != c.wantErr {
				t.Errorf("validateSlot err=%v, wantErr=%v", err, c.wantErr)
			}
		})
	}
}

func TestSlotSaveCreateAndUpdate(t *testing.T) {
	db := newSlotTestDB(t)
	svc := NewSlotService(db)

	// 新增
	created, err := svc.Save(model.TimeSlot{SlotName: "上午时段", StartTime: "08:00", EndTime: "12:00", MaxCount: 100, Sort: 1})
	if err != nil {
		t.Fatalf("新增失败: %v", err)
	}
	if created.SlotID == 0 || created.Status != 1 || created.CurrentCount != 0 {
		t.Errorf("新增字段异常: %+v", created)
	}

	// 更新：改名称与名额，保留已用名额
	if err := db.Model(&model.TimeSlot{}).Where("slot_id = ?", created.SlotID).Update("current_count", 30).Error; err != nil {
		t.Fatal(err)
	}
	updated, err := svc.Save(model.TimeSlot{SlotID: created.SlotID, SlotName: "上午时段-改", StartTime: "08:30", EndTime: "11:30", MaxCount: 200, Sort: 2, Status: 1})
	if err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	if updated.SlotName != "上午时段-改" || updated.StartTime != "08:30" || updated.MaxCount != 200 {
		t.Errorf("更新字段未生效: %+v", updated)
	}
	if updated.CurrentCount != 30 {
		t.Errorf("已用名额被改动: %d, want 30", updated.CurrentCount)
	}

	// 非法更新被拒
	if _, err := svc.Save(model.TimeSlot{SlotID: created.SlotID, SlotName: "x", StartTime: "99:99", EndTime: "12:00", MaxCount: 10}); err == nil {
		t.Error("非法时间应报错")
	}
}

func TestSlotToggleAndDelete(t *testing.T) {
	db := newSlotTestDB(t)
	svc := NewSlotService(db)
	slot := seedSlot(t, db, "上午", "08:00", "12:00", 100)

	// 停用
	if err := svc.Toggle(slot.SlotID, 0); err != nil {
		t.Fatalf("停用失败: %v", err)
	}
	var got model.TimeSlot
	if err := db.First(&got, slot.SlotID).Error; err != nil {
		t.Fatal(err)
	}
	if got.Status != 0 {
		t.Errorf("停用未生效: status=%d", got.Status)
	}

	// 无引用可删除
	if err := svc.Delete(slot.SlotID); err != nil {
		t.Fatalf("删除失败: %v", err)
	}

	// 有引用不可删
	slot2 := seedSlot(t, db, "下午", "14:00", "18:00", 100)
	now := time.Now()
	if err := db.Create(&model.Application{
		ApplicationNo: "T-REF-001", VisitorID: 1, VisitorName: "张三", Phone: "13800000000",
		EntryDate: "2026-08-10", SlotID: slot2.SlotID, Reason: "测试", Status: 1,
		CreateTime: now, UpdateTime: now,
	}).Error; err != nil {
		t.Fatal(err)
	}
	if err := svc.Delete(slot2.SlotID); err == nil {
		t.Error("有申请引用时应拒绝删除")
	}

	// 不存在
	if err := svc.Delete(99999); err == nil {
		t.Error("删除不存在的时段应报错")
	}
}
