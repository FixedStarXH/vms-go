package scheduler

import (
	"log"
	"time"

	"gorm.io/gorm"

	"ers-go/cache"
	"ers-go/config"
	"ers-go/model"
	"ers-go/service"
)

// Start 启动爽约检测定时任务：将过期未核销的入校记录标记为爽约，并按规则自动拉黑
func Start(db *gorm.DB, rc *cache.RedisCache, cfg *config.Config, vs *service.VisitorService) {
	interval := time.Duration(cfg.App.NoShowCheckMinutes) * time.Minute
	go func() {
		// 启动后先执行一次，再按间隔轮询
		runOnce(db, vs)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			runOnce(db, vs)
		}
	}()
	log.Printf("[scheduler] 爽约检测已启动，扫描间隔 %v", interval)
}

func runOnce(db *gorm.DB, vs *service.VisitorService) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[scheduler] 爽约扫描异常: %v", r)
		}
	}()
	today := time.Now().Format("2006-01-02")
	// 待入校（未核销）且预约日期已过 → 爽约
	var records []model.EntryRecord
	if err := db.Where("record_status = ? AND entry_date < ?", model.RecStatusWaiting, today).Find(&records).Error; err != nil {
		log.Printf("[scheduler] 查询过期记录失败: %v", err)
		return
	}
	if len(records) == 0 {
		return
	}
	now := time.Now()
	for i := range records {
		rec := &records[i]
		blacklisted, err := vs.MarkNoShow(rec, now)
		if err != nil {
			log.Printf("[scheduler] 标记爽约失败 record=%s: %v", rec.RecordNo, err)
			continue
		}
		if blacklisted {
			log.Printf("[scheduler] 访客#%d 爽约超限，已自动拉黑", rec.VisitorID)
		}
	}
	log.Printf("[scheduler] 本次扫描标记 %d 条爽约", len(records))
}
