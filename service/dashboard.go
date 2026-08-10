package service

import (
	"time"

	"gorm.io/gorm"

	"ers-go/model"
)

// DashboardService 个人中心数据：看板统计、入校日历
type DashboardService struct {
	db *gorm.DB
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{db: db}
}

// Dashboard 访客个人看板
func (s *DashboardService) Dashboard(userID uint) map[string]any {
	today := time.Now().Format("2006-01-02")
	var total, pending, approved, todayVisits int64
	s.db.Model(&model.Application{}).Where("visitor_id = ? AND deleted = 0", userID).Count(&total)
	s.db.Model(&model.Application{}).Where("visitor_id = ? AND status = ? AND deleted = 0", userID, model.AppStatusPending).Count(&pending)
	s.db.Model(&model.Application{}).Where("visitor_id = ? AND status = ? AND deleted = 0", userID, model.AppStatusApproved).Count(&approved)
	s.db.Model(&model.Application{}).Where("visitor_id = ? AND entry_date = ? AND status IN (1,5) AND deleted = 0", userID, today).Count(&todayVisits)

	var recent []model.Application
	s.db.Where("visitor_id = ? AND deleted = 0", userID).Order("create_time DESC").Limit(5).Find(&recent)
	records := make([]map[string]any, 0, len(recent))
	for i := range recent {
		records = append(records, map[string]any{
			"id": recent[i].ApplicationID, "visitDate": recent[i].EntryDate,
			"status": model.AppStatusText[recent[i].Status],
		})
	}
	return map[string]any{
		"totalVisits":        total,
		"pendingApplications": pending,
		"approvedApplications": approved,
		"todayVisits":         todayVisits,
		"recentRecords":       records,
	}
}

// Calendar 入校日历：按月分组统计，缺失日期用 0 填充
func (s *DashboardService) Calendar(userID uint, month string) []map[string]any {
	if len(month) != 7 {
		month = time.Now().Format("2006-01")
	}
	startDate := month + "-01"
	start, err := time.ParseInLocation("2006-01-02", startDate, time.Local)
	if err != nil {
		start = time.Now()
	}
	end := start.AddDate(0, 1, -1)

	// 一次查询整月数据，内存分组，避免逐日查询 N+1
	var apps []model.Application
	s.db.Where("visitor_id = ? AND entry_date >= ? AND entry_date <= ? AND deleted = 0",
		userID, start.Format("2006-01-02"), end.Format("2006-01-02")).Find(&apps)
	countByDate := map[string]int{}
	eventsByDate := map[string][]map[string]any{}
	for i := range apps {
		d := apps[i].EntryDate
		countByDate[d]++
		eventsByDate[d] = append(eventsByDate[d], map[string]any{
			"id": apps[i].ApplicationID, "title": apps[i].VisitUnit,
			"time": apps[i].TimeSlot, "status": model.AppStatusText[apps[i].Status],
		})
	}

	// 填充整月
	result := make([]map[string]any, 0, end.Day())
	for d := 1; d <= end.Day(); d++ {
		dateStr := start.AddDate(0, 0, d-1).Format("2006-01-02")
		count := countByDate[dateStr]
		events := eventsByDate[dateStr]
		if events == nil {
			events = []map[string]any{}
		}
		result = append(result, map[string]any{"date": dateStr, "count": count, "events": events})
	}
	return result
}
