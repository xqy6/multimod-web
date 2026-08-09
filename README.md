# 多功能 Web 平台

一个集 AI 建站生成、休闲小游戏中心、内置浏览器、实时聊天室、网盘于一体的多功能 Web 平台。

## 模块

- M1 品牌首页：MotionSites 深色玻璃拟态视觉
- M2 账号与工作台：Railway 登录、注册、项目创建/删除/重命名
- M3 网站生成器：vibe 风格解析、模块选择、素材上传、实时预览、ZIP 导出
- M4 小游戏中心：2048、贪吃蛇、俄罗斯方块与排行榜
- M5 内置浏览器：多标签、历史、书签、搜索、受限站点提示
- M6 聊天室：多房间、实时消息、在线状态、未读与正在输入
- M7 网盘：百度网盘风格文件管理、回收站、分享

## 技术栈

- 前端：React + Vite + TypeScript + Tailwind CSS v4 + Framer Motion
- 后端：Node.js + Express + SQLite + 对象存储
- 托管：Cloudflare Pages + Railway

## 快速开始

```bash
cd web
pnpm install
pnpm dev
```

访问 `http://127.0.0.1:5173/`。未配置 Railway 后端时，应用使用本地演示模式。

## 目录

```text
web/            React + Vite + TypeScript 前端
server/         百度网盘式后端（SQLite + 对象存储去重 + 分片上传 + 回收站）
supabase/       Supabase 迁移与说明（旧方案，已由 Railway 后端替代）
proxy/          Cloudflare Worker 代理参考
docs/           设计文档、计划、部署文档
.github/        CI 工作流
```

完整上线步骤见 `docs/DEPLOYMENT.md`。
