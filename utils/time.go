package utils

import "time"

// FormatTimeVal 格式化时间：2006-01-02 15:04:05
func FormatTimeVal(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// FormatTimePtr 格式化时间指针，nil 返回空串
func FormatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}
