package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// 测试用固定密钥，不依赖 config.yaml
const testSecret = "test-secret-for-jwt"

// TestGenerateAndParseAccess 核心用例：签发访问令牌 → 解析，uid/userType 要能还原
func TestGenerateAndParseAccess(t *testing.T) {
	token, exp, err := GenerateAccessToken(42, UserTypeVisitor, testSecret, 2)
	if err != nil {
		t.Fatalf("GenerateAccessToken 失败: %v", err)
	}
	if exp.IsZero() {
		t.Error("返回的过期时间不应为零值（前端要用）")
	}
	claims, err := ParseToken(token, testSecret)
	if err != nil {
		t.Fatalf("ParseToken 失败: %v", err)
	}
	if claims.UserID != 42 || claims.UserType != UserTypeVisitor {
		t.Errorf("解析结果不对: uid=%d userType=%q, 期望 uid=42 userType=VISITOR",
			claims.UserID, claims.UserType)
	}
	if claims.TokenType != TokenTypeAccess {
		t.Errorf("token 类型应为 access，实际 %q", claims.TokenType)
	}
}

// TestGenerateAndParseRefresh 刷新令牌：类型必须是 refresh，且有效期更长
func TestGenerateAndParseRefresh(t *testing.T) {
	token, _, err := GenerateRefreshToken(7, UserTypeAdmin, testSecret, 7)
	if err != nil {
		t.Fatalf("GenerateRefreshToken 失败: %v", err)
	}
	claims, err := ParseToken(token, testSecret)
	if err != nil {
		t.Fatalf("ParseToken(refresh) 失败: %v", err)
	}
	if claims.TokenType != TokenTypeRefresh {
		t.Errorf("refresh 类型不对: %q, 期望 refresh", claims.TokenType)
	}
	if claims.UserType != UserTypeAdmin {
		t.Errorf("userType 应为 ADMIN，实际 %q", claims.UserType)
	}
}

// TestTokenTypeMismatch 类型串用：access 不能当 refresh 用（服务端按 TokenType 隔离）
func TestTokenTypeMismatch(t *testing.T) {
	access, _, _ := GenerateAccessToken(1, UserTypeVisitor, testSecret, 1)
	claims, err := ParseToken(access, testSecret)
	if err != nil {
		t.Fatalf("ParseToken 失败: %v", err)
	}
	// 校验 refresh 换发逻辑里对类型的检查（模拟 auth.Refresh 中的判断）
	if claims.TokenType != TokenTypeRefresh {
		t.Log("access token 类型校验正确，不能被当作 refresh 使用")
	} else {
		t.Error("access token 竟然标记为 refresh 类型！类型隔离失效")
	}
}

// TestParseTampered 防篡改：改动 token 任一字符，验签必须失败（JWT 签名机制）
func TestParseTampered(t *testing.T) {
	token, _, _ := GenerateAccessToken(1, UserTypeVisitor, testSecret, 1)
	tampered := token[:len(token)-1] + "x"
	if _, err := ParseToken(tampered, testSecret); err == nil {
		t.Error("篡改的 token 竟然通过校验！签名机制失效")
	}
}

// TestParseWrongSecret 密钥错误：换一个密钥解析必须失败
func TestParseWrongSecret(t *testing.T) {
	token, _, _ := GenerateAccessToken(1, UserTypeVisitor, testSecret, 1)
	if _, err := ParseToken(token, "another-secret"); err == nil {
		t.Error("错误密钥竟然解析成功！必须报错")
	}
}

// TestParseExpired 过期：手工构造已过期 token，解析必须失败
func TestParseExpired(t *testing.T) {
	claims := Claims{
		UserID:    1,
		UserType:  UserTypeVisitor,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)), // 1 小时前已过期
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatalf("构造 token 失败: %v", err)
	}
	if _, err := ParseToken(token, testSecret); err == nil {
		t.Error("过期 token 竟然通过校验！exp 未生效")
	}
}

// TestParseNotExpired 未过期边界：当前时刻签发的 token 必须可解析
func TestParseNotExpired(t *testing.T) {
	token, _, _ := GenerateAccessToken(1, UserTypeVisitor, testSecret, 1)
	if _, err := ParseToken(token, testSecret); err != nil {
		t.Errorf("未过期 token 应可解析，实际: %v", err)
	}
}
