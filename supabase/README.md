# Supabase 配置

## 1. 创建项目

在 Supabase 创建一个新项目。

## 2. 执行迁移

打开 SQL Editor，执行：

```text
migrations/202608080001_init.sql
```

迁移会创建 `profiles`、`projects`、`assets`、`rooms`、`room_members`、`messages`、`generated_sites`、`scores` 表，并配置 RLS、存储桶与实时发布。

## 3. 启用认证

- Authentication > Providers > Email，确认已开启。
- 可同时开启邮箱魔法链接登录。

## 4. 前端环境变量

在 `web/.env.local` 中填写：

```text
VITE_SUPABASE_URL=你的项目地址
VITE_SUPABASE_ANON_KEY=你的匿名 Key
```

填写后重启开发服务器，应用会从本地演示模式切换到真实后端。
