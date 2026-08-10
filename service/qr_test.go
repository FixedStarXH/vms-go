package service

import (
	"strings"
	"testing"
)

const testQRSecret = "test-qr-secret"

// TestBuildQRContentFormat 二维码内容格式：ERS|记录编号|访客ID|日期|HMAC签名（5 段）
func TestBuildQRContentFormat(t *testing.T) {
	content := buildQRContent("EC20260810000001", 42, "2026-08-11", testQRSecret)
	parts := strings.Split(content, "|")
	if len(parts) != 5 {
		t.Fatalf("二维码内容应为 5 段，实际 %d 段: %q", len(parts), content)
	}
	if parts[0] != "ERS" {
		t.Errorf("前缀应为 ERS，实际 %q", parts[0])
	}
	if parts[1] != "EC20260810000001" || parts[2] != "42" || parts[3] != "2026-08-11" {
		t.Errorf("记录编号/访客ID/日期不对: %v", parts[1:4])
	}
	if len(parts[4]) != 64 {
		t.Errorf("签名应为 64 位 hex（SHA-256），实际 %d 位", len(parts[4]))
	}
}

// TestVerifyQRValid 正常链路：生成 → 校验，能还原记录编号
func TestVerifyQRValid(t *testing.T) {
	content := buildQRContent("EC20260810000001", 42, "2026-08-11", testQRSecret)
	recordNo, err := VerifyQRContent(content, testQRSecret)
	if err != nil {
		t.Fatalf("合法二维码校验失败: %v", err)
	}
	if recordNo != "EC20260810000001" {
		t.Errorf("应还原记录编号 EC20260810000001，实际 %q", recordNo)
	}
}

// TestVerifyTamperedDate 篡改日期：签名重算对不上，必须拒绝
func TestVerifyTamperedDate(t *testing.T) {
	content := buildQRContent("EC20260810000001", 42, "2026-08-11", testQRSecret)
	// 把日期改成另一天（篡改凭证）
	tampered := "ERS|EC20260810000001|42|2026-08-12|" + strings.Split(content, "|")[4]
	if _, err := VerifyQRContent(tampered, testQRSecret); err == nil {
		t.Error("篡改日期后应校验失败（签名防篡改失效）")
	}
}

// TestVerifyTamperedRecordNo 篡改记录编号：必须拒绝（防止把 A 的凭证改成 B）
func TestVerifyTamperedRecordNo(t *testing.T) {
	content := buildQRContent("EC20260810000001", 42, "2026-08-11", testQRSecret)
	tampered := "ERS|EC20260810000002|42|2026-08-11|" + strings.Split(content, "|")[4]
	if _, err := VerifyQRContent(tampered, testQRSecret); err == nil {
		t.Error("篡改记录编号后应校验失败")
	}
}

// TestVerifyForgedSign 伪造签名：拿不到密钥的人拼不出合法签名
func TestVerifyForgedSign(t *testing.T) {
	fake := "ERS|EC20260810000001|42|2026-08-11|deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
	if _, err := VerifyQRContent(fake, testQRSecret); err == nil {
		t.Error("伪造签名应校验失败")
	}
}

// TestVerifyWrongSecret 服务端密钥配置错误：同一内容用错密钥必然失败
func TestVerifyWrongSecret(t *testing.T) {
	content := buildQRContent("EC20260810000001", 42, "2026-08-11", testQRSecret)
	if _, err := VerifyQRContent(content, "another-secret"); err == nil {
		t.Error("错误密钥应校验失败（密钥泄露则防伪失效）")
	}
}

// TestVerifyMalformed 畸形内容：段数不足 / 前缀错误 → 格式错误而非签名错误
func TestVerifyMalformed(t *testing.T) {
	cases := []string{
		"",                        // 空串
		"EC20260810000001",        // 只有记录号
		"ERS|a|b|c",               // 只有 4 段
		"XXX|EC20260810000001|42|2026-08-11|sign", // 前缀不是 ERS
	}
	for _, c := range cases {
		if _, err := VerifyQRContent(c, testQRSecret); err == nil {
			t.Errorf("畸形内容应报错: %q", c)
		}
	}
}
