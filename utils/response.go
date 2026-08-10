package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// 统一响应契约：{code:0 成功, msg, data}，与前端 axios 拦截器对齐
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "success", "data": data})
}

func OKMsg(c *gin.Context, msg string, data any) {
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": msg, "data": data})
}

func Fail(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, gin.H{"code": 500, "msg": msg})
}

func FailCode(c *gin.Context, code int, msg string) {
	c.JSON(http.StatusOK, gin.H{"code": code, "msg": msg})
}

// Unauthorized 未登录/Token 失效，HTTP 401 + code 401（前端据此跳登录页）
func Unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": 401, "msg": "未登录或登录已过期"})
}

// Forbidden 已登录但权限不足
func Forbidden(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"code": 403, "msg": "无权限访问"})
}
