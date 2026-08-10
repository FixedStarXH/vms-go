package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/skip2/go-qrcode"
)

// buildQRContent 生成二维码内容：ERS|记录编号|访客ID|日期|HMAC签名
// 签名防伪：扫码时重算签名比对，防止伪造/篡改凭证
func buildQRContent(recordNo string, visitorID uint, entryDate, secret string) string {
	sign := hmacSHA256Hex(secret, fmt.Sprintf("%s|%d|%s", recordNo, visitorID, entryDate))
	return fmt.Sprintf("ERS|%s|%d|%s|%s", recordNo, visitorID, entryDate, sign)
}

func hmacSHA256Hex(secret, data string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

// VerifyQRContent 校验二维码签名，返回记录编号；签名非法返回错误
func VerifyQRContent(content, secret string) (string, error) {
	parts := strings.Split(content, "|")
	if len(parts) != 5 || parts[0] != "ERS" {
		return "", errors.New("二维码格式非法")
	}
	recordNo, visitorID, entryDate, sign := parts[1], parts[2], parts[3], parts[4]
	expect := hmacSHA256Hex(secret, fmt.Sprintf("%s|%s|%s", recordNo, visitorID, entryDate))
	if !hmac.Equal([]byte(expect), []byte(sign)) {
		return "", errors.New("二维码签名校验失败，疑似伪造")
	}
	return recordNo, nil
}

// GenerateQRPNG 生成二维码图片文件，返回相对路径
func GenerateQRPNG(content, dir, recordNo string) (string, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, recordNo+".png")
	if err := qrcode.WriteFile(content, qrcode.Medium, 256, path); err != nil {
		return "", err
	}
	return path, nil
}
