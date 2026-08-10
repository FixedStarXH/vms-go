package service

import (
	"testing"
	"time"
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
