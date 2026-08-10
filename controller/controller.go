package controller

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"ers-go/service"
)

// Deps 服务依赖集合，由 main 组装注入
type Deps struct {
	Auth      *service.AuthService
	Captcha   *service.CaptchaService
	Apps      *service.ApplicationService
	Approval  *service.ApprovalService
	Record    *service.RecordService
	Visitor   *service.VisitorService
	Manager   *service.ManagerService
	Dashboard *service.DashboardService
}

// uid 从鉴权中间件取当前登录用户 ID
func uid(c *gin.Context) uint {
	return c.GetUint("uid")
}

// parseID 解析路径参数 :id
func parseID(c *gin.Context) (uint, error) {
	v, err := strconv.ParseUint(c.Param("id"), 10, 64)
	return uint(v), err
}

// pageParams 解析分页参数（兼容 page / pageNum 两种写法，默认 1/10）
func pageParams(c *gin.Context) (page, pageSize int) {
	page, _ = strconv.Atoi(c.DefaultQuery("pageNum", c.DefaultQuery("page", "1")))
	pageSize, _ = strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	return
}
