import { netdiskApiUrl } from "@/lib/config";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${netdiskApiUrl}${path}`, init);
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

export function listFolder(
  path = "/",
): Promise<NetdiskListing> {
  return request(
    `/api/folders?path=${encodeURIComponent(path)}`,
  );
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
  return `${netdiskApiUrl}/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`;
}

export async function downloadFile(
  path: string,
  name: string,
): Promise<Blob> {
  const response = await fetch(
    `${netdiskApiUrl}/api/files/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
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
