// Cloudflare Pages advanced-mode Worker with SPA fallback.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);
    if (
      assetResponse.status === 404 &&
      request.method === "GET" &&
      !url.pathname.includes(".")
    ) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }
    return assetResponse;
  },
};
