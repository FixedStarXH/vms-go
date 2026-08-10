package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword BCrypt 哈希
func HashPassword(pwd string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword 校验密码，恒定时间比较防时序攻击
func CheckPassword(hash, pwd string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pwd)) == nil
}
