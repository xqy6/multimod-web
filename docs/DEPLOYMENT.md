# 部署上线指南

## 前置准备

- Vercel 账号
- Supabase 账号
- 一个域名（可选，MVP 可用 Vercel 免费二级域名）

## 1. 初始化 Supabase

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/migrations/202608080001_init.sql`。
3. 开启邮箱登录与魔法链接。
4. 复制 Project URL 与 anon key。

## 2. 部署前端到 Vercel

1. 把本仓库导入 Vercel。
2. 根目录选择 `web`。
3. 框架预设选择 Vite。
4. 构建命令 `pnpm build`，输出目录 `dist`。
5. 添加环境变量：

```text
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_ANON_KEY=你的 anon key
```

6. 点击 Deploy。

`web/vercel.json` 已配置 SPA rewrite，前端路由刷新不会 404。

## 3. 绑定域名（可选）

在 Vercel 项目 Settings > Domains 中添加域名，并按提示配置 DNS。

## 4. 上线检查清单

- [ ] 首页视频可播放，图片全部加载
- [ ] 登录、注册、魔法链接可用
- [ ] 工作台可创建/删除项目
- [ ] 生成器可导出 ZIP
- [ ] 三款小游戏可玩，分数写入排行榜
- [ ] 内置浏览器可打开站点，受限提示正常
- [ ] 聊天室可多房间收发消息，在线状态正常
- [ ] 移动端 390px 无横向滚动
- [ ] 生产构建通过：`pnpm build`
- [ ] CI 通过：`pnpm test && pnpm build`
