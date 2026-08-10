package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"ers-go/model"
	"ers-go/service"
	"ers-go/utils"
)

// ApplicationController 访客端申请
type ApplicationController struct {
	deps *Deps
}

func NewApplicationController(deps *Deps) *ApplicationController {
	return &ApplicationController{deps: deps}
}

// Submit 提交申请
// POST /api/application/submit
func (h *ApplicationController) Submit(c *gin.Context) {
	var req service.SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Fail(c, "参数错误："+err.Error())
		return
	}
	user, err := h.deps.Auth.GetVisitor(uid(c))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	app, err := h.deps.Apps.Submit(user, &req)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, gin.H{"id": app.ApplicationID, "applicationNo": app.ApplicationNo})
}

// MyList 我的申请列表（旧前端直接读顶层 list/total，状态为字符串）
// GET /api/application/list?status=pending&pageNum=1&pageSize=10
func (h *ApplicationController) MyList(c *gin.Context) {
	var status *int
	if s := c.Query("status"); s != "" {
		if v, ok := statusTextReverse[s]; ok {
			iv := int(v)
			status = &iv
		}
	}
	page, pageSize := pageParams(c)
	list, total, err := h.deps.Apps.MyList(uid(c), status, page, pageSize)
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	// 状态转为字符串（pending/approved/...）并补 createdAt 字段，对齐旧前端
	for i := range list {
		if st, ok := list[i]["status"].(int8); ok {
			list[i]["status"] = statusTextMap[st]
		}
		if ct, ok := list[i]["createTime"]; ok {
			list[i]["createdAt"] = ct
		}
	}
	c.JSON(http.StatusOK, gin.H{"code": 0, "msg": "success", "list": list, "total": total})
}

// Detail 申请详情
// GET /api/application/detail/:id
func (h *ApplicationController) Detail(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	app, err := h.deps.Apps.Detail(uint(id), uid(c))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, appToPublicMap(app))
}

// Timeline 申请流转时间线
// GET /api/application/timeline/:id
func (h *ApplicationController) Timeline(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	list, err := h.deps.Apps.Timeline(uint(id), uid(c))
	if err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OK(c, list)
}

// Cancel 取消申请
// PUT /api/application/cancel/:id
func (h *ApplicationController) Cancel(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		utils.Fail(c, "参数错误")
		return
	}
	if err := h.deps.Apps.Cancel(uint(id), uid(c)); err != nil {
		utils.Fail(c, err.Error())
		return
	}
	utils.OKMsg(c, "已取消申请", nil)
}

// appToPublicMap 访客详情视图（不含敏感审批信息外的字段差异）
func appToPublicMap(a *model.Application) map[string]any {
	m := map[string]any{
		"id":             a.ApplicationID,
		"applicationNo":  a.ApplicationNo,
		"visitorName":    a.VisitorName,
		"visitorPhone":   a.Phone,
		"visitDate":      a.EntryDate,
		"visitTime":      a.TimeSlot,
		"department":     a.VisitUnit,
		"reason":         a.Reason,
		"accompanyCount": a.CompanionCount,
		"idCard":         a.IDCard,
		"status":         statusTextMap[a.Status],
		"createTime":     utils.FormatTimeVal(a.CreateTime),
		"approveTime":    utils.FormatTimePtr(a.ApprovalTime),
		"rejectReason":   a.ApprovalRemark,
	}
	if a.RecordNo != "" {
		m["entryCode"] = a.RecordNo
		m["qrCodeUrl"] = "/uploads/qrcode/" + a.RecordNo + ".png"
	}
	return m
}

var statusTextMap = map[int8]string{
	model.AppStatusPending:  "pending",
	model.AppStatusApproved: "approved",
	model.AppStatusRejected: "rejected",
	model.AppStatusCanceled: "cancelled",
	model.AppStatusNoShow:   "no_show",
	model.AppStatusDone:     "done",
}

// statusTextReverse 字符串状态 → 数字状态（用户端列表筛选用）
var statusTextReverse = func() map[string]int8 {
	m := make(map[string]int8, len(statusTextMap))
	for k, v := range statusTextMap {
		m[v] = k
	}
	return m
}()
