import JSZip from "jszip";

import type { SiteAsset } from "@/lib/generateSite";

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^\w.-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 60);
  return cleaned || `asset-${Date.now()}`;
}

export async function exportSiteZip(input: {
  html: string;
  assets: SiteAsset[];
  title: string;
}): Promise<{ blob: Blob; fileName: string }> {
  const zip = new JSZip();
  zip.file("index.html", input.html);
  zip.file(
    "README.md",
    `# ${input.title}\n\n由 MODULO 生成器导出。\n\n## 部署\n\n将本目录上传到 Vercel、Netlify、GitHub Pages 或任意静态托管平台即可。\n`,
  );

  const assetsFolder = zip.folder("assets");
  const usedNames = new Set<string>();
  for (const asset of input.assets) {
    if (!asset.dataUrl.startsWith("data:image")) continue;
    let name = safeFileName(asset.name);
    while (usedNames.has(name)) {
      name = `copy-${name}`;
    }
    usedNames.add(name);
    assetsFolder?.file(name, dataUrlToBytes(asset.dataUrl));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, fileName: `${safeFileName(input.title) || "site"}.zip` };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
