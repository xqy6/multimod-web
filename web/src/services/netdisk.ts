import { netdiskApiUrl } from "@/lib/config";
import { getServerToken } from "@/lib/api";

export const RESUME_CHUNK_SIZE = 4 * 1024 * 1024;
const RESUME_KEY = "multimod-netdisk-resume";

export interface NetdiskFolder {
  id: number;
  name: string;
  path: string;
  modifiedAt: string;
}

export interface NetdiskFile {
  id: number;
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
}

export interface NetdiskListing {
  path: string;
  folders: NetdiskFolder[];
  files: NetdiskFile[];
}

interface ResumableUploadMeta {
  key: string;
  uploadId: string;
  path: string;
  fileName: string;
  size: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  updatedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getServerToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${netdiskApiUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(`无法连接网盘后端：${netdiskApiUrl}`);
  }
  const text = await response.text();
  let body: T & { error?: string };
  try {
    body = text ? JSON.parse(text) : ({} as T);
  } catch {
    body = text as T & { error?: string };
  }
  if (!response.ok) {
    throw new Error(body?.error ?? `请求失败：${response.status}`);
  }
  return body;
}

function readResumeMap(): Record<string, ResumableUploadMeta> {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ResumableUploadMeta>) : {};
  } catch {
    return {};
  }
}

function writeResumeMap(map: Record<string, ResumableUploadMeta>) {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {
    // ignore quota failures; upload can still continue in memory
  }
}

export function removeResumableUpload(key: string) {
  const map = readResumeMap();
  if (map[key]) {
    delete map[key];
    writeResumeMap(map);
  }
}

export function listFolder(path = "/"): Promise<NetdiskListing> {
  return request(`/api/folders?path=${encodeURIComponent(path)}`);
}

export function createFolder(parentPath: string, name: string) {
  return request(`/api/folders?path=${encodeURIComponent(parentPath)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function renameFolder(path: string, newName: string) {
  return request(`/api/folders?path=${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newName }),
  });
}

export function deleteFolder(path: string) {
  return request(`/api/folders?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function uploadFile(path: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{
    message: string;
    file: {
      name: string;
      originalName: string;
      path: string;
      size: number;
      modifiedAt: string;
    };
  }>(`/api/files/upload?path=${encodeURIComponent(path)}`, {
    method: "POST",
    body: form,
  });
}

export function uploadFileWithProgress(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{
  message: string;
  file: {
    name: string;
    originalName: string;
    path: string;
    size: number;
    modifiedAt: string;
  };
}> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${netdiskApiUrl}/api/files/upload?path=${encodeURIComponent(path)}`,
    );
    const token = getServerToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("上传响应解析失败"));
        }
      } else {
        let message = `上传失败：${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) message = body.error;
        } catch {
          // ignore parse errors
        }
        reject(new Error(message));
      }
    };
    xhr.onerror = () => {
      reject(new Error(`无法连接网盘后端：${netdiskApiUrl}`));
    };
    xhr.send(form);
  });
}

export async function uploadFileWithResume(
  path: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{
  message: string;
  file: {
    name: string;
    originalName: string;
    path: string;
    size: number;
    modifiedAt: string;
  };
}> {
  const key = `${path}|${file.name}|${file.size}`;
  const map = readResumeMap();
  let meta = map[key];
  if (!meta) {
    const init = await initChunkUpload(path, file);
    meta = {
      key,
      uploadId: init.uploadId,
      path,
      fileName: file.name,
      size: file.size,
      chunkSize: init.chunkSize,
      totalChunks: init.totalChunks,
      uploadedChunks: 0,
      updatedAt: new Date().toISOString(),
    };
    map[key] = meta;
    writeResumeMap(map);
  }

  if (meta.uploadedChunks >= meta.totalChunks) {
    const completed = await completeChunkUpload(meta.uploadId);
    removeResumableUpload(key);
    onProgress(100);
    return {
      message: completed.message,
      file: {
        ...completed.file,
        originalName: file.name,
        modifiedAt: new Date().toISOString(),
      },
    };
  }

  for (let index = meta.uploadedChunks; index < meta.totalChunks; index += 1) {
    const start = index * meta.chunkSize;
    const end = Math.min(start + meta.chunkSize, file.size);
    const chunk = file.slice(start, end);
    try {
      const result = await uploadChunk(meta.uploadId, index, chunk);
      meta.uploadedChunks = result.uploadedChunks;
      meta.updatedAt = new Date().toISOString();
      const nextMap = readResumeMap();
      nextMap[key] = meta;
      writeResumeMap(nextMap);
      onProgress(Math.round((meta.uploadedChunks / meta.totalChunks) * 100));
    } catch (error) {
      const nextMap = readResumeMap();
      nextMap[key] = meta;
      writeResumeMap(nextMap);
      throw error;
    }
  }

  const completed = await completeChunkUpload(meta.uploadId);
  removeResumableUpload(key);
  onProgress(100);
  return {
    message: completed.message,
    file: {
      ...completed.file,
      originalName: file.name,
      modifiedAt: new Date().toISOString(),
    },
  };
}

async function initChunkUpload(path: string, file: File) {
  return request<{
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
  }>(`/api/chunks/init?path=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      totalSize: file.size,
      chunkSize: RESUME_CHUNK_SIZE,
      totalChunks: Math.max(1, Math.ceil(file.size / RESUME_CHUNK_SIZE)),
    }),
  });
}

export function uploadChunk(uploadId: string, index: number, chunk: Blob) {
  const form = new FormData();
  form.append("uploadId", uploadId);
  form.append("index", String(index));
  form.append("chunk", chunk, `chunk-${index}`);
  return request<{ uploadedChunks: number }>("/api/chunks/upload", {
    method: "POST",
    body: form,
  });
}

export function completeChunkUpload(uploadId: string) {
  return request<{
    message: string;
    file: {
      name: string;
      path: string;
      size: number;
    };
  }>("/api/chunks/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId }),
  });
}

export function deleteFile(path: string, name: string) {
  return request(
    `/api/files?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
}

export function renameFile(path: string, oldName: string, newName: string) {
  return request(
    `/api/files/rename?path=${encodeURIComponent(path)}&name=${encodeURIComponent(oldName)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    },
  );
}

export function downloadUrl(path: string, name: string): string {
  const token = getServerToken();
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${netdiskApiUrl}/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}${tokenQuery}`;
}

export async function downloadFile(path: string, name: string): Promise<Blob> {
  const response = await fetch(
    `${netdiskApiUrl}/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
    {
      headers: getServerToken()
        ? { Authorization: `Bearer ${getServerToken()!}` }
        : undefined,
    },
  );
  if (!response.ok) {
    let message = `下载失败：${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return response.blob();
}

export async function downloadFolder(folder: {
  name: string;
  path: string;
}): Promise<{ blob: Blob; fileName: string }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let fileCount = 0;

  const walk = async (currentPath: string, zipPath: string) => {
    const listing = await listFolder(currentPath);
    for (const childFolder of listing.folders) {
      await walk(childFolder.path, `${zipPath}/${childFolder.name}`);
    }
    for (const file of listing.files) {
      const blob = await downloadFile(currentPath, file.name);
      zip.file(`${zipPath}/${file.name}`, blob);
      fileCount += 1;
    }
  };

  await walk(folder.path, folder.name);
  if (fileCount === 0) {
    zip.file(`${folder.name}/.keep`, new Blob([""]));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, fileName: `${folder.name}.zip` };
}

export interface TrashItem {
  id: number;
  name: string;
  kind: "folder" | "file";
  size: number;
  deletedAt: string;
}

export function listTrash() {
  return request<{ items: TrashItem[] }>("/api/trash");
}

export function restoreTrash(nodeId: number) {
  return request(`/api/trash/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId }),
  });
}

export function purgeTrash(nodeId: number) {
  return request(`/api/trash?nodeId=${nodeId}`, { method: "DELETE" });
}

export interface ShareItem {
  id: string;
  node_id: number;
  token: string;
  expires_at: number | null;
  created_at: string;
}

export function createShare(nodeId: number, expiresIn?: number) {
  return request<{ id: string; token: string }>("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, expiresIn }),
  });
}

export function listShares() {
  return request<{ items: ShareItem[] }>("/api/shares");
}

export function deleteShare(id: string) {
  return request(`/api/shares/${id}`, { method: "DELETE" });
}

export function getShare(token: string) {
  return request<{
    name: string;
    kind: "folder" | "file";
    size?: number;
    downloadUrl?: string;
  }>(`/api/shares/${token}`);
}

export function sharedDownloadUrl(token: string) {
  return `${netdiskApiUrl}/api/shares/${token}/download`;
}
