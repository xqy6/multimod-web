# Cloudflare Worker 代理

这个目录包含可选的浏览器代理 Worker，用于让内置浏览器打开部分拒绝 iframe 嵌入的站点。

## 部署

1. 登录 Cloudflare Dashboard，进入 Workers & Pages。
2. 创建 Worker，名称随意，例如 `multimod-proxy`。
3. 将 `worker.js` 的内容粘贴到 Worker 编辑器并保存。
4. 部署后得到类似 `https://multimod-proxy.workers.dev` 的地址。
5. 在 `web/.env.local` 中添加：

```text
VITE_PROXY_URL=https://multimod-proxy.workers.dev
```

## 能力与限制

- 会移除 `X-Frame-Options`、`Content-Security-Policy` 等嵌入限制。
- 会改写页面里的 `href`、`src`、`action` 链接，让后续跳转继续走代理。
- 适合百度、新闻站、文档站等相对静态的网页。
- 抖音这类重度依赖登录、Cookie 和动态脚本的站点，代理只能加载部分内容；完整使用仍建议点击“在系统浏览器打开”。

## 当前状态

账号、项目、聊天、素材与排行榜已全部迁移到 Railway 后端，`web/public/_worker.js` 只负责静态资源和 SPA 回退，不再代理 Supabase。
