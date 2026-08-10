package model

import "testing"

// TestAppStatusTextComplete 申请 6 态都必须有文案（前端状态标签依赖）
func TestAppStatusTextComplete(t *testing.T) {
	all := []int8{AppStatusPending, AppStatusApproved, AppStatusRejected,
		AppStatusCanceled, AppStatusNoShow, AppStatusDone}
	for _, s := range all {
		if text, ok := AppStatusText[s]; !ok || text == "" {
			t.Errorf("申请状态 %d 缺少文案", s)
		}
	}
}

// TestRecStatusTextComplete 记录 5 态都必须有文案
func TestRecStatusTextComplete(t *testing.T) {
	all := []int8{RecStatusWaiting, RecStatusEntered, RecStatusExpired,
		RecStatusNoShow, RecStatusDone}
	for _, s := range all {
		if text, ok := RecStatusText[s]; !ok || text == "" {
			t.Errorf("记录状态 %d 缺少文案", s)
		}
	}
}

// TestStatusValueDistinct 申请状态值必须互不相同（状态机流转靠数值区分）
func TestStatusValueDistinct(t *testing.T) {
	seen := map[int8]bool{}
	for _, s := range []int8{AppStatusPending, AppStatusApproved, AppStatusRejected,
		AppStatusCanceled, AppStatusNoShow, AppStatusDone} {
		if seen[s] {
			t.Errorf("申请状态值重复: %d", s)
		}
		seen[s] = true
	}
}

// TestRecordStatusValueDistinct 记录状态值必须互不相同
func TestRecordStatusValueDistinct(t *testing.T) {
	seen := map[int8]bool{}
	for _, s := range []int8{RecStatusWaiting, RecStatusEntered, RecStatusExpired,
		RecStatusNoShow, RecStatusDone} {
		if seen[s] {
			t.Errorf("记录状态值重复: %d", s)
		}
		seen[s] = true
	}
}

// TestAppStatusRange 申请状态值应在 0-5 之间（表结构/旧数据兼容范围）
func TestAppStatusRange(t *testing.T) {
	for _, s := range []int8{AppStatusPending, AppStatusApproved, AppStatusRejected,
		AppStatusCanceled, AppStatusNoShow, AppStatusDone} {
		if s < 0 || s > 5 {
			t.Errorf("申请状态 %d 超出 0-5 范围", s)
		}
	}
}

// TestRecStatusRange 记录状态值应在 0-4 之间
func TestRecStatusRange(t *testing.T) {
	for _, s := range []int8{RecStatusWaiting, RecStatusEntered, RecStatusExpired,
		RecStatusNoShow, RecStatusDone} {
		if s < 0 || s > 4 {
			t.Errorf("记录状态 %d 超出 0-4 范围", s)
		}
	}
}
