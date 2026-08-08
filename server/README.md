# 百度网盘式 Node.js 后端

重构为生产化的网盘后端架构，而不是简单的“磁盘文件夹 API”。

## 架构

```text
server/
├─ src/
│  ├─ index.js                 # 入口、中间件、错误处理
│  ├─ config.js                # 端口、数据目录、分片限制
│  ├─ db/
│  │  └─ index.js              # SQLite 元数据库（node:sqlite）
│  ├─ middleware/
│  │  └─ auth.js               # Bearer Token 认证（未登录走演示用户）
│  ├─ repositories/            # 数据访问层
│  │  ├─ nodeRepository.js
│  │  ├─ uploadRepository.js
│  │  └─ shareRepository.js
│  ├─ services/                # 业务逻辑层
│  │  ├─ authService.js
│  │  ├─ nodeService.js        # 逻辑目录树
│  │  ├─ storageService.js     # 对象存储、去重、分片合并
│  │  └─ chunkService.js       # 分片上传状态机
│  ├─ controllers/             # 控制器层
│  ├─ routes/                  # 路由层
│  └─ utils/
├─ data/
│  ├─ netdisk.db               # SQLite 元数据
│  ├─ objects/                 # 按 SHA-256 去重的对象文件
│  └─ uploads/                 # 分片临时目录
```

## 百度网盘式设计

- **元数据与物理存储分离**：文件夹树、文件记录、回收站、分享都存 SQLite；真实文件以 `sha256` 命名存入对象存储。
- **文件去重**：相同内容的文件只保存一份对象，多个文件记录共享同一个 `storage_key`。
- **分片上传**：`init → upload chunk → complete`，服务端记录已上传分片。
- **回收站**：删除是软删除，可恢复或彻底清除。
- **分享**：文件/文件夹可生成分享 Token，支持过期时间。
- **分层代码**：routes → controllers → services → repositories，每个模块职责单一。

## 安装与启动

```bash
cd server
pnpm install
pnpm start
```

默认地址：`http://localhost:4000`

## API

### 认证

```text
POST /api/auth/register  { "username": "alice", "password": "123456" }
POST /api/auth/login     { "username": "alice", "password": "123456" }
POST /api/auth/logout
```

未带 `Authorization` 时自动使用 `demo` 用户，便于前端本地演示。

### 文件夹

```text
GET    /api/folders?path=/docs
POST   /api/folders?path=/docs        { "name": "资料" }
PUT    /api/folders?path=/docs/资料    { "newName": "文档" }
DELETE /api/folders?path=/docs/资料
```

### 文件

```text
POST   /api/files/upload?path=/docs        multipart: file
PUT    /api/files/rename?path=/docs&name=a.txt   { "newName": "b.txt" }
DELETE /api/files?path=/docs&name=a.txt
GET    /api/files/download?path=/docs&name=a.txt
```

### 分片上传

```text
POST /api/chunks/init     { "fileName": "big.zip", "totalSize": 1000, "chunkSize": 500, "totalChunks": 2 }
POST /api/chunks/upload   multipart: uploadId, index, chunk
POST /api/chunks/complete { "uploadId": "..." }
```

### 回收站

```text
GET    /api/trash
POST   /api/trash/restore  { "nodeId": 1 }
DELETE /api/trash?nodeId=1
```

### 分享

```text
POST   /api/shares  { "nodeId": 1, "expiresIn": 86400000 }
GET    /api/shares
GET    /api/shares/:token
GET    /api/shares/:token/download
DELETE /api/shares/:id
```

## 测试

```bash
node scripts/smoke.mjs
```
