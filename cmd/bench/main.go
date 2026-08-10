// 抢名额并发压测工具
//
// 用法（在 ers-go 根目录执行）：
//
//	go run ./cmd/bench              # 完整压测：造账号 → 并发抢名额 → 输出报告
//	go run ./cmd/bench -n 500       # 指定并发账号数（默认 200）
//	go run ./cmd/bench -slot 2      # 指定时段（默认 1 上午 08:00-12:00）
//	go run ./cmd/bench -clean       # 清理压测产生的账号与申请数据
//
// 原理：名额抢占走 Redis Lua 原子 INCR（reserveLua），超限回退并返回"名额已满"。
// 压测通过 N 个不同访客账号同时提交申请，验证：
//  1. 成功率是否恰好等于时段名额上限（0 超卖）
//  2. 并发吞吐 QPS
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"ers-go/config"
	"ers-go/model"
	"ers-go/utils"
)

const benchPrefix = "bench_"

func main() {
	clean := flag.Bool("clean", false, "清理压测产生的数据")
	n := flag.Int("n", 200, "并发访客账号数")
	slotID := flag.Uint("slot", 1, "时段 slot_id（1上午 2下午）")
	base := flag.String("base", "http://127.0.0.1:8081", "后端地址")
	flag.Parse()

	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}
	db, err := gorm.Open(mysql.Open(cfg.MySQL.DSN), &gorm.Config{})
	if err != nil {
		log.Fatalf("连接数据库失败: %v", err)
	}

	if *clean {
		doClean(db, cfg, *slotID)
		return
	}
	runBench(db, cfg, *base, *n, *slotID)
}

// runBench 完整压测流程
func runBench(db *gorm.DB, cfg *config.Config, base string, n int, slotID uint) {
	// 1. 时段信息（名额上限）
	var slot model.TimeSlot
	if err := db.First(&slot, slotID).Error; err != nil {
		log.Fatalf("时段 %d 不存在: %v", slotID, err)
	}

	// 2. 幂等：清理上次压测残留
	cleanBenchData(db)

	// 3. 造 n 个访客账号（并行 bcrypt 加速）
	users := createBenchUsers(db, n)
	tokens := make([]string, n)
	for i, u := range users {
		tok, _, err := utils.GenerateAccessToken(u.UserID, utils.UserTypeVisitor, cfg.JWT.Secret, cfg.JWT.AccessExpireHours)
		if err != nil {
			log.Fatalf("生成 token 失败: %v", err)
		}
		tokens[i] = tok
	}

	// 4. 重置名额计数（保证从 0 开始，结果可精确判定）
	date := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	resetQuota(db, cfg, slotID, date)

	// 5. 并发抢名额
	fmt.Printf("===== 抢名额并发压测 =====\n")
	fmt.Printf("接口: POST %s/api/application/submit\n", base)
	fmt.Printf("时段: %s %s-%s (slot_id=%d)  名额上限: %d\n", slot.SlotName, slot.StartTime, slot.EndTime, slot.SlotID, slot.MaxCount)
	fmt.Printf("预约日期: %s   并发账号: %d\n", date, n)

	results, elapsed := concurrentSubmit(base, date, slotID, users, tokens)

	// 6. 统计
	ok, fail := 0, 0
	msgCount := map[string]int{}
	for _, r := range results {
		if r.ok {
			ok++
		} else {
			fail++
			msgCount[r.msg]++
		}
	}

	fmt.Printf("\n----- 压测结果 -----\n")
	fmt.Printf("总请求: %d   成功: %d (%.1f%%)   失败: %d\n", n, ok, float64(ok)/float64(n)*100, n-ok)
	for msg, c := range msgCount {
		fmt.Printf("  失败原因[%s]: %d\n", msg, c)
	}
	fmt.Printf("总耗时: %s\n", elapsed.Round(time.Millisecond))
	fmt.Printf("QPS: %.1f req/s\n", float64(ok)/elapsed.Seconds())

	// 7. 超卖判定
	fmt.Printf("\n----- 超卖检查 -----\n")
	if ok == slot.MaxCount {
		fmt.Printf("PASS: 成功数 %d == 名额上限 %d，0 超卖 ✓\n", ok, slot.MaxCount)
	} else if ok < slot.MaxCount {
		fmt.Printf("PASS: 成功数 %d < 名额上限 %d，无超卖（未抢满，可能受请求耗时影响）✓\n", ok, slot.MaxCount)
	} else {
		fmt.Printf("FAIL: 成功数 %d > 名额上限 %d，发生超卖 ✗\n", ok, slot.MaxCount)
	}

	fmt.Printf("\n压测数据已产生，清理命令: go run ./cmd/bench -clean\n")
}

// concurrentSubmit 所有账号同时发起请求，返回结果与整个并发窗口耗时
func concurrentSubmit(base, date string, slotID uint, users []model.User, tokens []string) ([]submitResult, time.Duration) {
	n := len(users)
	client := &http.Client{Timeout: 30 * time.Second}
	start := make(chan struct{})
	results := make([]submitResult, n)
	var wg sync.WaitGroup
	t0 := time.Now()

	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			payload := map[string]any{
				"visitorName":    users[i].Username,
				"phone":          users[i].Mobile,
				"entryDate":      date,
				"slotId":         slotID,
				"visitUnit":      "压测单位",
				"reason":         "并发压测",
				"companionCount": 0,
			}
			body, _ := json.Marshal(payload)
			req, err := http.NewRequest("POST", base+"/api/application/submit", bytes.NewReader(body))
			if err != nil {
				results[i] = submitResult{ok: false, msg: "构造请求失败"}
				return
			}
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+tokens[i])
			resp, err := client.Do(req)
			if err != nil {
				results[i] = submitResult{ok: false, msg: "请求错误: " + err.Error()}
				return
			}
			defer resp.Body.Close()
			var out struct {
				Code int    `json:"code"`
				Msg  string `json:"msg"`
			}
			_ = json.NewDecoder(resp.Body).Decode(&out)
			results[i] = submitResult{ok: out.Code == 0, msg: out.Msg}
		}(i)
	}
	close(start) // 同时开跑
	wg.Wait()
	return results, time.Since(t0)
}

type submitResult struct {
	ok  bool
	msg string
}

// createBenchUsers 创建 n 个访客账号（手机号唯一，密码 bench123）
func createBenchUsers(db *gorm.DB, n int) []model.User {
	now := time.Now()
	hashes := make([]string, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			h, _ := bcrypt.GenerateFromPassword([]byte("bench123"), bcrypt.DefaultCost)
			hashes[i] = string(h)
		}(i)
	}
	wg.Wait()

	users := make([]model.User, n)
	for i := 0; i < n; i++ {
		users[i] = model.User{
			Username:     fmt.Sprintf("%s%03d", benchPrefix, i),
			Password:     hashes[i],
			Mobile:       genUniqueMobile(db),
			Status:       1,
			RegisterTime: now,
			CreateTime:   now,
		}
		if err := db.Create(&users[i]).Error; err != nil {
			log.Fatalf("创建压测账号失败 %s: %v", users[i].Username, err)
		}
	}
	log.Printf("已创建 %d 个压测访客账号 (%s000 ~ %s%03d)", n, benchPrefix, benchPrefix, n-1)
	return users
}

// genUniqueMobile 生成不重复的 11 位手机号
func genUniqueMobile(db *gorm.DB) string {
	for {
		m := fmt.Sprintf("13%09d", rand.Intn(1000000000))
		var c int64
		db.Model(&model.User{}).Where("mobile = ?", m).Count(&c)
		if c == 0 {
			return m
		}
	}
}

// resetQuota 重置时段名额计数：Redis 计数删除 + DB current_count 归零
func resetQuota(db *gorm.DB, cfg *config.Config, slotID uint, date string) {
	rc := redis.NewClient(&redis.Options{Addr: cfg.Redis.Addr, Password: cfg.Redis.Password, DB: cfg.Redis.DB})
	defer rc.Close()
	ctx := db.Statement.Context
	key := fmt.Sprintf("ers:slot:count:%d:%s", slotID, date)
	if err := rc.Del(ctx, key).Err(); err == nil {
		log.Printf("已重置 Redis 计数: %s", key)
	}
	if err := db.Model(&model.TimeSlot{}).Where("slot_id = ?", slotID).
		Update("current_count", 0).Error; err != nil {
		log.Printf("[warn] 重置 DB 计数失败: %v", err)
	}
}

// cleanBenchData 删除压测账号及其申请/日志
func cleanBenchData(db *gorm.DB) {
	db.Exec("DELETE FROM ers_application_log WHERE application_id IN (SELECT application_id FROM ers_entry_application WHERE visitor_id IN (SELECT user_id FROM ers_user WHERE username LIKE 'bench\\_%'))")
	db.Exec("DELETE FROM ers_entry_application WHERE visitor_id IN (SELECT user_id FROM ers_user WHERE username LIKE 'bench\\_%')")
	db.Exec("DELETE FROM ers_user WHERE username LIKE 'bench\\_%'")
}

// doClean 清理压测数据并恢复计数
func doClean(db *gorm.DB, cfg *config.Config, slotID uint) {
	cleanBenchData(db)
	if err := db.Model(&model.TimeSlot{}).Where("slot_id = ?", slotID).
		Update("current_count", 0).Error; err != nil {
		log.Printf("[warn] 恢复 DB 计数失败: %v", err)
	}
	rc := redis.NewClient(&redis.Options{Addr: cfg.Redis.Addr, Password: cfg.Redis.Password, DB: cfg.Redis.DB})
	defer rc.Close()
	ctx := db.Statement.Context
	iter := rc.Scan(ctx, 0, "ers:slot:count:*", 100).Iterator()
	for iter.Next(ctx) {
		rc.Del(ctx, iter.Val())
	}
	if err := iter.Err(); err != nil {
		log.Printf("[warn] 清理 Redis 计数失败: %v", err)
	}
	fmt.Println("清理完成：压测账号、申请记录已删除，时段名额计数已恢复")
}
