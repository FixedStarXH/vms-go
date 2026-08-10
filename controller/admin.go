package controller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"ers-go/utils"
)

// AdminController 管理端：申请审批、监控概览、访客管理
type AdminController struct {
	deps *Deps
}

func NewAdminController(deps *Deps) *AdminController { return &AdminController{deps: deps} }

// AppList 申请列表（条件查询）
// GET /admin/application/list?keyword=&status=&startDate=&endDate=&page=&pageSize=
func (h *AdminController) AppList(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.deps.Approval.AdminList(
		c.Query("keyword"), c.Query("status"), c.Query("startDate"), c.Query("endDate"), page, pageSize)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{"list": list, "total": total})
}

// AppDetail 申请详情
// GET /admin/application/detail/:id
func (h *AdminController) AppDetail(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	detail, err := h.deps.Approval.Detail(uint(id))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, detail)
}

// Approve 审批通过（生成二维码 + 入校记录）
// PUT /admin/application/approve/:id
func (h *AdminController) Approve(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	var req struct {
		Remark string `json:"remark"`
	}
	_ = c.ShouldBindJSON(&req)
	if err := h.deps.Approval.Approve(uint(id), uid(c), req.Remark); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "审批通过，已生成入校凭证", nil)
}

// Reject 审批拒绝
// PUT /admin/application/reject/:id
func (h *AdminController) Reject(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Approval.Reject(uint(id), uid(c), req.Reason); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "已拒绝该申请", nil)
}

// BatchApprove 批量审批通过（逐条失败隔离）
// PUT /admin/application/batch-approve  body: {ids, remark}
// 兼容旧前端：query 传 ids=JSON.stringify([1,2])&remark=
func (h *AdminController) BatchApprove(c *gin.Context) {
	var req struct {
		Ids    []uint `json:"ids"`
		Remark string `json:"remark"`
	}
	hasBody := c.ShouldBindJSON(&req) == nil
	if !hasBody {
		// 旧前端把 ids 放在 query：ids 是 JSON 数组字符串
		if raw := c.Query("ids"); raw != "" {
			var arr []uint
			if err := json.Unmarshal([]byte(raw), &arr); err == nil {
				req.Ids = arr
			}
			req.Remark = c.Query("remark")
		}
	}
	result, err := h.deps.Approval.BatchApprove(req.Ids, uid(c), req.Remark)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, result)
}

// BatchReject 批量拒绝
// PUT /admin/application/batch-reject
func (h *AdminController) BatchReject(c *gin.Context) {
	var req struct {
		Ids    []uint `json:"ids"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	result, err := h.deps.Approval.BatchReject(req.Ids, uid(c), req.Reason)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, result)
}

// Delete 逻辑删除申请
// DELETE /admin/application/delete/:id
func (h *AdminController) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Approval.Delete(uint(id)); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "已删除", nil)
}

// Export 申请列表 Excel 导出
// GET /admin/application/export?keyword=&status=&startDate=&endDate=
func (h *AdminController) Export(c *gin.Context) {
	c.Header("Content-Disposition", `attachment; filename="applications.xlsx"`)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	if err := h.deps.Approval.ExportApplications(
		c.Writer, c.Query("keyword"), c.Query("status"), c.Query("startDate"), c.Query("endDate")); err != nil {
		// 响应头已写入，只能中断连接提示
		c.Writer.WriteHeader(http.StatusInternalServerError)
		_, _ = c.Writer.WriteString("导出失败：" + err.Error())
	}
}

// TodayOverview 今日入校概览
// GET /admin/monitor/today-overview
func (h *AdminController) TodayOverview(c *gin.Context) {
	utils.OK(c, h.deps.Record.TodayOverview())
}

// VisitorList 访客列表
// GET /admin/visitor/list?keyword=&status=&page=&pageSize=
func (h *AdminController) VisitorList(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.deps.Visitor.AdminList(c.Query("keyword"), c.Query("status"), page, pageSize)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{"list": list, "total": total})
}

// Blacklist 拉黑/移出访客
// PUT /admin/visitor/blacklist  body: {id, action: add|remove, reason, days}
func (h *AdminController) Blacklist(c *gin.Context) {
	var req struct {
		ID     uint   `json:"id" binding:"required"`
		Action string `json:"action" binding:"required"`
		Reason string `json:"reason"`
		Days   int    `json:"days"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Visitor.ToggleBlacklist(req.ID, req.Action, req.Reason, req.Days); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	if req.Action == "remove" {
		utils.OKMsg(c, "已移出黑名单", nil)
	} else {
		utils.OKMsg(c, "已加入黑名单", nil)
	}
}
