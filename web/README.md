# 多功能 Web 平台前端

## 本地开发

```bash
pnpm install
pnpm dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`，填入 Supabase 项目地址与匿名 Key。

缺少环境变量时应用仍可启动，但数据相关功能会显示配置提示。

## 脚本

- `pnpm dev`：开发服务器
- `pnpm test`：运行测试
- `pnpm build`：类型检查与生产构建
- `pnpm preview`：预览生产构建
