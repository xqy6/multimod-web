# 部署上线指南

当前架构由两部分组成：Cloudflare Pages 托管前端，Railway 运行 Node.js 后端。

## 1. 部署后端到 Railway

1. 打开 [Railway](https://railway.com)，连接本仓库并选择 `server` 目录。
2. 启动命令填 `node src/index.js`，端口保持 `4000`。
3. 为服务挂载持久化卷，挂载点填 `/app/data`，否则容器重建会丢失文件。
4. 部署完成后复制服务公网地址，例如 `https://xxx.up.railway.app`。

## 2. 配置前端环境变量

在 Cloudflare Pages 或构建环境里填写：

```text
VITE_NETDISK_URL=https://你的后端域名
VITE_PROXY_URL=https://你的worker域名（可选）
```

本地开发时复制 `web/.env.example` 为 `web/.env.local`。

## 3. 部署前端到 Cloudflare Pages

1. 在 Cloudflare Pages 创建项目，构建命令填 `pnpm build`，输出目录填 `dist`。
2. 添加 `VITE_NETDISK_URL` 环境变量。
3. `web/public/_worker.js` 已内置 SPA 回退，刷新子路由不会 404。
4. 部署完成后访问 `https://你的项目.pages.dev`。

## 4. 上线检查清单

- [ ] 注册、登录、退出可用
- [ ] 工作台可创建/删除/重命名项目
- [ ] 生成器可上传素材并导出 ZIP
- [ ] 小游戏分数写入排行榜
- [ ] 内置浏览器可打开站点，受限站点有提示
- [ ] 聊天室多房间收发消息、未读和在线状态正常
- [ ] 网盘上传/下载/回收站/分享正常
- [ ] 移动端 390px 无横向滚动
- [ ] `pnpm lint && pnpm test && pnpm build` 通过

## 5. 可选：内置浏览器代理

如果希望内置浏览器打开百度等拒绝嵌入的站点，参考 `proxy/README.md` 部署独立 Worker，然后填写 `VITE_PROXY_URL`。

## 6. 局域网离线聊天

同一 Wi-Fi 下多设备聊天不需要外网，在电脑上执行：

```bash
cd web && pnpm build
cd ../server && pnpm lan
```

其他设备访问终端打印的 `http://局域网IP:4100`，打开“局域网聊天”即可实时收发消息。

也可以直接双击项目根目录的 `start-lan.bat`，脚本会自动安装依赖、构建前端并启动局域网服务。

## 7. CI/CD、外部备份、日志与监控

仓库已内置 3 个 GitHub Actions 工作流：

- `.github/workflows/ci.yml`：每次 push/PR 自动跑前端 lint、test、build 和后端语法检查、全链路 smoke；推送到 `main` 后自动部署 Cloudflare Pages 与 Railway。
- `.github/workflows/backup.yml`：每天 02:30 通过受保护的 `/api/backup/full` 从后端拉取完整数据 zip，再上传到 S3/R2 或 Webhook，并保留最近 14 天备份产物。
- `.github/workflows/monitor.yml`：每 5 分钟探测 `/api/health`，失败时向 `MONITOR_WEBHOOK_URL` 发送告警。

### 需要配置的 GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

```text
CLOUDFLARE_API_TOKEN        # Cloudflare 部署前端
CLOUDFLARE_ACCOUNT_ID       # Cloudflare 账户 ID
RAILWAY_TOKEN               # Railway Project Token（Deploy -> Project Token）
RAILWAY_SERVICE_ID          # Railway 后端服务 ID
BACKUP_TOKEN                # 后端备份令牌，必须与 Railway 里的 BACKUP_TOKEN 一致
MONITOR_WEBHOOK_URL         # 健康告警 webhook（Slack/Discord/Telegram/自建均可）
BACKUP_S3_ENDPOINT          # S3 兼容存储地址，例如 R2 的 S3 API 地址
BACKUP_S3_REGION            # 默认 auto
BACKUP_S3_BUCKET            # 备份桶名
BACKUP_S3_ACCESS_KEY        # 存储访问密钥
BACKUP_S3_SECRET_KEY        # 存储访问密钥
BACKUP_WEBHOOK_URL          # 可选：没有对象存储时，把备份 zip 推送到该地址
BACKUP_SOURCE_URL           # 可选：后端地址，默认 Railway 线上地址
```

同时配置仓库 Variable：

```text
VITE_NETDISK_URL            # 前端连接的后端地址，默认 Railway 线上地址
```

### 服务端运行配置

后端新增以下环境变量，全部可留空：

```text
LOG_DIR=./logs
LOG_LEVEL=info
LOG_WEBHOOK_URL=            # 日志/错误转发 webhook
TELEMETRY_WEBHOOK_URL=      # 独立错误告警 webhook
BACKUP_TOKEN=               # 完整备份下载令牌
BACKUP_S3_ENDPOINT=         # 对象存储备份
BACKUP_S3_BUCKET=
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_WEBHOOK_URL=
BACKUP_KEEP_DAYS=7
```

`/api/health` 已扩展为数据库、对象存储、上传目录、运行时长和版本检查；前端错误会通过 `/api/telemetry` 统一收集，并可选转发到外部告警 webhook。本地手动备份仍可执行 `cd server && pnpm backup`。

### 成本说明

Railway 不是永久免费服务，试用额度用完后会按套餐计费。长期运行建议把 `server/` 部署到自己的 VPS，并把 `VITE_NETDISK_URL` 指向 VPS 域名；监控地址同步修改 `MONITOR_HEALTH_URL`。

管理员密码通过环境变量 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 配置，不要写死在代码里。

## 8. Docker / VPS 一键部署

### Docker

```bash
docker compose up -d --build
```

前端构建、后端运行、数据卷挂载都在容器内完成，默认端口 `4000`。

### VPS 迁移

1. 在 VPS 上安装 Node.js 24、pnpm、rsync，并复制 `deploy/multimod.service` 到 `/etc/systemd/system/`。
2. 创建 `/opt/multimod` 目录，把 `server/` 和 `web/dist/` 放进去。
3. 使用 `deploy/deploy-vps.sh` 一键构建并上传：

```bash
SERVER=root@你的服务器IP bash deploy/deploy-vps.sh
```

4. 用 Caddy 自动申请 HTTPS：把 `deploy/Caddyfile` 里的域名改成你的域名，然后 `caddy start`。

### 监控

- 健康检查地址：`GET /api/health`，可用 UptimeRobot 每 5 分钟探测。
- 定时备份建议：每天执行 `cd server && pnpm backup`，并把 `server/backups/` 同步到另一台机器或对象存储。
