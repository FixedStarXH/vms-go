# 校园入校登记系统 ERS-Go（Go 版）

> 基于 **Go + Gin + GORM + MySQL + Redis** 的校园访客入校登记系统。
> 原 Java（Spring Boot）版核心业务用 Go 重写，聚焦**并发抢名额、防伪二维码、核销幂等、爽约自动拉黑**四大深度点。
> 面向简历的完整工程化实践，独立开发。

![Go](https://img.shields.io/badge/Go-1.26-00ADD8?style=flat&logo=go)
![Gin](https://img.shields.io/badge/Gin-v1.12-7F52FF?style=flat)
![GORM](https://img.shields.io/badge/GORM-v1.31-8C1A6A?style=flat)
![Redis](https://img.shields.io/badge/Redis-v9-DC382D?style=flat&logo=redis)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ 功能特性

### 访客端
- 注册 / 登录 / 登出（JWT 双 token + Redis 黑名单吊销）、个人信息维护、修改密码
- 入校申请：未来 7 天日期校验、同时段去重、**名额抢占（防超卖）**、申请取消（释放名额）
- 我的申请列表 / 详情 / 流转时间线（日志）
- 个人看板统计、入校日历（整月填充，含已申请/已入校/已爽约标记）

### 管理端
- 登录（管理员独立账号体系）、审批通过 / 拒绝、**批量审批/批量拒绝（逐条失败隔离）**
- 审批通过自动生成**HMAC 防伪签名二维码**（可扫码核销）
- 今日入校概览、申请列表（关键词 / 状态 / 日期范围筛选）、申请详情
- 访客列表 / 黑名单管理（手动拉黑、移出、自动拉黑）
- **扫码核销**：二维码验签 → 幂等锁 → 状态机（待入校 → 已入校 → 已离校）

### 核心深度点
- **并发抢名额**：Redis Lua 脚本原子 INCR 计数，超限自动回退，防超卖；Redis 不可用时自动降级 DB 悲观锁
- **防伪二维码**：内容 = `ERS|记录编号|访客ID|日期|HMAC签名`，扫码验签，篡改/伪造直接拒绝
- **核销幂等**：`SETNX` 分布式锁 + 状态机流转，同一二维码重复扫码按状态机正常推进，杜绝重复入校
- **爽约自动拉黑**：goroutine + ticker 定时扫描过期未入校记录 → 标记爽约 → 累计 3 次自动拉黑 30 天，全程落日志

## 🏗️ 技术架构

```
Controller(HTTP)  →  Service(业务)  →  GORM → MySQL
                        ↘             ↘
                     Model(实体+状态机)  cache(Redis：抢名额 Lua / 幂等锁 / 黑名单 / 序列)
```

- **分层架构**：Controller / Service / Model / Cache / Router 五层 + 构造函数注入（Deps 容器）
- **并发控制**：Redis Lua 原子 INCR 抢名额（首键自动过期）→ 超限 Decr 回退 → DB 悲观锁降级链
- **安全设计**：JWT 双 token（access 2h + refresh 7d）、Redis 黑名单登出即失效、HMAC 签名防伪、BCrypt 密码哈希
- **状态机**：申请 6 态（待审批/已通过/已拒绝/已取消/已爽约/已完成）、入校记录 5 态（待入校/已入校/已过期/已爽约/已离校）
- **定时任务**：scheduler 启动即扫描 + 轮询，爽约检测与自动拉黑无需人工干预
- **统一响应**：`{ code, msg, data }`，与前端 axios 拦截器契约对齐

## 📂 目录结构

```
ers-go/
├── main.go              入口（组装依赖 → 建表 → 定时任务 → HTTP）
├── config.yaml          本地配置（已 gitignore，不入库）
├── config.example.yaml  脱敏配置模板
├── config/              配置加载（Viper + ERS_ 环境变量覆盖）
├── model/               数据模型 + 状态常量 + 建表 + 种子数据
├── service/             业务层（认证 / 申请 / 审批 / 核销 / 黑名单 / 看板）
├── controller/          HTTP 层（参数解析 + 响应包装）
├── middleware/          中间件（JWT 鉴权 / 管理员校验 / CORS）
├── cache/               Redis 封装（Lua 脚本 / SetNX / 序列）
├── scheduler/           爽约检测定时任务
├── router/              路由注册
├── utils/               工具（响应 / JWT / 密码 / 时间）
└── uploads/             二维码图片（运行时生成，gitignore）
```

## 🚀 快速启动

### 环境要求
- Go 1.26+
- MySQL 8.0+
- Redis 7+（抢名额 / 幂等锁 / 黑名单；**连接失败自动降级运行**，不影响主流程）

### 步骤

```bash
# 1. 克隆项目
git clone <repo-url>
cd ers-go

# 2. 配置数据库与 Redis
cp config.example.yaml config.yaml
# 编辑 config.yaml，填入 MySQL DSN、Redis 地址、JWT/二维码密钥

# 3. 启动（自动建表 + 种子数据）
go run .

# 4. 访问
# 后端 API: http://localhost:8081/api/...
# 管理端 API: http://localhost:8081/admin/...
```

### 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| （注册） | 自定义 | 访客 |

> 启动时自动写入管理员与默认入校时段，详情见 `model/init.go`。

## 🧪 测试与质量

```bash
go vet ./...        # 静态检查
go test ./...       # 单元测试（37 用例）
gofmt -l .          # 格式检查
```

> 测试覆盖：JWT 签发/防篡改/过期、BCrypt 哈希、HMAC 二维码签名全链路（篡改/伪造/错密钥/畸形输入）、申请编号并发唯一性（原子序列）、时间拼接、请求字段兼容、状态映射完整性。纯函数测试，无外部依赖。

## 🔧 依赖管理

- 使用 Go Modules，依赖见 `go.mod`
- 核心依赖：Gin（Web）、GORM（ORM）、go-redis（Redis + Lua）、golang-jwt（JWT）、x/crypto（BCrypt）、skip2/go-qrcode（二维码）、Viper（配置）

## 🛡️ 安全设计

- **JWT 双 token**：access(2h) 业务鉴权 + refresh(7d) 换新，`token_type` 隔离；登出将 token 写入 Redis 黑名单立即失效
- **HMAC 防伪二维码**：服务端私钥签名，扫码验签，篡改日期/编号/伪造签名均拒绝
- **抢名额防超卖**：Redis Lua 原子操作（INCR + 过期 + 超限判断）单脚本完成，杜绝竞态
- **核销幂等**：`SETNX` 分布式锁（10s 自动释放）+ 状态机，重复扫码安全推进
- 密码 BCrypt 哈希存储；管理员与访客账号体系分离（`RequireAdmin` 中间件）
- SQL 全参数化（GORM），杜绝注入
- 敏感配置不入库（`.gitignore` 排除 config.yaml），密钥支持环境变量注入（`ERS_*`）

## 📄 License

MIT
