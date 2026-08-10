package service

import (
	"fmt"
	"io"
	"time"

	"github.com/xuri/excelize/v2"

	"ers-go/model"
)

// ExportApplications 导出申请列表为 Excel（支持条件过滤，不分页）
// 兼容旧前端/管理后台"导出"入口，表头对齐后端字段
func (s *ApprovalService) ExportApplications(w io.Writer, keyword, status, startDate, endDate string) error {
	q := s.db.Model(&model.Application{}).Where("deleted = 0")
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("(visitor_name LIKE ? OR phone LIKE ? OR application_no LIKE ?)", like, like, like)
	}
	if status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}
	if startDate != "" {
		q = q.Where("entry_date >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("entry_date <= ?", endDate)
	}
	var apps []model.Application
	if err := q.Order("create_time DESC").Find(&apps).Error; err != nil {
		return err
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Sheet1"

	headers := []string{"申请编号", "访客姓名", "手机号", "访问单位", "入校日期", "入校时段",
		"开始时间", "结束时间", "入校事由", "随行人数", "车牌号", "状态", "提交时间", "审批时间", "审批备注"}
	style, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 12},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"DCE6F1"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	_ = f.SetRowStyle(sheet, 1, 1, style)

	for i, a := range apps {
		row := i + 2
		values := []any{
			a.ApplicationNo, a.VisitorName, a.Phone, a.VisitUnit, a.EntryDate, a.TimeSlot,
			formatTimeVal(a.EntryStartTime), formatTimeVal(a.EntryEndTime),
			a.Reason, a.CompanionCount, a.VehiclePlate,
			model.AppStatusText[a.Status],
			formatTimeVal(a.CreateTime), formatTimePtr(a.ApprovalTime), a.ApprovalRemark,
		}
		for j, v := range values {
			cell, _ := excelize.CoordinatesToCellName(j+1, row)
			_ = f.SetCellValue(sheet, cell, v)
		}
	}

	widths := []float64{22, 12, 15, 18, 12, 14, 20, 20, 26, 10, 14, 10, 20, 20, 26}
	for i, wd := range widths {
		col, _ := excelize.ColumnNumberToName(i + 1)
		_ = f.SetColWidth(sheet, col, col, wd)
	}
	_ = f.SetRowHeight(sheet, 1, 22)

	filename := fmt.Sprintf("入校申请导出_%s.xlsx", time.Now().Format("20060102150405"))
	_ = f.SetDocProps(&excelize.DocProperties{Title: filename})
	_, err := f.WriteTo(w)
	return err
}
