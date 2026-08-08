# Node.js 网盘后端

模仿百度网盘的基础后端，在服务器本地磁盘生成真实层级文件夹，提供文件夹与文件接口。

## 技术栈

- Node.js
- Express
- multer（文件上传）
- 文件系统真实落盘

## 安装与启动

```bash
cd server
pnpm install
pnpm start
```

默认地址：`http://localhost:4000`

可选环境变量（复制 `.env.example` 为 `.env`）：

```text
PORT=4000
STORAGE_ROOT=./storage
MAX_FILE_SIZE_MB=500
```

## 项目结构

```text
server/
├─ package.json
├─ .env.example
├─ README.md
├─ src/
│  ├─ index.js              # 入口、中间件、错误处理
│  ├─ config.js             # 端口、存储目录、大小限制
│  ├─ routes/
│  │  ├─ folders.js         # 文件夹接口
│  │  └─ files.js           # 上传、删除、下载
│  └─ utils/
│     ├─ httpError.js
│     └─ pathUtils.js       # 路径校验，防止越权访问
└─ storage/                 # 运行时自动创建的真实磁盘目录
```

## API

### 健康检查

```text
GET /api/health
```

### 创建文件夹

```text
POST /api/folders?path=/docs
Content-Type: application/json

{ "name": "资料" }
```

### 列出文件夹内容

```text
GET /api/folders?path=/docs
```

返回：

```json
{
  "path": "/docs",
  "folders": [{ "name": "资料", "path": "/docs/资料" }],
  "files": [{ "name": "a.txt", "path": "/docs/a.txt", "size": 1024 }]
}
```

### 重命名文件夹

```text
PUT /api/folders?path=/docs/资料
Content-Type: application/json

{ "newName": "文档" }
```

### 删除文件夹

```text
DELETE /api/folders?path=/docs/资料
```

### 上传文件

```text
POST /api/files/upload?path=/docs
Content-Type: multipart/form-data

file: 文件内容
```

### 删除文件

```text
DELETE /api/files?path=/docs&name=a.txt
```

### 下载文件

```text
GET /api/files/download?path=/docs&name=a.txt
```

## 安全说明

- 所有路径都会解析到 `STORAGE_ROOT` 内，阻止 `..` 穿越。
- 不允许删除或重命名根目录。
- 上传同名文件会自动生成 `文件名-1.ext`，不会覆盖。
- 默认单文件上限 500MB，可通过 `MAX_FILE_SIZE_MB` 调整。
