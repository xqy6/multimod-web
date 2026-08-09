import type { Asset } from "@shared";

import { apiRequest, serverApiUrl, shouldUseLocalBackend } from "@/lib/api";

export type { Asset };

interface AssetResult {
  data: Asset[] | null;
  error: string | null;
}

function demoKey(projectId: string) {
  return `multimod-demo-assets-${projectId}`;
}

function readDemoAssets(projectId: string): Asset[] {
  try {
    const raw = localStorage.getItem(demoKey(projectId));
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  } catch {
    return [];
  }
}

function writeDemoAssets(projectId: string, assets: Asset[]) {
  localStorage.setItem(demoKey(projectId), JSON.stringify(assets));
}

function absoluteAssetUrl(asset: Asset): Asset {
  if (asset.kind === "image" && asset.dataUrl?.startsWith("/")) {
    return { ...asset, dataUrl: `${serverApiUrl}${asset.dataUrl}` };
  }
  return asset;
}

export async function listAssets(projectId: string): Promise<AssetResult> {
  if (shouldUseLocalBackend()) {
    return { data: readDemoAssets(projectId), error: null };
  }
  try {
    const { data } = await apiRequest<{ data: Asset[] }>(
      `/api/projects/${projectId}/assets`,
    );
    return { data: data.map(absoluteAssetUrl), error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function addTextAsset(
  projectId: string,
  ownerId: string,
  name: string,
  content: string,
): Promise<{ data: Asset | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const asset: Asset = {
      id: crypto.randomUUID(),
      project_id: projectId,
      owner_id: ownerId,
      kind: "text",
      name,
      storage_path: null,
      content,
      created_at: new Date().toISOString(),
    };
    const assets = readDemoAssets(projectId);
    assets.push(asset);
    writeDemoAssets(projectId, assets);
    return { data: asset, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: Asset }>(
      `/api/projects/${projectId}/assets/text`,
      {
        method: "POST",
        body: { name, content },
      },
    );
    return { data: absoluteAssetUrl(data), error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function addImageAsset(
  projectId: string,
  ownerId: string,
  file: File,
): Promise<{ data: Asset | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("读取图片失败"));
      reader.readAsDataURL(file);
    });
    const asset: Asset = {
      id: crypto.randomUUID(),
      project_id: projectId,
      owner_id: ownerId,
      kind: "image",
      name: file.name,
      storage_path: null,
      content: null,
      dataUrl,
      created_at: new Date().toISOString(),
    };
    const assets = readDemoAssets(projectId);
    assets.push(asset);
    try {
      writeDemoAssets(projectId, assets);
    } catch {
      return { data: null, error: "图片过大，演示模式只支持少量图片" };
    }
    return { data: asset, error: null };
  }

  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await apiRequest<{ data: Asset }>(
      `/api/projects/${projectId}/assets/image`,
      { method: "POST", body: form },
    );
    return { data: absoluteAssetUrl(data), error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteAsset(
  projectId: string,
  assetId: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    writeDemoAssets(
      projectId,
      readDemoAssets(projectId).filter((asset) => asset.id !== assetId),
    );
    return { error: null };
  }
  try {
    await apiRequest(`/api/assets/${assetId}`, { method: "DELETE" });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
