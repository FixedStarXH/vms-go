package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"ers-go/utils"
)

// ManagerController 管理端：访客账号、管理员账号、改密码
type ManagerController struct {
	deps *Deps
}

func NewManagerController(deps *Deps) *ManagerController { return &ManagerController{deps: deps} }

// UserList 访客账号列表（旧前端 accountList 页）
// GET /admin/user/list?username=&phone=&status=&pageNum=&pageSize=
func (h *ManagerController) UserList(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.deps.Manager.AdminUserList(
		c.Query("username"), c.Query("status"), page, pageSize)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	// 兼容旧前端取数（顶层/数据内均读得到）
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "success", "list": list, "total": total})
}

// Blacklist 拉黑/移出访客
// PUT /admin/manager/blacklist  body: {userId, action:add|remove, reason}
func (h *ManagerController) Blacklist(c *gin.Context) {
	var req struct {
		UserID uint   `json:"userId" binding:"required"`
		Action string `json:"action" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Visitor.ToggleBlacklist(req.UserID, req.Action, req.Reason, 0); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	if req.Action == "remove" {
		utils.OKMsg(c, "已移出黑名单", nil)
	} else {
		utils.OKMsg(c, "已加入黑名单", nil)
	}
}

// UserDelete 删除访客账号（软删：禁用 + 拉黑）
// POST /admin/user/delete  body: {userIds: [1,2]}
func (h *ManagerController) UserDelete(c *gin.Context) {
	var req struct {
		UserIds []uint `json:"userIds"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Manager.DisableUsers(req.UserIds); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "已删除", nil)
}

// ManagerList 管理员列表
// GET /admin/manager/list
func (h *ManagerController) ManagerList(c *gin.Context) {
	list, err := h.deps.Manager.ManagerList()
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "success", "list": list, "total": len(list)})
}

// ManagerAdd 新增管理员
// POST /admin/manager/add  body: {username, phone, password}
func (h *ManagerController) ManagerAdd(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Phone    string `json:"phone"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误：密码至少 6 位")
		return
	}
	if err := h.deps.Manager.AddManager(req.Username, req.Phone, req.Password); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "添加成功", nil)
}

// ManagerDelete 删除管理员
// DELETE /admin/manager/delete/:id
func (h *ManagerController) ManagerDelete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Manager.DeleteManager(uint(id)); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "已删除", nil)
}

// SysPassword 管理员修改自己的密码（前端严格校验 code===200）
// POST /sys/password  body: {newPassword}
func (h *ManagerController) SysPassword(c *gin.Context) {
	var req struct {
		NewPassword string `json:"newPassword" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误：新密码至少 6 位")
		return
	}
	if err := h.deps.Manager.ChangeAdminPassword(uid(c), req.NewPassword); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": 200, "msg": "修改成功", "data": nil})
}
