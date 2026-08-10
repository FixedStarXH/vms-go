package service

import (
	"strings"
	"time"

	"github.com/mojocn/base64Captcha"

	"ers-go/cache"
	"ers-go/config"
)

// redisCaptchaStore 验证码 Redis 存储（实现 base64Captcha.Store 接口）
// key: ers:captcha:{uuid}，5 分钟有效，校验一次即失效（防重放）
type redisCaptchaStore struct {
	rc  *cache.RedisCache
	ttl time.Duration
}

func (s *redisCaptchaStore) Set(id, value string) error {
	return s.rc.Set("ers:captcha:"+id, value, s.ttl)
}

func (s *redisCaptchaStore) Get(id string, clear bool) string {
	key := "ers:captcha:" + id
	v, err := s.rc.Get(key)
	if err != nil {
		return ""
	}
	if clear {
		_ = s.rc.Del(key)
	}
	return v
}

func (s *redisCaptchaStore) Verify(id, answer string, clear bool) bool {
	return strings.EqualFold(s.Get(id, clear), answer)
}

// CaptchaService 图形验证码：生成 + 校验
// 依赖 base64Captcha（DigitDriver 生成纯数字验证码，干扰线防 OCR）
type CaptchaService struct {
	engine *base64Captcha.Captcha
}

func NewCaptchaService(rc *cache.RedisCache, cfg *config.Config) *CaptchaService {
	driver := base64Captcha.NewDriverDigit(cfg.App.CaptchaHeight, cfg.App.CaptchaWidth, cfg.App.CaptchaLen, 0.7, 80)
	store := &redisCaptchaStore{rc: rc, ttl: 5 * time.Minute}
	return &CaptchaService{engine: base64Captcha.NewCaptcha(driver, store)}
}

// Generate 生成验证码，返回 uuid 与 dataURL 图片（data:image/png;base64,...）
func (s *CaptchaService) Generate() (string, string, error) {
	id, b64, _, err := s.engine.Generate()
	return id, b64, err
}

// Verify 校验验证码（校验后立即失效）
func (s *CaptchaService) Verify(uuid, code string) bool {
	if uuid == "" || code == "" {
		return false
	}
	return s.engine.Verify(uuid, code, true)
}
