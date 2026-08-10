package service

import (
	"testing"
	"time"
)

// TestCheckEntryWindow 入校时间窗校验：早于时段 / 晚于时段 / 时段内 / 时段未录入
func TestCheckEntryWindow(t *testing.T) {
	start := time.Date(2026, 8, 11, 8, 0, 0, 0, time.Local)
	end := time.Date(2026, 8, 11, 12, 0, 0, 0, time.Local)
	zero := time.Time{}

	cases := []struct {
		name    string
		now     time.Time
		start   time.Time
		end     time.Time
		wantErr bool // true = 应拒绝
	}{
		{"时段内放行", time.Date(2026, 8, 11, 9, 0, 0, 0, time.Local), start, end, false},
		{"时段起点放行", start, start, end, false},
		{"时段终点放行", end, start, end, false},
		{"未到时段拒绝", time.Date(2026, 8, 11, 7, 59, 0, 0, time.Local), start, end, true},
		{"过时段拒绝（次日）", time.Date(2026, 8, 12, 8, 0, 0, 0, time.Local), start, end, true},
		{"时段未录入放行", time.Date(2026, 8, 11, 9, 0, 0, 0, time.Local), zero, zero, false},
	}
	for _, c := range cases {
		err := checkEntryWindow(c.now, c.start, c.end)
		if (err != nil) != c.wantErr {
			t.Errorf("%s: 期望拒绝=%v，实际 err=%v", c.name, c.wantErr, err)
		}
	}
}
