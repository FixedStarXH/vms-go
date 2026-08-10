package service

import (
	"strings"
	"testing"
	"time"
)

// TestGenApplicationNoFormat 申请编号格式：APP + 毫秒时间戳(20060102150405.000 共18位) + 3 位序列
func TestGenApplicationNoFormat(t *testing.T) {
	no := genApplicationNo()
	if !strings.HasPrefix(no, "APP") {
		t.Fatalf("编号应以 APP 开头，实际 %q", no)
	}
	// 长度 = 3 + 18 + 3 = 24
	if len(no) != 24 {
		t.Errorf("编号长度应为 24，实际 %d: %q", len(no), no)
	}
	// 中间 18 位必须能解析为毫秒时间戳
	if _, err := time.Parse("20060102150405.000", no[3:21]); err != nil {
		t.Errorf("编号中间应为合法毫秒时间戳，实际 %q: %v", no[3:21], err)
	}
}

// TestGenApplicationNoUnique 同一毫秒连续生成不应重复（原子序列兜底，防唯一索引冲突）
func TestGenApplicationNoUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		no := genApplicationNo()
		if seen[no] {
			t.Fatalf("编号重复: %s", no)
		}
		seen[no] = true
	}
}

// TestBuildDateTime 时间拼接：日期 + HH:MM → 本地时区完整时间
func TestBuildDateTime(t *testing.T) {
	got, err := buildDateTime("2026-08-11", "08:00")
	if err != nil {
		t.Fatalf("buildDateTime 失败: %v", err)
	}
	if got.Format("2006-01-02 15:04") != "2026-08-11 08:00" {
		t.Errorf("时间拼接结果不对: %v", got)
	}
	// 带空格也要能解析（前端可能传 " 08:00"）
	if got, err := buildDateTime("2026-08-11", " 08:00"); err != nil || got.Hour() != 8 {
		t.Errorf("带空格的时间段解析失败: %v", err)
	}
}

// TestBuildDateTimeInvalid 非法时间必须报错：如 25:99
func TestBuildDateTimeInvalid(t *testing.T) {
	if _, err := buildDateTime("2026-08-11", "25:99"); err == nil {
		t.Error("非法时间 25:99 应报错")
	}
}

// TestSubmitRequestNormalize 新旧前端字段兼容：visitDate/visitorPhone/department 兜底映射
func TestSubmitRequestNormalize(t *testing.T) {
	req := &SubmitRequest{
		VisitorPhone: "13800001111",
		VisitDate:    "2026-08-12",
		Department:   "教务处",
	}
	req.normalize()
	if req.Phone != "13800001111" {
		t.Errorf("Phone 应兜底取 visitorPhone，实际 %q", req.Phone)
	}
	if req.EntryDate != "2026-08-12" {
		t.Errorf("EntryDate 应兜底取 visitDate，实际 %q", req.EntryDate)
	}
	if req.VisitUnit != "教务处" {
		t.Errorf("VisitUnit 应兜底取 department，实际 %q", req.VisitUnit)
	}
}

// TestSubmitRequestNormalizePreferNew 新字段优先：旧字段不应覆盖新字段
func TestSubmitRequestNormalizePreferNew(t *testing.T) {
	req := &SubmitRequest{
		Phone:        "13900002222",
		VisitorPhone: "13800001111",
		EntryDate:    "2026-08-13",
		VisitDate:    "2026-08-12",
		VisitUnit:    "后勤处",
		Department:   "教务处",
	}
	req.normalize()
	if req.Phone != "13900002222" || req.EntryDate != "2026-08-13" || req.VisitUnit != "后勤处" {
		t.Errorf("新字段应优先保留: phone=%q date=%q unit=%q", req.Phone, req.EntryDate, req.VisitUnit)
	}
}

// TestSlotKey 名额计数 key 格式：ers:slot:count:{slotID}:{date}
func TestSlotKey(t *testing.T) {
	s := &ApplicationService{}
	if got := s.slotKey(3, "2026-08-11"); got != "ers:slot:count:3:2026-08-11" {
		t.Errorf("slot key 格式不对: %q", got)
	}
}

// TestNextRecordNoFormat 记录编号兜底格式：EC + 14 位时间戳 + 3 位随机（cache 为 nil 的降级路径）
func TestNextRecordNoFormat(t *testing.T) {
	s := &ApplicationService{} // cache == nil，走降级分支
	no, err := s.nextRecordNo()
	if err != nil {
		t.Fatalf("nextRecordNo 失败: %v", err)
	}
	if !strings.HasPrefix(no, "EC") || len(no) != 19 {
		t.Errorf("兜底记录编号格式不对: %q（期望 EC+时间戳+3位随机）", no)
	}
}
