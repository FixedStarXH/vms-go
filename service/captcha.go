package service

import (
	"strings"
	"sync"
	"time"

	"github.com/mojocn/base64Captcha"

	"ers-go/cache"
	"ers-go/config"
)

// captchaStore 验证码存储（实现 base64Captcha.Store 接口）
// 双后端：Redis 可用时存 Redis（key: ers:captcha:{uuid}，5 分钟有效，校验一次即失效防重放）；
// Redis 不可用（main 里连接失败将 rc 置为 nil）时降级进程内存，保证登录链路不因缓存故障挂掉。
type captchaStore struct {
	rc  *cache.RedisCache
	ttl time.Duration

	mu    sync.Mutex
	items map[string]memCaptchaItem
}

type memCaptchaItem struct {
	value string
	exp   time.Time
}

func newCaptchaStore(rc *cache.RedisCache, ttl time.Duration) *captchaStore {
	return &captchaStore{rc: rc, ttl: ttl, items: map[string]memCaptchaItem{}}
}

func (s *captchaStore) Set(id, value string) error {
	if s.rc != nil {
		return s.rc.Set("ers:captcha:"+id, value, s.ttl)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[id] = memCaptchaItem{value: value, exp: time.Now().Add(s.ttl)}
	return nil
}

func (s *captchaStore) Get(id string, clear bool) string {
	if s.rc != nil {
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
	s.mu.Lock()
	defer s.mu.Unlock()
	it, ok := s.items[id]
	if !ok {
		return ""
	}
	if time.Now().After(it.exp) {
		delete(s.items, id) // 过期清理，避免内存无限增长
		return ""
	}
	if clear {
		delete(s.items, id)
	}
	return it.value
}

func (s *captchaStore) Verify(id, answer string, clear bool) bool {
	return strings.EqualFold(s.Get(id, clear), answer)
}

// CaptchaService 图形验证码：生成 + 校验
// 依赖 base64Captcha（DigitDriver 生成纯数字验证码，干扰线防 OCR）
type CaptchaService struct {
	engine *base64Captcha.Captcha
}

func NewCaptchaService(rc *cache.RedisCache, cfg *config.Config) *CaptchaService {
	driver := base64Captcha.NewDriverDigit(cfg.App.CaptchaHeight, cfg.App.CaptchaWidth, cfg.App.CaptchaLen, 0.7, 80)
	store := newCaptchaStore(rc, 5*time.Minute)
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
