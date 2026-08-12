package service

import (
	"testing"
	"time"

	"ers-go/model"
)

// TestFormatTimeVal 时间格式化：统一 2006-01-02 15:04:05（与前端契约一致）
func TestFormatTimeVal(t *testing.T) {
	ts := time.Date(2026, 8, 10, 17, 30, 45, 0, time.Local)
	if got := formatTimeVal(ts); got != "2026-08-10 17:30:45" {
		t.Errorf("格式化结果不对: %q", got)
	}
}

// TestFormatTimePtr 指针时间：nil 返回空串（前端安全），非 nil 正常格式化
func TestFormatTimePtr(t *testing.T) {
	if got := formatTimePtr(nil); got != "" {
		t.Errorf("nil 指针应返回空串，实际 %q", got)
	}
	ts := time.Date(2026, 8, 10, 9, 5, 1, 0, time.Local)
	if got := formatTimePtr(&ts); got != "2026-08-10 09:05:01" {
		t.Errorf("格式化结果不对: %q", got)
	}
}

// TestFormatTimeValZero 零值时间也应格式化为 0001-01-01 而非 panic（防御）
func TestFormatTimeValZero(t *testing.T) {
	var ts time.Time
	if got := formatTimeVal(ts); got == "" {
		t.Error("零值时间格式化不应返回空串（避免与 nil 混淆）")
	}
}

// TestAppToMapMapping 申请实体 → 前端契约字段映射正确（前端展示依赖这些 key）
func TestAppToMapMapping(t *testing.T) {
	uid := uint(9)
	at := time.Date(2026, 8, 10, 10, 0, 0, 0, time.Local)
	app := &model.Application{
		ApplicationID: 7, ApplicationNo: "APP202608101000000000001", VisitorID: 3, VisitorName: "张三",
		Phone: "13800001111", EntryDate: "2026-08-11", SlotID: 2, TimeSlot: "上午时段",
		EntryStartTime: at, EntryEndTime: at, Reason: "开会", Status: model.AppStatusApproved,
		RecordNo: "EC20260810000001", ApprovalUserID: &uid, ApprovalTime: &at, ApprovalRemark: "同意",
		CreateTime: at, UpdateTime: at,
	}
	m := appToMap(app)
	if m["id"] != uint(7) || m["visitorName"] != "张三" || m["phone"] != "13800001111" {
		t.Errorf("基础字段映射不对: id=%v name=%v phone=%v", m["id"], m["visitorName"], m["phone"])
	}
	if m["entryDate"] != "2026-08-11" || m["slotId"] != uint(2) || m["timeSlot"] != "上午时段" {
		t.Errorf("时段字段映射不对: date=%v slot=%v name=%v", m["entryDate"], m["slotId"], m["timeSlot"])
	}
	if m["status"] != model.AppStatusApproved || m["entryCode"] != "EC20260810000001" {
		t.Errorf("状态/凭证号映射不对: status=%v code=%v", m["status"], m["entryCode"])
	}
	if m["approvalTime"] != "2026-08-10 10:00:00" || m["approvalRemark"] != "同意" {
		t.Errorf("审批信息映射不对: time=%v remark=%v", m["approvalTime"], m["approvalRemark"])
	}
}

// TestRecordToMapMapping 入校记录实体 → 前端契约字段映射（核销页/门禁展示依赖）
func TestRecordToMapMapping(t *testing.T) {
	at := time.Date(2026, 8, 11, 9, 30, 0, 0, time.Local)
	r := &model.EntryRecord{
		RecordID: 5, RecordNo: "EC20260811000001", ApplicationID: 7, VisitorID: 3,
		VisitorName: "张三", Phone: "13800001111", EntryDate: "2026-08-11",
		EntryStartTime: at, EntryEndTime: at, RecordStatus: model.RecStatusEntered,
		VerifyGate: "东门", CreateTime: at, UpdateTime: at,
	}
	m := recordToMap(r)
	if m["recordNo"] != "EC20260811000001" || m["visitorName"] != "张三" || m["phone"] != "13800001111" {
		t.Errorf("基础字段映射不对: no=%v name=%v phone=%v", m["recordNo"], m["visitorName"], m["phone"])
	}
	if m["recordStatus"] != model.RecStatusEntered || m["recordStatusText"] != "已入校" {
		t.Errorf("状态映射不对: status=%v text=%v", m["recordStatus"], m["recordStatusText"])
	}
	if m["verifyGate"] != "东门" || m["entryStartTime"] != "2026-08-11 09:30:00" {
		t.Errorf("核销信息映射不对: gate=%v start=%v", m["verifyGate"], m["entryStartTime"])
	}
}

// TestAppToMapNilPointers nil 时间指针映射为空串而非 panic（待审批申请没有审批人/审批时间）
func TestAppToMapNilPointers(t *testing.T) {
	now := time.Now()
	app := &model.Application{
		ApplicationID: 1, ApplicationNo: "APP1", VisitorID: 1, VisitorName: "张三",
		Phone: "13800001111", EntryDate: "2026-08-11", SlotID: 1,
		Status: model.AppStatusPending, CreateTime: now, UpdateTime: now,
	}
	m := appToMap(app)
	if m["approvalTime"] != "" || m["cancelTime"] != "" {
		t.Errorf("nil 时间指针应映射为空串，实际 approval=%v cancel=%v", m["approvalTime"], m["cancelTime"])
	}
	// 类型化 nil 指针放进 interface 后 != nil 判断恒为 true，需显式断言类型
	if v, ok := m["approvalUserId"].(*uint); ok && v != nil {
		t.Errorf("nil 审批人应保持 nil，实际 %v", v)
	}
}
