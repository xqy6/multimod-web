import { generatorModules } from "@/lib/generatorModules";
import type { ThemeConfig } from "@/lib/vibeParser";

export interface SiteAsset {
  name: string;
  dataUrl: string;
}

interface RenderInput {
  title: string;
  vibe: string;
  config: ThemeConfig;
  modules: string[];
  assets: SiteAsset[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const moduleInfo: Record<string, { name: string; description: string }> =
  Object.fromEntries(
    generatorModules.map((module) => [
      module.id,
      { name: module.name, description: module.description },
    ]),
  );

function buildStyle(config: ThemeConfig): string {
  const spacing =
    config.density === "airy"
      ? "96px"
      : config.density === "compact"
        ? "48px"
        : "72px";
  return `
    :root {
      --bg: ${config.background};
      --surface: ${config.surface};
      --text: ${config.text};
      --muted: ${config.muted};
      --primary: ${config.primary};
      --secondary: ${config.secondary};
      --accent: ${config.accent};
      --radius: ${config.radius}px;
      --spacing: ${spacing};
      --font: ${config.font};
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
    .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
    .nav {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px;
      background: color-mix(in srgb, var(--bg) 78%, transparent);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .brand { font-weight: 800; letter-spacing: 0.08em; }
    .nav-links { display: flex; gap: 24px; font-size: 14px; color: var(--muted); }
    .nav-links a:hover { color: var(--text); }
    .hero {
      min-height: 78vh;
      display: flex; align-items: center;
      background:
        linear-gradient(120deg, color-mix(in srgb, var(--primary) 16%, transparent), color-mix(in srgb, var(--secondary) 14%, transparent), transparent),
        var(--bg);
    }
    .hero h1 {
      max-width: 820px;
      margin: 0;
      font-size: clamp(42px, 7vw, 84px);
      line-height: 1.05;
      letter-spacing: -0.02em;
    }
    .hero p {
      max-width: 640px;
      margin: 28px 0 0;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.8;
    }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 40px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 50px; padding: 0 26px;
      border-radius: 999px;
      font-weight: 700; font-size: 15px;
      background: var(--primary); color: var(--bg);
      border: 0; cursor: pointer;
    }
    .btn.secondary { background: transparent; color: var(--text); border: 1px solid rgba(255,255,255,0.16); }
    .section { padding: var(--spacing) 0; }
    .section-head { max-width: 680px; margin-bottom: 48px; }
    .eyebrow {
      margin: 0 0 12px; color: var(--primary);
      font-size: 12px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
    }
    .section h2 { margin: 0; font-size: clamp(30px, 5vw, 48px); line-height: 1.15; }
    .section .desc { margin: 18px 0 0; color: var(--muted); font-size: 16px; line-height: 1.8; }
    .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .card {
      padding: 28px;
      background: color-mix(in srgb, var(--surface) 86%, transparent);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,0.28); }
    .card h3 { margin: 0 0 10px; font-size: 20px; }
    .card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.8; }
    .gallery { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .gallery img {
      width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
      border-radius: var(--radius);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .cta {
      padding: 72px 0;
      text-align: center;
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }
    .footer {
      padding: 32px 24px;
      border-top: 1px solid rgba(255,255,255,0.08);
      color: var(--muted); font-size: 13px; text-align: center;
    }
    @media (max-width: 720px) {
      .nav-links { display: none; }
      .hero { min-height: 70vh; }
    }
  `;
}

function buildModules(modules: string[]): string {
  const selected = modules
    .map((id) => moduleInfo[id])
    .filter((info): info is { name: string; description: string } =>
      Boolean(info),
    );
  if (selected.length === 0) {
    return "";
  }
  return `
    <section class="section" id="modules">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">功能板块</p>
          <h2>选择要开启的模块</h2>
          <p class="desc">生成站点已包含以下功能入口。</p>
        </div>
        <div class="grid">
          ${selected
            .map(
              (module) => `
                <article class="card">
                  <h3>${escapeHtml(module.name)}</h3>
                  <p>${escapeHtml(module.description)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function buildGallery(assets: SiteAsset[]): string {
  const images = assets.filter((asset) =>
    asset.dataUrl.startsWith("data:image"),
  );
  if (images.length === 0) return "";
  return `
    <section class="section" id="gallery">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">素材图库</p>
          <h2>上传素材展示</h2>
          <p class="desc">图片会直接嵌入生成包，离线也能打开。</p>
        </div>
        <div class="gallery">
          ${images
            .map(
              (asset) => `
                <img src="${escapeHtml(asset.dataUrl)}" alt="${escapeHtml(asset.name)}" />
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

export function renderSiteHtml(input: RenderInput): string {
  const { title, vibe, config, modules, assets } = input;
  const headline = title.trim() || "用一句话描述氛围，生成可运行的多功能网站";
  const subtitle =
    vibe.trim() ||
    "从 vibe 氛围到 UI 效果图、交互原型，再到完整可部署的前端代码。";
  const previewImage =
    assets.find((asset) => asset.dataUrl.startsWith("data:image"))?.dataUrl ??
    "https://xieqiyan.pages.dev/og-cover.png";
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: headline,
    description: subtitle,
    inLanguage: "zh-CN",
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(subtitle)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(headline)}" />
  <meta property="og:description" content="${escapeHtml(subtitle)}" />
  <meta property="og:image" content="${escapeHtml(previewImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="MODULO" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(headline)}" />
  <meta name="twitter:description" content="${escapeHtml(subtitle)}" />
  <meta name="twitter:image" content="${escapeHtml(previewImage)}" />
  <title>${escapeHtml(headline)}</title>
  <script type="application/ld+json">${structuredData}</script>
  <style>${buildStyle(config)}</style>
</head>
<body>
  <header class="nav">
    <a class="brand" href="#top">${escapeHtml(headline)}</a>
    <nav class="nav-links">
      <a href="#modules">功能</a>
      <a href="#gallery">素材</a>
      <a href="#cta">开始</a>
    </nav>
  </header>

  <main id="top">
    <section class="hero">
      <div class="container">
        <h1>${escapeHtml(headline)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <div class="hero-actions">
          <a class="btn" href="#modules">查看模块</a>
          <a class="btn secondary" href="#cta">立即开始</a>
        </div>
      </div>
    </section>
    ${buildModules(modules)}
    ${buildGallery(assets)}
    <section class="cta" id="cta">
      <div class="container">
        <h2>准备好生成你的网站了吗？</h2>
        <p class="desc">导出 ZIP 后可直接部署到任意静态托管平台。</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    由 MODULO 生成器导出 · ${escapeHtml(config.name)} 风格
  </footer>
</body>
</html>`;
}
