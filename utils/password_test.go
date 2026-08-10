package utils

import "testing"

// TestHashAndCheck 核心用例：哈希 → 校验通过
func TestHashAndCheck(t *testing.T) {
	hash, err := HashPassword("admin123")
	if err != nil {
		t.Fatalf("HashPassword 失败: %v", err)
	}
	if hash == "admin123" {
		t.Error("哈希结果不能是明文！")
	}
	if !CheckPassword(hash, "admin123") {
		t.Error("正确密码校验应通过")
	}
}

// TestCheckWrongPassword 错误密码必须校验失败
func TestCheckWrongPassword(t *testing.T) {
	hash, _ := HashPassword("correct-password")
	if CheckPassword(hash, "wrong-password") {
		t.Error("错误密码竟然校验通过！")
	}
}

// TestHashUniqueness 同密码两次哈希结果不同（BCrypt 随机盐）
func TestHashUniqueness(t *testing.T) {
	h1, _ := HashPassword("same-password")
	h2, _ := HashPassword("same-password")
	if h1 == h2 {
		t.Error("BCrypt 带随机盐，两次哈希不应相同（防止彩虹表预计算）")
	}
	// 但两个哈希都能校验通过（盐只是加在存储侧）
	if !CheckPassword(h1, "same-password") || !CheckPassword(h2, "same-password") {
		t.Error("不同盐的哈希都应能校验正确密码")
	}
}

// TestCheckPasswordCorruptedHash 损坏的哈希串：校验必须失败而非 panic
func TestCheckPasswordCorruptedHash(t *testing.T) {
	if CheckPassword("not-a-bcrypt-hash", "anything") {
		t.Error("非法哈希串不应校验通过")
	}
}
