import {
  Check,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  listFolder,
  renameFolder,
  uploadFile,
  type NetdiskListing,
} from "@/services/netdisk";
import { useToastStore } from "@/stores/toast";

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function NetdiskPage() {
  const pushToast = useToastStore((state) => state.push);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("/");
  const [listing, setListing] = useState<NetdiskListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ path: string; name: string } | null>(
    null,
  );
  const [editName, setEditName] = useState("");

  const load = useCallback(
    async (targetPath: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listFolder(targetPath);
        setListing(result);
      } catch (loadError) {
        setError((loadError as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(path);
  }, [load, path]);

  const segments = path.split("/").filter(Boolean);

  const navigateTo = (targetPath: string) => {
    setPath(targetPath);
    setEditing(null);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(path, name);
      setNewFolderName("");
      pushToast("success", "文件夹创建成功");
      await load(path);
    } catch (createError) {
      pushToast("error", (createError as Error).message);
    }
  };

  const handleRenameFolder = async () => {
    if (!editing || !editName.trim()) return;
    try {
      await renameFolder(editing.path, editName.trim());
      pushToast("success", "重命名成功");
      setEditing(null);
      await load(path);
    } catch (renameError) {
      pushToast("error", (renameError as Error).message);
    }
  };

  const handleDeleteFolder = async (name: string, folderPath: string) => {
    if (!window.confirm(`确认删除文件夹「${name}」及其全部内容吗？`)) return;
    try {
      await deleteFolder(folderPath);
      pushToast("success", "文件夹已删除");
      await load(path);
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDeleteFile = async (name: string) => {
    if (!window.confirm(`确认删除文件「${name}」吗？`)) return;
    try {
      await deleteFile(path, name);
      pushToast("success", "文件已删除");
      await load(path);
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDownload = async (name: string) => {
    try {
      const blob = await downloadFile(path, name);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast("success", "下载开始");
    } catch (downloadError) {
      pushToast("error", (downloadError as Error).message);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(path, file);
      pushToast("success", `上传成功：${result.file.name}`);
      await load(path);
    } catch (uploadError) {
      pushToast("error", (uploadError as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            网盘
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">文件管理</h1>
          <p className="mt-3 text-sm leading-6 text-mist-400">
            文件夹真实存储在服务器磁盘，文件由 Express + multer 上传。
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => void load(path)}
          aria-label="刷新网盘"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          刷新
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="flex shrink-0 items-center gap-1.5 text-mist-300 hover:text-mist-100"
          >
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            根目录
          </button>
          {segments.map((segment, index) => (
            <span key={segment} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-4 w-4 shrink-0 text-mist-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() =>
                  navigateTo(`/${segments.slice(0, index + 1).join("/")}`)
                }
                className="truncate text-mist-300 hover:text-mist-100"
              >
                {segment}
              </button>
            </span>
          ))}
        </nav>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <Input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="新文件夹名称"
            aria-label="新文件夹名称"
          />
          <Button onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim()}>
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            新建
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button
          variant="soft"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          上传文件
        </Button>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-panel border border-white/10 bg-white/[0.03]">
        <div className="hidden grid-cols-[1fr_140px_120px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-mist-500 sm:grid">
          <span>名称</span>
          <span>大小</span>
          <span>操作</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-mist-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="text-sm">正在加载</span>
          </div>
        ) : listing && listing.folders.length + listing.files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Folder className="h-10 w-10 text-mist-500" aria-hidden="true" />
            <p className="mt-3 text-sm text-mist-400">这个文件夹是空的</p>
          </div>
        ) : listing ? (
          <div className="divide-y divide-white/5">
            {listing.folders.map((folder) => (
              <div
                key={folder.path}
                className="grid grid-cols-1 items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_140px_120px] sm:gap-4"
              >
                {editing?.path === folder.path ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="h-10"
                      aria-label="修改文件夹名称"
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleRenameFolder()}
                      aria-label="保存文件夹名称"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateTo(folder.path)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <Folder className="h-5 w-5 shrink-0 text-mint-300" aria-hidden="true" />
                    <span className="truncate text-sm font-medium text-mist-100">
                      {folder.name}
                    </span>
                  </button>
                )}
                <span className="text-xs text-mist-500">文件夹</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing({ path: folder.path, name: folder.name });
                      setEditName(folder.name);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                    aria-label={`重命名文件夹 ${folder.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFolder(folder.name, folder.path)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                    aria-label={`删除文件夹 ${folder.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}

            {listing.files.map((file) => (
              <div
                key={file.path}
                className="grid grid-cols-1 items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_140px_120px] sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <File className="h-5 w-5 shrink-0 text-lilac-300" aria-hidden="true" />
                  <span className="truncate text-sm font-medium text-mist-100">
                    {file.name}
                  </span>
                </div>
                <span className="text-xs text-mist-500">
                  {formatSize(file.size)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDownload(file.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                    aria-label={`下载文件 ${file.name}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFile(file.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                    aria-label={`删除文件 ${file.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
