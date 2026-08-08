# 多功能 Web 平台前端

## 本地开发

```bash
pnpm install
pnpm dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 项目地址与匿名 Key。

缺少环境变量时应用仍可启动，账号与工作台会进入本地演示模式，项目保存在浏览器中。

## 初始化 Supabase

1. 在 Supabase 创建项目。
2. 打开 SQL Editor，执行 `supabase/migrations/202608080001_init.sql`。
3. 在项目设置中复制 Project URL 与 anon key，填入 `.env.local`。
4. 重新启动开发服务器，演示模式会自动切换为真实登录。

## 脚本

- `pnpm dev`：开发服务器
- `pnpm test`：运行测试
- `pnpm build`：类型检查与生产构建
- `pnpm preview`：预览生产构建

## 已交付模块

- M0：Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion 工程骨架。
- M1：品牌首页，包含用户视频、CC0 动漫背景素材与完整模块结构。
- M2：Supabase 登录、个人工作台、项目创建/删除/重命名，未配置时自动进入本地演示模式。
- M3：网站生成器，支持 vibe 风格解析、模块选择、图片/文字素材上传、实时预览与 ZIP 导出。
