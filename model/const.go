package model

// 申请状态
const (
	AppStatusPending  int8 = 0 // 待审批
	AppStatusApproved int8 = 1 // 已通过
	AppStatusRejected int8 = 2 // 已拒绝
	AppStatusCanceled int8 = 3 // 已取消
	AppStatusNoShow   int8 = 4 // 已爽约
	AppStatusDone     int8 = 5 // 已完成
)

// 入校记录状态
const (
	RecStatusWaiting int8 = 0 // 待入校
	RecStatusEntered int8 = 1 // 已入校
	RecStatusExpired int8 = 2 // 已过期
	RecStatusNoShow  int8 = 3 // 已爽约
	RecStatusDone    int8 = 4 // 已完成
)

// 状态文案
var AppStatusText = map[int8]string{
	AppStatusPending:  "待审批",
	AppStatusApproved: "已通过",
	AppStatusRejected: "已拒绝",
	AppStatusCanceled: "已取消",
	AppStatusNoShow:   "已爽约",
	AppStatusDone:     "已完成",
}

var RecStatusText = map[int8]string{
	RecStatusWaiting: "待入校",
	RecStatusEntered: "已入校",
	RecStatusExpired: "已过期",
	RecStatusNoShow:  "已爽约",
	RecStatusDone:    "已完成",
}
