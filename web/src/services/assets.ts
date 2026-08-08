import { supabase } from "@/lib/supabase";

export interface Asset {
  id: string;
  project_id: string;
  owner_id: string;
  kind: "image" | "text";
  name: string;
  storage_path: string | null;
  content: string | null;
  dataUrl?: string;
  created_at: string;
}

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

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "-").slice(0, 80) || "asset";
}

export async function listAssets(
  projectId: string,
): Promise<AssetResult> {
  if (!supabase) {
    return { data: readDemoAssets(projectId), error: null };
  }
  const client = supabase;
  const { data, error } = await client
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  const assets = (data as Asset[] | null) ?? [];

  const withUrls = await Promise.all(
    assets.map(async (asset) => {
      if (asset.kind !== "image" || !asset.storage_path) return asset;
      const { data: signed } = await client.storage
        .from("project-assets")
        .createSignedUrl(asset.storage_path, 3600);
      return signed?.signedUrl ? { ...asset, dataUrl: signed.signedUrl } : asset;
    }),
  );
  return { data: withUrls, error: error?.message ?? null };
}

export async function addTextAsset(
  projectId: string,
  ownerId: string,
  name: string,
  content: string,
): Promise<{ data: Asset | null; error: string | null }> {
  if (!supabase) {
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
  const { data, error } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      kind: "text",
      name,
      content,
    })
    .select()
    .single();
  return { data: data as Asset | null, error: error?.message ?? null };
}

export async function addImageAsset(
  projectId: string,
  ownerId: string,
  file: File,
): Promise<{ data: Asset | null; error: string | null }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });

  if (!supabase) {
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

  const storagePath = `${ownerId}/${projectId}/${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(storagePath, file, { upsert: true });
  if (uploadError) {
    return { data: null, error: uploadError.message };
  }
  const { data, error } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      kind: "image",
      name: file.name,
      storage_path: storagePath,
    })
    .select()
    .single();
  return { data: data as Asset | null, error: error?.message ?? null };
}

export async function deleteAsset(
  projectId: string,
  assetId: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    writeDemoAssets(
      projectId,
      readDemoAssets(projectId).filter((asset) => asset.id !== assetId),
    );
    return { error: null };
  }
  const asset = (await listAssets(projectId)).data?.find(
    (item) => item.id === assetId,
  );
  if (asset?.storage_path) {
    await supabase.storage
      .from("project-assets")
      .remove([asset.storage_path]);
  }
  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  return { error: error?.message ?? null };
}
