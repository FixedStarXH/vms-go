package service

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"ers-go/config"
	"ers-go/model"
)

// newVisitorTestDB 内存库 + 爽约闭环涉及的四张表（访客/申请/入校记录/爽约日志）
// 注意：不用 AutoMigrate——model.Application 与 model.EntryRecord 存在同名索引
// idx_entry_date / idx_visitor_id，sqlite 索引名 schema 级唯一会冲突（生产 MySQL 无此限制），
// 因此这里按测试所需的最小列集手写 DDL。
func newVisitorTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	ddl := []string{
		`CREATE TABLE ers_user (
			user_id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT, password TEXT, real_name TEXT, mobile TEXT, email TEXT,
			status INTEGER DEFAULT 1, blacklist_flag INTEGER DEFAULT 0,
			blacklist_expire DATETIME, blacklist_reason TEXT, no_show_count INTEGER DEFAULT 0,
			last_login_time DATETIME, last_login_ip TEXT,
			register_time DATETIME, create_time DATETIME)`,
		`CREATE TABLE ers_entry_application (
			application_id INTEGER PRIMARY KEY AUTOINCREMENT,
			application_no TEXT, visitor_id INTEGER, visitor_name TEXT, phone TEXT, id_card TEXT,
			entry_date TEXT, slot_id INTEGER, time_slot TEXT,
			entry_start_time DATETIME, entry_end_time DATETIME,
			reason TEXT, visit_unit TEXT, vehicle_plate TEXT, companion_count INTEGER DEFAULT 0, attachment_url TEXT,
			status INTEGER DEFAULT 0,
			approval_user_id INTEGER, approval_time DATETIME, approval_remark TEXT,
			cancel_time DATETIME, cancel_reason TEXT,
			record_no TEXT, qr_code_content TEXT, deleted INTEGER DEFAULT 0,
			create_time DATETIME, update_time DATETIME)`,
		`CREATE TABLE ers_entry_record (
			record_id INTEGER PRIMARY KEY AUTOINCREMENT,
			record_no TEXT, application_id INTEGER, visitor_id INTEGER, visitor_name TEXT, phone TEXT,
			entry_date TEXT, entry_start_time DATETIME, entry_end_time DATETIME,
			actual_entry_time DATETIME, actual_leave_time DATETIME,
			verify_status INTEGER DEFAULT 0, verify_gate TEXT, verify_user_id INTEGER,
			qr_code_content TEXT, record_status INTEGER DEFAULT 0, remark TEXT,
			create_time DATETIME, update_time DATETIME)`,
		`CREATE TABLE ers_no_show_log (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			visitor_id INTEGER, application_id INTEGER, no_show_date TEXT,
			is_cleared INTEGER DEFAULT 0, create_time DATETIME)`,
	}
	for _, s := range ddl {
		if err := db.Exec(s).Error; err != nil {
			t.Fatalf("建表失败: %v\nSQL: %s", err, s)
		}
	}
	return db
}

// visitorTestCfg 规则：累计 3 次爽约自动拉黑 30 天（与 docker-compose 环境变量一致）
func visitorTestCfg() *config.Config {
	return &config.Config{App: config.AppConfig{NoShowMaxCount: 3, NoShowBlacklistDays: 30}}
}

// seedVisitorAndApp 造访客（指定初始爽约次数）+ 已通过申请 + 待入校记录
func seedVisitorAndApp(t *testing.T, db *gorm.DB, noShowCount int) (model.User, model.Application, model.EntryRecord) {
	t.Helper()
	now := time.Now()
	u := model.User{
		Username: "visitor_bench", Password: "x", RealName: "张三", Mobile: "13800000000",
		Status: 1, NoShowCount: noShowCount, RegisterTime: now, CreateTime: now,
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("seed 访客失败: %v", err)
	}
	app := model.Application{
		ApplicationNo: "APP-TEST-001", VisitorID: u.UserID, VisitorName: "张三", Phone: "13800000000",
		EntryDate: "2026-08-11", SlotID: 1, Reason: "测试", Status: model.AppStatusApproved,
		CreateTime: now, UpdateTime: now,
	}
	if err := db.Create(&app).Error; err != nil {
		t.Fatalf("seed 申请失败: %v", err)
	}
	rec := model.EntryRecord{
		RecordNo: "EC-TEST-001", ApplicationID: app.ApplicationID, VisitorID: u.UserID,
		VisitorName: "张三", Phone: "13800000000", EntryDate: "2026-08-11",
		RecordStatus: model.RecStatusWaiting, CreateTime: now, UpdateTime: now,
	}
	if err := db.Create(&rec).Error; err != nil {
		t.Fatalf("seed 入校记录失败: %v", err)
	}
	return u, app, rec
}

// TestMarkNoShowRecordUpdate 爽约闭环核心：记录变爽约 + 已通过申请变爽约 + 写入爽约日志
func TestMarkNoShowRecordUpdate(t *testing.T) {
	db := newVisitorTestDB(t)
	svc := &VisitorService{db: db, cfg: visitorTestCfg()}
	_, _, rec := seedVisitorAndApp(t, db, 1)
	now := time.Date(2026, 8, 11, 12, 0, 0, 0, time.Local)

	if _, err := svc.MarkNoShow(&rec, now); err != nil {
		t.Fatalf("MarkNoShow 失败: %v", err)
	}
	var gotRec model.EntryRecord
	if err := db.First(&gotRec, rec.RecordID).Error; err != nil {
		t.Fatal(err)
	}
	if gotRec.RecordStatus != model.RecStatusNoShow {
		t.Errorf("入校记录应标记为爽约，实际 status=%d", gotRec.RecordStatus)
	}
	var gotApp model.Application
	if err := db.First(&gotApp, rec.ApplicationID).Error; err != nil {
		t.Fatal(err)
	}
	if gotApp.Status != model.AppStatusNoShow {
		t.Errorf("已通过申请应标记为爽约，实际 status=%d", gotApp.Status)
	}
	var cnt int64
	db.Model(&model.NoShowLog{}).Where("visitor_id = ? AND no_show_date = ?", rec.VisitorID, rec.EntryDate).Count(&cnt)
	if cnt != 1 {
		t.Errorf("应写入 1 条爽约日志，实际 %d", cnt)
	}
}

// TestMarkNoShowAutoBlacklist 累计第 3 次爽约 → 自动拉黑 30 天（简历规则：3 次拉黑）
func TestMarkNoShowAutoBlacklist(t *testing.T) {
	db := newVisitorTestDB(t)
	svc := &VisitorService{db: db, cfg: visitorTestCfg()}
	u, _, rec := seedVisitorAndApp(t, db, 2) // 已有 2 次，本次第 3 次触发拉黑
	now := time.Date(2026, 8, 11, 12, 0, 0, 0, time.Local)

	blacklisted, err := svc.MarkNoShow(&rec, now)
	if err != nil {
		t.Fatalf("MarkNoShow 失败: %v", err)
	}
	if !blacklisted {
		t.Error("累计 3 次爽约应触发自动拉黑")
	}
	var got model.User
	if err := db.First(&got, u.UserID).Error; err != nil {
		t.Fatal(err)
	}
	if got.BlacklistFlag != 1 {
		t.Errorf("应标记黑名单，实际 flag=%d", got.BlacklistFlag)
	}
	if got.NoShowCount != 3 {
		t.Errorf("爽约次数应累计到 3，实际 %d", got.NoShowCount)
	}
	wantExpire := now.AddDate(0, 0, 30)
	if got.BlacklistExpire == nil || diffMinutes(*got.BlacklistExpire, wantExpire) > 1 {
		t.Errorf("黑名单到期应为 now+30 天，实际 %v", got.BlacklistExpire)
	}
	if got.BlacklistReason == "" {
		t.Error("应记录自动拉黑原因")
	}
}

// TestMarkNoShowBelowThreshold 未达阈值（第 2 次）：只累计次数，不进黑名单
func TestMarkNoShowBelowThreshold(t *testing.T) {
	db := newVisitorTestDB(t)
	svc := &VisitorService{db: db, cfg: visitorTestCfg()}
	u, _, rec := seedVisitorAndApp(t, db, 1) // 已有 1 次，本次第 2 次 < 3
	now := time.Date(2026, 8, 11, 12, 0, 0, 0, time.Local)

	blacklisted, err := svc.MarkNoShow(&rec, now)
	if err != nil {
		t.Fatalf("MarkNoShow 失败: %v", err)
	}
	if blacklisted {
		t.Error("未达阈值不应触发拉黑")
	}
	var got model.User
	if err := db.First(&got, u.UserID).Error; err != nil {
		t.Fatal(err)
	}
	if got.BlacklistFlag != 0 {
		t.Errorf("未达阈值不应进黑名单，实际 flag=%d", got.BlacklistFlag)
	}
	if got.NoShowCount != 2 {
		t.Errorf("爽约次数应 +1 为 2，实际 %d", got.NoShowCount)
	}
}

// TestAddBlacklistDefaultDays 手动拉黑 days<=0 时使用配置默认天数（30 天）
func TestAddBlacklistDefaultDays(t *testing.T) {
	db := newVisitorTestDB(t)
	svc := &VisitorService{db: db, cfg: visitorTestCfg()}
	u := model.User{
		Username: "visitor_manual", Password: "x", RealName: "李四", Mobile: "13900000000",
		Status: 1, RegisterTime: time.Now(), CreateTime: time.Now(),
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatal(err)
	}

	if err := svc.AddBlacklist(u.UserID, "手动拉黑", 0); err != nil {
		t.Fatalf("AddBlacklist 失败: %v", err)
	}
	var got model.User
	if err := db.First(&got, u.UserID).Error; err != nil {
		t.Fatal(err)
	}
	if got.BlacklistFlag != 1 {
		t.Errorf("应标记黑名单，实际 flag=%d", got.BlacklistFlag)
	}
	wantExpire := time.Now().AddDate(0, 0, 30)
	if got.BlacklistExpire == nil || diffMinutes(*got.BlacklistExpire, wantExpire) > 1 {
		t.Errorf("应使用默认 30 天，实际 %v", got.BlacklistExpire)
	}
	if got.BlacklistReason != "手动拉黑" {
		t.Errorf("拉黑原因不对: %q", got.BlacklistReason)
	}
}

// diffMinutes 两个时间相差的分钟数（用于比较"约等于 now+30 天"）
func diffMinutes(a, b time.Time) float64 {
	d := a.Sub(b)
	if d < 0 {
		d = -d
	}
	return d.Minutes()
}
