package service

import (
	"time"

	"ers-go/model"
)

// 统一 JSON 时间格式，与旧前端约定一致：2006-01-02 15:04:05
func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}

func formatTimeVal(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// appToMap 申请实体 → 前端契约字段
func appToMap(a *model.Application) map[string]any {
	return map[string]any{
		"id":              a.ApplicationID,
		"applicationNo":   a.ApplicationNo,
		"visitorId":       a.VisitorID,
		"visitorName":     a.VisitorName,
		"phone":           a.Phone,
		"idCard":          a.IDCard,
		"entryDate":       a.EntryDate,
		"slotId":          a.SlotID,
		"timeSlot":        a.TimeSlot,
		"entryStartTime":  formatTimeVal(a.EntryStartTime),
		"entryEndTime":    formatTimeVal(a.EntryEndTime),
		"reason":          a.Reason,
		"visitUnit":       a.VisitUnit,
		"vehiclePlate":    a.VehiclePlate,
		"companionCount":  a.CompanionCount,
		"attachmentUrl":   a.AttachmentURL,
		"status":          a.Status,
		"rejectReason":    a.ApprovalRemark,
		"entryCode":       a.RecordNo,
		"approvalUserId":  a.ApprovalUserID,
		"approvalTime":    formatTimePtr(a.ApprovalTime),
		"approvalRemark":  a.ApprovalRemark,
		"cancelTime":      formatTimePtr(a.CancelTime),
		"cancelReason":    a.CancelReason,
		"createTime":      formatTimeVal(a.CreateTime),
		"updateTime":      formatTimeVal(a.UpdateTime),
		"deleted":         a.Deleted,
	}
}

// recordToMap 入校记录实体 → 前端契约字段
func recordToMap(r *model.EntryRecord) map[string]any {
	return map[string]any{
		"id":               r.RecordID,
		"recordNo":         r.RecordNo,
		"applicationId":    r.ApplicationID,
		"visitorId":        r.VisitorID,
		"visitorName":      r.VisitorName,
		"phone":            r.Phone,
		"entryDate":        r.EntryDate,
		"entryStartTime":   formatTimeVal(r.EntryStartTime),
		"entryEndTime":     formatTimeVal(r.EntryEndTime),
		"actualEntryTime":  formatTimePtr(r.ActualEntryTime),
		"actualLeaveTime":  formatTimePtr(r.ActualLeaveTime),
		"verifyStatus":     r.VerifyStatus,
		"verifyGate":       r.VerifyGate,
		"verifyUserId":     r.VerifyUserID,
		"recordStatus":     r.RecordStatus,
		"recordStatusText": model.RecStatusText[r.RecordStatus],
		"remark":           r.Remark,
		"createTime":       formatTimeVal(r.CreateTime),
		"updateTime":       formatTimeVal(r.UpdateTime),
	}
}
