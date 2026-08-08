// Cloudflare Worker 浏览器代理
// 部署后设置前端环境变量 VITE_PROXY_URL 为 https://你的worker域名

const BLOCKED_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "frame-ancestors",
];

function cleanHeaders(headers) {
  const next = new Headers(headers);
  BLOCKED_HEADERS.forEach((name) => next.delete(name));
  return next;
}

function rewriteHtml(html, target, proxyBase) {
  const rewriteAttribute = (match, prefix, quote, value) => {
    if (/^(#|data:|javascript:|mailto:)/i.test(value)) return match;
    try {
      const absolute = new URL(value, target).toString();
      return `${prefix}${quote}${proxyBase}${encodeURIComponent(absolute)}${quote}`;
    } catch {
      return match;
    }
  };

  return html
    .replace(/<base[^>]*>/gi, "")
    .replace(/(href|src|action)=(["'])([^"']+)/gi, rewriteAttribute)
    .replace(/<head([^>]*)>/i, `<head$1>`);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetRaw = url.searchParams.get("url");
    if (!targetRaw) {
      return new Response("Missing url parameter", { status: 400 });
    }

    let target;
    try {
      target = new URL(targetRaw);
    } catch {
      return new Response("Invalid url parameter", { status: 400 });
    }
    if (!["http:", "https:"].includes(target.protocol)) {
      return new Response("Only http/https are supported", { status: 400 });
    }

    const headers = new Headers(request.headers);
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    );
    headers.delete("host");
    headers.delete("cookie");

    const response = await fetch(target.toString(), {
      headers,
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      return new Response(response.body, {
        status: response.status,
        headers: cleanHeaders(response.headers),
      });
    }

    const html = await response.text();
    const proxyBase = `${url.origin}${url.pathname}?url=`;
    const rewritten = rewriteHtml(html, target, proxyBase);
    const finalHeaders = cleanHeaders(response.headers);
    finalHeaders.set("Content-Type", contentType);

    return new Response(rewritten, {
      status: response.status,
      headers: finalHeaders,
    });
  },
};
