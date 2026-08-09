import { uploadFileWithProgress } from "@/services/netdisk";

export interface OfflineUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  createdAt: string;
  status: "pending" | "uploading" | "error";
  error?: string;
}

interface StoredUpload extends OfflineUpload {
  blob: Blob;
}

const DB_NAME = "multimod-offline-uploads";
const STORE = "uploads";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前浏览器不支持离线队列"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineUpload(file: File, path: string) {
  const db = await openDb();
  const record: StoredUpload = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    createdAt: new Date().toISOString(),
    status: "pending",
    blob: file,
  };
  await requestToPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).put(record),
  );
  db.close();
  return record.id;
}

export async function listOfflineUploads(): Promise<OfflineUpload[]> {
  const db = await openDb();
  const rows = await requestToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).getAll(),
  );
  db.close();
  return (rows as StoredUpload[]).map(({ blob: _blob, ...meta }) => meta);
}

async function getOfflineBlob(id: string): Promise<Blob> {
  const db = await openDb();
  const row = await requestToPromise(
    db.transaction(STORE, "readonly").objectStore(STORE).get(id),
  );
  db.close();
  if (!row) throw new Error("离线文件不存在");
  return (row as StoredUpload).blob;
}

export async function removeOfflineUpload(id: string) {
  const db = await openDb();
  await requestToPromise(
    db.transaction(STORE, "readwrite").objectStore(STORE).delete(id),
  );
  db.close();
}

async function updateOfflineUpload(
  id: string,
  patch: Partial<Pick<OfflineUpload, "status" | "error">>,
) {
  const db = await openDb();
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  const current = await requestToPromise(store.get(id));
  if (current) {
    await requestToPromise(store.put({ ...current, ...patch }));
  }
  db.close();
}

export async function flushOfflineQueue(onProgress?: (id: string, percent: number) => void) {
  const items = (await listOfflineUploads()).filter(
    (item) => item.status !== "uploading",
  );
  let uploaded = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await updateOfflineUpload(item.id, { status: "uploading" });
      const blob = await getOfflineBlob(item.id);
      const file = new File([blob], item.name, { type: item.type });
      await uploadFileWithProgress(item.path, file, (percent) => {
        onProgress?.(item.id, percent);
      });
      await removeOfflineUpload(item.id);
      uploaded += 1;
    } catch (error) {
      await updateOfflineUpload(item.id, {
        status: "error",
        error: (error as Error).message,
      });
      failed += 1;
    }
  }
  return { uploaded, failed };
}
