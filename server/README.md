# Railway 全栈后端

Node.js + Express + SQLite + 对象存储，为网盘、账号、项目、素材、聊天和排行榜提供 API。

## 架构

```text
server/
├─ src/
│  ├─ index.js              # 入口、中间件、错误处理
│  ├─ config.js             # 端口、数据目录、上传限制
│  ├─ db/index.js           # SQLite 表结构与迁移
│  ├─ middleware/auth.js    # Bearer Token 认证
│  ├─ routes/               # 路由层
│  ├─ controllers/          # 控制器层
│  ├─ services/             # 业务逻辑层
│  ├─ repositories/         # 数据访问层
│  └─ utils/                # 工具
├─ scripts/smoke.mjs        # 全链路冒烟测试
└─ data/                    # SQLite、对象存储、临时上传
```

## 启动

```bash
cd server
pnpm install
pnpm start
```

默认运行在 `http://localhost:4000`。

## API 摘要

### 认证与资料

```text
POST /api/auth/register  { "email": "a@b.com", "password": "123456", "displayName": "昵称" }
POST /api/auth/login     { "email": "a@b.com", "password": "123456" }
GET  /api/auth/me
POST /api/auth/logout
PUT  /api/profile        { "displayName": "新昵称" }
POST /api/profile/avatar multipart: file
GET  /api/profile/:userId/avatar
```

### 项目与素材

```text
GET/POST /api/projects
GET/PATCH/DELETE /api/projects/:id
GET/POST /api/projects/:projectId/assets/text
POST /api/projects/:projectId/assets/image multipart: file
DELETE /api/assets/:id
GET /api/assets/:id/content
```

### 聊天

```text
GET/POST /api/rooms
POST /api/rooms/:roomId/join|leave|read|typing
GET /api/rooms/:roomId/members|messages
POST /api/rooms/:roomId/messages
DELETE /api/messages/:messageId
GET /api/rooms/:roomId/events
GET /api/unread
```

### 局域网聊天

```text
GET  /lan/health
GET  /lan/rooms
POST /lan/rooms { "name": "客厅" }
GET  /lan/rooms/:roomId/messages
POST /lan/rooms/:roomId/messages { "nickname": "小明", "body": "你好" }
GET  /lan/rooms/:roomId/events
```

本地启动：

```bash
cd web && pnpm build
cd ../server && pnpm lan
```

同一 Wi-Fi 下的设备访问终端打印的 `http://局域网IP:4100` 即可实时聊天。

### 排行榜

```text
GET /api/scores/leaderboard?game_id=2048
GET /api/scores/best?game_id=2048
POST /api/scores { "game_id": "2048", "score": 100 }
```

### 网盘

文件管理、分片上传、回收站、分享等接口保持原有结构，详细说明见旧版接口清单。

## 测试

```bash
$env:SMOKE_BASE="http://127.0.0.1:4000"
node scripts/smoke.mjs
```

## 备份

```bash
pnpm backup
```

脚本会把 `data/` 复制到 `backups/时间戳/`，并支持：

- S3 兼容对象存储（Cloudflare R2、AWS S3、MinIO）：配置 `BACKUP_S3_ENDPOINT`、`BACKUP_S3_BUCKET`、`BACKUP_S3_ACCESS_KEY`、`BACKUP_S3_SECRET_KEY`。
- Webhook 推送：配置 `BACKUP_WEBHOOK_URL`，脚本会把备份打成 zip 推送过去。
- 自动清理：`BACKUP_KEEP_DAYS` 默认保留 7 天。

建议配合 Railway Volume 一起使用；GitHub Actions 的 `backup.yml` 会通过 `GET /api/backup/full`（需配置 `BACKUP_TOKEN`，Bearer 认证）拉取服务器完整数据并上传到 S3/R2 或 Webhook。

## 日志、健康检查与监控

- 每个请求会输出结构化 JSON 日志到 `logs/server.log`；配置 `LOG_WEBHOOK_URL` 可把日志/错误转发到 Slack、Telegram 等 webhook。
- `GET /api/health` 返回数据库、对象存储、上传目录、运行时长和版本状态。
- 前端错误通过 `POST /api/telemetry` 统一收集，可配置 `TELEMETRY_WEBHOOK_URL` 单独告警。
- 仓库 `.github/workflows/monitor.yml` 每 5 分钟探测健康地址，故障/恢复时通过 `MONITOR_WEBHOOK_URL` 告警。

## 安全

- 登录/注册接口有频率限制
- 连续登录失败 5 次会锁定 15 分钟
- 管理员账号密码通过 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 环境变量配置
