package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/controller"
	"ers-go/model"
	"ers-go/router"
	"ers-go/scheduler"
	"ers-go/service"
)

func main() {
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 数据库
	db, err := gorm.Open(mysql.Open(cfg.MySQL.DSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}
	// 连接池调优：限制最大连接数避免打爆 MySQL（max_connections 默认 151）
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("获取底层连接池失败: %v", err)
	}
	sqlDB.SetMaxOpenConns(80)                  // 最大打开连接（留出余量给管理端/压测）
	sqlDB.SetMaxIdleConns(20)                  // 最大空闲连接
	sqlDB.SetConnMaxLifetime(30 * time.Minute) // 连接最长存活，避免长时间占用
	if err := model.AutoMigrate(db); err != nil {
		log.Fatalf("初始化表结构失败: %v", err)
	}
	log.Println("数据库初始化完成")

	// Redis（连接失败仅降级：黑名单校验跳过、名额抢占走 DB 悲观锁、序列走时间戳）
	rc, err := cache.New(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB)
	if err != nil {
		log.Printf("[warn] Redis 连接失败，将降级运行: %v", err)
		rc = nil
	}

	// 组装服务
	authSvc := service.NewAuthService(db, rc, cfg)
	captchaSvc := service.NewCaptchaService(rc, cfg)
	appSvc := service.NewApplicationService(db, rc, cfg)
	approvalSvc := service.NewApprovalService(db, rc, cfg, appSvc)
	recordSvc := service.NewRecordService(db, rc, cfg)
	visitorSvc := service.NewVisitorService(db, rc, cfg)
	managerSvc := service.NewManagerService(db, cfg)
	dashSvc := service.NewDashboardService(db)

	deps := &controller.Deps{
		Auth: authSvc, Captcha: captchaSvc, Apps: appSvc, Approval: approvalSvc,
		Record: recordSvc, Visitor: visitorSvc, Manager: managerSvc, Dashboard: dashSvc,
	}

	// 启动爽约检测定时任务
	scheduler.Start(db, rc, cfg, visitorSvc)

	// HTTP 服务
	gin.SetMode(cfg.Server.Mode)
	r := gin.New()
	router.Setup(r, deps, rc, cfg)
	log.Printf("ERS-Go 服务已启动: http://127.0.0.1:%d", cfg.Server.Port)
	if err := r.Run(fmt.Sprintf(":%d", cfg.Server.Port)); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
