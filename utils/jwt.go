package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// 用户类型
const (
	UserTypeVisitor = "VISITOR"
	UserTypeAdmin   = "ADMIN"
)

// Token 类型
const (
	TokenTypeAccess  = "access"  // 访问令牌（短效）
	TokenTypeRefresh = "refresh" // 刷新令牌（长效，仅用于换发 access）
)

// Claims 自定义 JWT 载荷
type Claims struct {
	UserID    uint   `json:"uid"`
	UserType  string `json:"userType"`
	TokenType string `json:"tokenType"`
	jwt.RegisteredClaims
}

// GenerateAccessToken 生成访问令牌
func GenerateAccessToken(userID uint, userType, secret string, expireHours int) (string, time.Time, error) {
	return generateToken(userID, userType, TokenTypeAccess, secret, time.Duration(expireHours)*time.Hour)
}

// GenerateRefreshToken 生成刷新令牌
func GenerateRefreshToken(userID uint, userType, secret string, expireDays int) (string, time.Time, error) {
	return generateToken(userID, userType, TokenTypeRefresh, secret, time.Duration(expireDays)*24*time.Hour)
}

func generateToken(userID uint, userType, tokenType, secret string, ttl time.Duration) (string, time.Time, error) {
	now := time.Now()
	exp := now.Add(ttl)
	claims := Claims{
		UserID:    userID,
		UserType:  userType,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	return signed, exp, err
}

// ParseToken 解析并校验 JWT
func ParseToken(tokenStr, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("非法签名算法")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("token 无效")
	}
	return claims, nil
}
