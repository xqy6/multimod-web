const base = "http://127.0.0.1:4000";
const suffix = Date.now().toString(36);

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

const username = `smoke-${suffix}`;
const registered = await request("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password: "test1234" }),
});
const token = registered.token;

const folderName = `folder-${suffix}`;
await request(`/api/folders?path=/`, {
  method: "POST",
  headers: { ...authHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({ name: folderName }),
});

const form = new FormData();
form.append("file", new Blob(["hello netdisk"], { type: "text/plain" }), "测试.txt");
const upload = await request(`/api/files/upload?path=/${folderName}`, {
  method: "POST",
  headers: authHeaders(token),
  body: form,
});

const list = await request(`/api/folders?path=/${folderName}`, {
  headers: authHeaders(token),
});
if (list.files.length !== 1) throw new Error("upload list mismatch");

await request(`/api/files/rename?path=/${folderName}&name=${encodeURIComponent(upload.file.name)}`, {
  method: "PUT",
  headers: { ...authHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({ newName: "renamed.txt" }),
});

const download = await fetch(
  `${base}/api/files/download?path=/${folderName}&name=renamed.txt`,
  { headers: authHeaders(token) },
);
if (await download.text() !== "hello netdisk") throw new Error("download mismatch");

const chunkName = `chunk-${suffix}.bin`;
const chunkData = new Blob(["0123456789abcdef"], { type: "application/octet-stream" });
const chunkSize = 8;
const totalChunks = 2;
const init = await request(`/api/chunks/init?path=/${folderName}`, {
  method: "POST",
  headers: { ...authHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({
    fileName: chunkName,
    totalSize: chunkData.size,
    chunkSize,
    totalChunks,
  }),
});

for (let index = 0; index < totalChunks; index += 1) {
  const chunkForm = new FormData();
  chunkForm.append("uploadId", init.uploadId);
  chunkForm.append("index", String(index));
  chunkForm.append(
    "chunk",
    new Blob([chunkData.slice(index * chunkSize, (index + 1) * chunkSize)]),
    `chunk-${index}`,
  );
  await request("/api/chunks/upload", {
    method: "POST",
    headers: authHeaders(token),
    body: chunkForm,
  });
}

await request("/api/chunks/complete", {
  method: "POST",
  headers: { ...authHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({ uploadId: init.uploadId }),
});

const afterChunk = await request(`/api/folders?path=/${folderName}`, {
  headers: authHeaders(token),
});
if (!afterChunk.files.some((file) => file.name === chunkName)) {
  throw new Error("chunk upload mismatch");
}

await request(
  `/api/files?path=/${folderName}&name=renamed.txt`,
  { method: "DELETE", headers: authHeaders(token) },
);
await request(`/api/folders?path=/${folderName}`, {
  method: "DELETE",
  headers: authHeaders(token),
});

const trash = await request("/api/trash", { headers: authHeaders(token) });
if (trash.items.length < 2) throw new Error("trash mismatch");

const folderNode = trash.items.find((item) => item.name === folderName);
await request("/api/trash/restore", {
  method: "POST",
  headers: { ...authHeaders(token), "Content-Type": "application/json" },
  body: JSON.stringify({ nodeId: folderNode.id }),
});

const fileNode = trash.items.find((item) => item.name === chunkName);
await request(`/api/trash?nodeId=${fileNode.id}`, {
  method: "DELETE",
  headers: authHeaders(token),
});

await request(`/api/folders?path=/${folderName}`, {
  method: "DELETE",
  headers: authHeaders(token),
});

console.log("smoke ok: auth, folder, upload, rename, download, chunks, trash");
