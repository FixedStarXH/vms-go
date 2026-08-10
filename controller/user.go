package controller

import (
	"github.com/gin-gonic/gin"

	"ers-go/utils"
)

// UserController 访客个人中心
type UserController struct {
	deps *Deps
}

func NewUserController(deps *Deps) *UserController { return &UserController{deps: deps} }

// Info 个人信息
// GET /api/user/info
func (h *UserController) Info(c *gin.Context) {
	user, err := h.deps.Auth.GetVisitor(uid(c))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{
		"id": user.UserID, "username": user.Username, "phone": user.Mobile,
		"email": user.Email, "realName": user.RealName,
		"blacklistFlag": user.BlacklistFlag,
		"noShowCount":   user.NoShowCount,
		"createTime":    utils.FormatTimeVal(user.CreateTime),
	})
}

// Update 修改资料
// PUT /api/user/update
func (h *UserController) Update(c *gin.Context) {
	var req struct {
		RealName string `json:"realName"`
		Phone    string `json:"phone"`
		Email    string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Auth.UpdateVisitorInfo(uid(c), req.RealName, req.Phone, req.Email); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "修改成功", nil)
}

// Password 修改密码
// PUT /api/user/password
func (h *UserController) Password(c *gin.Context) {
	var req struct {
		OldPassword string `json:"oldPassword" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误：新密码至少 6 位")
		return
	}
	if err := h.deps.Auth.ChangePassword(uid(c), req.OldPassword, req.NewPassword); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "密码修改成功", nil)
}

// Dashboard 个人看板
// GET /api/user/dashboard
func (h *UserController) Dashboard(c *gin.Context) {
	utils.OK(c, h.deps.Dashboard.Dashboard(uid(c)))
}

// Calendar 入校日历
// GET /api/user/calendar?month=2026-05
func (h *UserController) Calendar(c *gin.Context) {
	month := c.Query("month")
	utils.OK(c, h.deps.Dashboard.Calendar(uid(c), month))
}
