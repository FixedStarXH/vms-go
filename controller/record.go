package controller

import (
	"github.com/gin-gonic/gin"

	"ers-go/utils"
)

// RecordController 入校记录：列表、扫码核销
type RecordController struct {
	deps *Deps
}

func NewRecordController(deps *Deps) *RecordController { return &RecordController{deps: deps} }

// List 入校记录列表
// GET /admin/record/list?keyword=&status=&startDate=&endDate=&page=&pageSize=
func (h *RecordController) List(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.deps.Record.AdminList(
		c.Query("keyword"), c.Query("status"), c.Query("startDate"), c.Query("endDate"), page, pageSize)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{"list": list, "total": total})
}

// Verify 扫码核销（幂等）
// POST /admin/record/verify  body: {qrContent, gate}
func (h *RecordController) Verify(c *gin.Context) {
	var req struct {
		QRContent string `json:"qrContent" binding:"required"`
		Gate      string `json:"gate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误：缺少二维码内容")
		return
	}
	if req.Gate == "" {
		req.Gate = "东门"
	}
	result, err := h.deps.Record.Verify(req.QRContent, req.Gate, uid(c))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, result.Message, result)
}
