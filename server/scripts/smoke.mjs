const base = "http://127.0.0.1:4000";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

const health = await request("/api/health");
console.log("health", health.ok);

await request("/api/folders?path=/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "docs" }),
});

await request("/api/folders?path=/docs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "资料" }),
});

const form = new FormData();
form.append("file", new Blob(["hello netdisk"], { type: "text/plain" }), "测试.txt");
const upload = await request("/api/files/upload?path=/docs/资料", {
  method: "POST",
  body: form,
});
console.log("uploaded", upload.file.name, upload.file.path);

const list = await request("/api/folders?path=/docs/资料");
console.log("listed", list.folders.length, list.files.map((file) => file.name));

await request("/api/folders?path=/docs/资料", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ newName: "文档" }),
});

const renamed = await request("/api/folders?path=/docs");
console.log("renamed folders", renamed.folders.map((folder) => folder.name));

const download = await fetch(
  `${base}/api/files/download?path=/docs/文档&name=${encodeURIComponent(upload.file.name)}`,
);
console.log("downloaded", await download.text());

await request(
  `/api/files?path=/docs/文档&name=${encodeURIComponent(upload.file.name)}`,
  { method: "DELETE" },
);
await request("/api/folders?path=/docs/文档", { method: "DELETE" });
await request("/api/folders?path=/docs", { method: "DELETE" });

const root = await request("/api/folders?path=/");
console.log("root after cleanup", root.folders.length, root.files.length);
console.log("smoke ok");
