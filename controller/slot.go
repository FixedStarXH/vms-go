package controller

import (
	"github.com/gin-gonic/gin"

	"ers-go/model"
	"ers-go/utils"
)

// SlotController 入校时段配置（管理端"系统设置"）
type SlotController struct {
	deps *Deps
}

func NewSlotController(deps *Deps) *SlotController { return &SlotController{deps: deps} }

// List 时段列表
// GET /admin/slot/list
func (h *SlotController) List(c *gin.Context) {
	slots, err := h.deps.Slot.List()
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, slots)
}

// Save 新增（id==0）或更新时段
// POST /admin/slot/save  body: {slotId?, slotName, startTime, endTime, maxCount, status?, sort?, remark?}
func (h *SlotController) Save(c *gin.Context) {
	var req model.TimeSlot
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	saved, err := h.deps.Slot.Save(req)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	if req.SlotID == 0 {
		utils.OKMsg(c, "时段已创建", saved)
	} else {
		utils.OKMsg(c, "时段已更新", saved)
	}
}

// Toggle 启停时段
// PUT /admin/slot/status/:id  body: {status: 0|1}
func (h *SlotController) Toggle(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	var req struct {
		Status int8 `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Slot.Toggle(id, req.Status); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	if req.Status == 1 {
		utils.OKMsg(c, "时段已启用", nil)
	} else {
		utils.OKMsg(c, "时段已停用", nil)
	}
}

// Delete 删除时段
// DELETE /admin/slot/delete/:id
func (h *SlotController) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Slot.Delete(id); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "时段已删除", nil)
}
