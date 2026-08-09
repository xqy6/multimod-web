# 多功能 Web 平台前端

## 本地开发

```bash
pnpm install
pnpm dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`，填写 Railway 后端地址：

```text
VITE_NETDISK_URL=https://your-railway-app.up.railway.app
VITE_PROXY_URL=
```

缺少环境变量时应用仍可启动，账号、项目、聊天、素材与排行榜会进入本地演示模式。

## 脚本

- `pnpm dev`：开发服务器
- `pnpm test`：运行测试
- `pnpm lint`：ESLint 检查
- `pnpm build`：类型检查与生产构建
- `pnpm preview`：预览生产构建

## 已交付模块

- M1：品牌首页，MotionSites 深色玻璃拟态视觉
- M2：账号与工作台，Railway 后端登录、注册、项目创建/删除/重命名
- M3：网站生成器，vibe 风格解析、模块选择、图片/文字素材、实时预览与 ZIP 导出
- M4：小游戏中心，2048、贪吃蛇、俄罗斯方块与排行榜
- M5：内置浏览器，多标签、历史、书签、搜索与受限站点提示
- M6：实时聊天室，多房间、消息持久化、在线状态、未读与正在输入
- M7：网盘，百度网盘风格文件管理、回收站与分享
- 增强：PWA、路由懒加载、亮/暗主题、ESLint + Prettier、Toast 与错误边界
