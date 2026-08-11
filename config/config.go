package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Config 应用配置
type Config struct {
	Server ServerConfig
	MySQL  MySQLConfig
	Redis  RedisConfig
	JWT    JWTConfig
	App    AppConfig
}

type ServerConfig struct {
	Port int
	Mode string
}

type MySQLConfig struct {
	DSN string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret            string
	AccessExpireHours int
	RefreshExpireDays int
}

type AppConfig struct {
	QRDir               string
	QRSecret            string
	UploadDir           string // 上传文件根目录（静态资源挂载点）
	NoShowCheckMinutes  int
	NoShowMaxCount      int // 爽约次数达到该值自动拉黑
	NoShowBlacklistDays int // 自动拉黑天数
	CaptchaWidth        int // 图形验证码宽度
	CaptchaHeight       int // 图形验证码高度
	CaptchaLen          int // 验证码位数
}

// Load 从 config.yaml 加载配置，支持环境变量覆盖
func Load(path string) (*Config, error) {
	v := viper.New()
	v.SetConfigFile(path)
	if err := v.ReadInConfig(); err != nil {
		if _, statErr := os.Stat(path); os.IsNotExist(statErr) {
			// 允许无配置文件启动（全部走默认/环境变量）
			v.Set("server.port", 8081)
			v.Set("server.mode", "debug")
		} else {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
	}
	// 环境变量覆盖：ERS_ 前缀 + 点号转下划线（ERS_MYSQL_DSN → mysql.dsn）。
	// 必须配 SetEnvKeyReplacer，否则 AutomaticEnv 查的是 "ERS_JWT.SECRET"（含点号），
	// 环境变量名不允许点号，永远匹配不到。
	v.SetEnvPrefix("ERS")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	cfg := &Config{
		Server: ServerConfig{Port: v.GetInt("server.port"), Mode: v.GetString("server.mode")},
		MySQL:  MySQLConfig{DSN: v.GetString("mysql.dsn")},
		Redis:  RedisConfig{Addr: v.GetString("redis.addr"), Password: v.GetString("redis.password"), DB: v.GetInt("redis.db")},
		JWT: JWTConfig{
			Secret:            v.GetString("jwt.secret"),
			AccessExpireHours: v.GetInt("jwt.access_expire_hours"),
			RefreshExpireDays: v.GetInt("jwt.refresh_expire_days"),
		},
		App: AppConfig{
			QRDir:               v.GetString("app.qr_dir"),
			QRSecret:            v.GetString("app.qr_secret"),
			UploadDir:           v.GetString("app.upload_dir"),
			NoShowCheckMinutes:  v.GetInt("app.no_show_check_minutes"),
			NoShowMaxCount:      v.GetInt("app.no_show.max_count"),
			NoShowBlacklistDays: v.GetInt("app.no_show.blacklist_days"),
			CaptchaWidth:        v.GetInt("app.captcha_width"),
			CaptchaHeight:       v.GetInt("app.captcha_height"),
			CaptchaLen:          v.GetInt("app.captcha_len"),
		},
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8081
	}
	if cfg.App.UploadDir == "" {
		cfg.App.UploadDir = "uploads"
	}
	if cfg.App.CaptchaWidth <= 0 {
		cfg.App.CaptchaWidth = 150
	}
	if cfg.App.CaptchaHeight <= 0 {
		cfg.App.CaptchaHeight = 44
	}
	if cfg.App.CaptchaLen <= 0 {
		cfg.App.CaptchaLen = 4
	}
	if cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("缺少 jwt.secret 配置（或 ERS_JWT_SECRET 环境变量）")
	}
	if cfg.App.NoShowCheckMinutes <= 0 {
		cfg.App.NoShowCheckMinutes = 10
	}
	if cfg.App.NoShowMaxCount <= 0 {
		cfg.App.NoShowMaxCount = 3
	}
	if cfg.App.NoShowBlacklistDays <= 0 {
		cfg.App.NoShowBlacklistDays = 30
	}
	return cfg, nil
}
