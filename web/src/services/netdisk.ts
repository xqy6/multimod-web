import { netdiskApiUrl } from "@/lib/config";

export interface NetdiskFolder {
  name: string;
  path: string;
  modifiedAt: string;
}

export interface NetdiskFile {
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
  const response = await fetch(`${netdiskApiUrl}${path}`, init);
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

export function deleteFile(path: string, name: string) {
  return request(
    `/api/files?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
    { method: "DELETE" },
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
