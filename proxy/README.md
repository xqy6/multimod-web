# Cloudflare Worker 浏览器代理

这是一个轻量 HTTP 代理，用来让内置浏览器打开部分拒绝 iframe 嵌入的站点。

## 部署

1. 登录 Cloudflare Dashboard，进入 Workers & Pages。
2. 创建 Worker，名称随意，例如 `multimod-proxy`。
3. 把 `worker.js` 内容粘贴进 Worker 编辑器并保存。
4. 部署后得到类似 `https://multimod-proxy.workers.dev` 的地址。
5. 在 `web/.env.local` 添加：

```text
VITE_PROXY_URL=https://multimod-proxy.workers.dev
```

6. 重启前端，内置浏览器会通过代理加载页面。

## 能力与限制

- 会移除 `X-Frame-Options`、`Content-Security-Policy` 等嵌入限制。
- 会改写页面里的 `href`、`src`、`action` 链接，让后续跳转继续走代理。
- 适合百度、新闻站、文档站等相对静态的网页。
- 抖音这类重度依赖登录、Cookie 和动态脚本的站点，代理只能加载到部分内容；要完整使用仍建议点击“在系统浏览器打开”。
