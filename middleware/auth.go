package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"ers-go/cache"
	"ers-go/utils"
)

// JWTAuth 鉴权中间件：解析 token → 校验 Redis 黑名单 → 注入 uid/userType
// Redis 不可用时跳过黑名单校验（降级），但 JWT 签名校验不受影响
func JWTAuth(rc *cache.RedisCache, secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ExtractToken(c)
		if token == "" {
			utils.Unauthorized(c)
			return
		}
		if rc != nil {
			if exists, err := rc.Exists("blacklist:" + token); err == nil && exists {
				utils.Unauthorized(c)
				return
			}
		}
		claims, err := utils.ParseToken(token, secret)
		if err != nil {
			utils.Unauthorized(c)
			return
		}
		if claims.TokenType != utils.TokenTypeAccess {
			utils.Unauthorized(c)
			return
		}
		c.Set("uid", claims.UserID)
		c.Set("userType", claims.UserType)
		c.Set("token", token)
		c.Next()
	}
}

// RequireAdmin 要求当前登录者必须是管理员
func RequireAdmin(c *gin.Context) {
	if c.GetString("userType") != utils.UserTypeAdmin {
		utils.Forbidden(c)
		return
	}
	c.Next()
}

// CORS 跨域（开发环境前端直连时使用）
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, token")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// ExtractToken 从请求头提取 token：优先 token 头，其次 Authorization: Bearer xxx
func ExtractToken(c *gin.Context) string {
	token := c.GetHeader("token")
	if token == "" {
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token = strings.TrimPrefix(auth, "Bearer ")
		}
	}
	return strings.TrimSpace(token)
}
