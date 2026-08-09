import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  Folder,
  FolderPlus,
  Grid3X3,
  HardDrive,
  Image as ImageIcon,
  LayoutList,
  Loader2,
  Music,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { netdiskApiUrl } from "@/lib/config";
import {
  createFolder,
  createShare,
  deleteFile,
  deleteFolder,
  deleteShare,
  downloadFolder,
  downloadUrl,
  listShares,
  listTrash,
  listFolder,
  purgeTrash,
  removeResumableUpload,
  renameFile,
  renameFolder,
  restoreTrash,
  uploadFileWithProgress,
  uploadFileWithResume,
  RESUME_CHUNK_SIZE,
  type NetdiskFile,
  type NetdiskFolder,
  type NetdiskListing,
  type ShareItem,
  type TrashItem,
} from "@/services/netdisk";
import {
  flushOfflineQueue,
  listOfflineUploads,
  queueOfflineUpload,
  removeOfflineUpload,
  type OfflineUpload,
} from "@/services/offlineQueue";
import { useToastStore } from "@/stores/toast";

type Category = "all" | "image" | "document" | "video" | "audio";
type ViewMode = "grid" | "list";
type SelectionKey = `folder:${string}` | `file:${string}`;

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "error" | "paused";
  uploadPath?: string;
  resumeKey?: string;
  file?: File;
  error?: string;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileCategory(file: NetdiskFile): Category {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) {
    return "audio";
  }
  return "document";
}

function FileTypeIcon({ file }: { file: NetdiskFile }) {
  const category = fileCategory(file);
  const props = { className: "h-6 w-6", "aria-hidden": true };
  if (category === "image") return <ImageIcon {...props} />;
  if (category === "video") return <Video {...props} />;
  if (category === "audio") return <Music {...props} />;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive {...props} />;
  }
  return <FileText {...props} />;
}

export default function NetdiskPage() {
  const pushToast = useToastStore((state) => state.push);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("/");
  const [listing, setListing] = useState<NetdiskListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [selected, setSelected] = useState<Set<SelectionKey>>(new Set());
  const [editing, setEditing] = useState<{
    kind: "folder" | "file";
    path: string;
    name: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"files" | "trash">("files");
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [shareModal, setShareModal] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [shareToken, setShareToken] = useState("");
  const [shareExpiryDays, setShareExpiryDays] = useState<number | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    kind: "image" | "video";
  } | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineUpload[]>([]);
  const [offlineQueueOpen, setOfflineQueueOpen] = useState(false);
  const [queueProgress, setQueueProgress] = useState<Record<string, number>>(
    {},
  );
  const [flushing, setFlushing] = useState(false);

  const load = useCallback(async (targetPath: string) => {
    setLoading(true);
    setError(null);
    try {
      setListing(await listFolder(targetPath));
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOfflineQueue = useCallback(async () => {
    try {
      setOfflineQueue(await listOfflineUploads());
    } catch {
      setOfflineQueue([]);
    }
  }, []);

  const flushQueue = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }
    setFlushing(true);
    const result = await flushOfflineQueue((id, percent) => {
      setQueueProgress((current) => ({ ...current, [id]: percent }));
    }).finally(() => setFlushing(false));
    setQueueProgress({});
    await refreshOfflineQueue();
    if (result.uploaded > 0) {
      pushToast("success", `已自动上传 ${result.uploaded} 个离线文件`);
    }
    if (result.failed > 0) {
      pushToast("error", `${result.failed} 个离线文件上传失败，可重试`);
    }
  }, [pushToast, refreshOfflineQueue]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${netdiskApiUrl}/api/health`)
      .then((response) => {
        if (!cancelled) setBackendOk(response.ok);
      })
      .catch(() => {
        if (!cancelled) setBackendOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load(path);
  }, [load, path]);

  useEffect(() => {
    void refreshOfflineQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue, refreshOfflineQueue]);

  const segments = useMemo(() => path.split("/").filter(Boolean), [path]);
  const folders = useMemo(() => listing?.folders ?? [], [listing]);
  const files = useMemo(() => listing?.files ?? [], [listing]);
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredFiles = files.filter((file) => {
    const matchesQuery = file.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      category === "all" || fileCategory(file) === category;
    return matchesQuery && matchesCategory;
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<Exclude<Category, "all">, number> = {
      image: 0,
      document: 0,
      video: 0,
      audio: 0,
    };
    files.forEach((file) => {
      const fileCategoryName = fileCategory(file);
      if (fileCategoryName !== "all") {
        counts[fileCategoryName] += 1;
      }
    });
    return counts;
  }, [files]);

  const navigateTo = (targetPath: string) => {
    setPath(targetPath);
    setSelected(new Set());
    setEditing(null);
    setCategory("all");
  };

  const refresh = () => void load(path);

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

  const handleRename = async () => {
    if (!editing || !editName.trim()) return;
    try {
      if (editing.kind === "folder") {
        await renameFolder(editing.path, editName.trim());
      } else {
        await renameFile(path, editing.name, editName.trim());
      }
      pushToast("success", "重命名成功");
      setEditing(null);
      await load(path);
    } catch (renameError) {
      pushToast("error", (renameError as Error).message);
    }
  };

  const handleDeleteFolder = async (folder: NetdiskFolder) => {
    if (!window.confirm(`确认删除文件夹「${folder.name}」及其全部内容吗？`))
      return;
    try {
      await deleteFolder(folder.path);
      pushToast("success", "文件夹已删除");
      await load(path);
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDeleteFile = async (file: NetdiskFile) => {
    if (!window.confirm(`确认删除文件「${file.name}」吗？`)) return;
    try {
      await deleteFile(path, file.name);
      pushToast("success", "文件已删除");
      await load(path);
    } catch (deleteError) {
      pushToast("error", (deleteError as Error).message);
    }
  };

  const handleDownload = (file: NetdiskFile) => {
    const anchor = document.createElement("a");
    anchor.href = downloadUrl(path, file.name);
    anchor.download = file.name;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    pushToast("success", "下载开始");
  };

  const openPreview = (file: NetdiskFile) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const kind = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
      ext,
    )
      ? "image"
      : ["mp4", "webm", "mov", "avi", "mkv", "ogg", "ogv"].includes(ext)
        ? "video"
        : null;
    if (!kind) {
      pushToast("info", "该文件类型暂不支持预览");
      return;
    }
    setPreview({ name: file.name, url: downloadUrl(path, file.name), kind });
  };

  const handleDownloadFolder = async (folder: NetdiskFolder) => {
    try {
      const { blob, fileName } = await downloadFolder(folder);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast("success", "文件夹已打包，开始下载");
    } catch (downloadError) {
      pushToast("error", (downloadError as Error).message);
    }
  };

  const uploadOneFile = async (task: UploadTask) => {
    if (!task.file) return;
    const targetPath = task.uploadPath ?? path;
    setUploads((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, status: "uploading", error: undefined }
          : item,
      ),
    );
    try {
      if (task.resumeKey) {
        await uploadFileWithResume(targetPath, task.file, (percent) => {
          setUploads((current) =>
            current.map((item) =>
              item.id === task.id ? { ...item, progress: percent } : item,
            ),
          );
        });
      } else {
        await uploadFileWithProgress(targetPath, task.file, (percent) => {
          setUploads((current) =>
            current.map((item) =>
              item.id === task.id ? { ...item, progress: percent } : item,
            ),
          );
        });
      }
      setUploads((current) => current.filter((item) => item.id !== task.id));
      pushToast("success", `上传完成：${task.name}`);
      await load(path);
    } catch (uploadError) {
      setUploads((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "error",
                error: (uploadError as Error).message,
              }
            : item,
        ),
      );
      pushToast("error", (uploadError as Error).message);
    }
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      for (const file of filesToUpload) {
        try {
          await queueOfflineUpload(file, path);
        } catch (queueError) {
          pushToast("error", (queueError as Error).message);
          return;
        }
      }
      await refreshOfflineQueue();
      pushToast("success", `${filesToUpload.length} 个文件已加入离线队列`);
      return;
    }

    const tasks = filesToUpload.map((file) => {
      const useResume = file.size >= RESUME_CHUNK_SIZE;
      const id = useResume
        ? `${path}|${file.name}|${file.size}`
        : crypto.randomUUID();
      return {
        id,
        name: file.name,
        progress: 0,
        status: "uploading" as const,
        uploadPath: path,
        resumeKey: useResume ? id : undefined,
        file,
      };
    });
    setUploads((current) => {
      const next = [...current];
      for (const task of tasks) {
        const index = next.findIndex((item) => item.id === task.id);
        if (index >= 0) {
          next[index] = {
            ...next[index],
            status: "uploading",
            error: undefined,
            file: task.file,
            uploadPath: path,
          };
        } else {
          next.push(task);
        }
      }
      return next;
    });

    for (const task of tasks) {
      await uploadOneFile(task);
    }
  };

  const handleRetryUpload = (task: UploadTask) => {
    void uploadOneFile(task);
  };

  const handleRemoveUpload = (task: UploadTask) => {
    if (task.resumeKey) removeResumableUpload(task.resumeKey);
    setUploads((current) => current.filter((item) => item.id !== task.id));
  };

  const handleRemoveOffline = async (id: string) => {
    try {
      await removeOfflineUpload(id);
      await refreshOfflineQueue();
    } catch (removeError) {
      pushToast("error", (removeError as Error).message);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) void uploadFiles(droppedFiles);
  };

  const toggleSelection = (key: SelectionKey) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const confirmCount = selected.size;
    if (!window.confirm(`确认删除选中的 ${confirmCount} 项吗？`)) return;
    for (const key of selected) {
      const [kind, itemPath] = key.split(":");
      try {
        if (kind === "folder") {
          await deleteFolder(itemPath);
        } else {
          await deleteFile(path, itemPath);
        }
      } catch (deleteError) {
        pushToast("error", (deleteError as Error).message);
      }
    }
    setSelected(new Set());
    await load(path);
    pushToast("success", "删除完成");
  };

  const openTrash = async () => {
    setMode("trash");
    setSelected(new Set());
    setEditing(null);
    try {
      const result = await listTrash();
      setTrashItems(result.items);
    } catch (trashError) {
      pushToast("error", (trashError as Error).message);
    }
  };

  const handleRestoreTrash = async (item: TrashItem) => {
    try {
      await restoreTrash(item.id);
      pushToast("success", `已恢复：${item.name}`);
      await openTrash();
    } catch (restoreError) {
      pushToast("error", (restoreError as Error).message);
    }
  };

  const handlePurgeTrash = async (item: TrashItem) => {
    if (!window.confirm(`确认彻底删除「${item.name}」吗？`)) return;
    try {
      await purgeTrash(item.id);
      pushToast("success", `已彻底删除：${item.name}`);
      await openTrash();
    } catch (purgeError) {
      pushToast("error", (purgeError as Error).message);
    }
  };

  const openShare = async (id: number, name: string) => {
    setShareModal({ id, name });
    setShareToken("");
    setShareExpiryDays(null);
    try {
      const shareResult = await listShares();
      setShares(shareResult.items);
    } catch (shareError) {
      pushToast("error", (shareError as Error).message);
    }
  };

  const handleCreateShare = async () => {
    if (!shareModal) return;
    try {
      const expiresIn = shareExpiryDays
        ? shareExpiryDays * 24 * 60 * 60 * 1000
        : undefined;
      const created = await createShare(shareModal.id, expiresIn);
      setShareToken(created.token);
      const shareResult = await listShares();
      setShares(shareResult.items);
    } catch (shareError) {
      pushToast("error", (shareError as Error).message);
    }
  };

  const handleDeleteShare = async (id: string) => {
    try {
      await deleteShare(id);
      const shareResult = await listShares();
      setShares(shareResult.items);
      pushToast("success", "分享已取消");
    } catch (shareError) {
      pushToast("error", (shareError as Error).message);
    }
  };

  const shareLink = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : "";

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    pushToast("success", "分享链接已复制");
  };

  const sidebarItems: { id: Category; label: string; count: number }[] = [
    { id: "all", label: "全部文件", count: files.length },
    { id: "image", label: "图片", count: categoryCounts.image },
    { id: "document", label: "文档", count: categoryCounts.document },
    { id: "video", label: "视频", count: categoryCounts.video },
    { id: "audio", label: "音乐", count: categoryCounts.audio },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            网盘
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">文件管理</h1>
          {backendOk !== null ? (
            <span
              className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                backendOk
                  ? "bg-mint-300/10 text-mint-200 ring-mint-300/25"
                  : "bg-red-400/10 text-red-200 ring-red-400/25"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendOk ? "bg-mint-300" : "bg-red-300"
                }`}
              />
              {backendOk ? "后端已连接" : "后端未连接"}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOfflineQueueOpen(true)}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            离线队列
            {offlineQueue.length > 0 ? ` (${offlineQueue.length})` : ""}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="space-y-1 rounded-panel border border-white/10 bg-white/[0.03] p-3">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors ${
                  category === item.id
                    ? "bg-mint-300/10 text-mint-200"
                    : "text-mist-400 hover:bg-white/5 hover:text-mist-100"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <HardDrive className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
                <span className="text-xs text-mist-500">{item.count}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => void openTrash()}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors ${
                mode === "trash"
                  ? "bg-mint-300/10 text-mint-200"
                  : "text-mist-400 hover:bg-white/5 hover:text-mist-100"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                回收站
              </span>
              <span className="text-xs text-mist-500">{trashItems.length}</span>
            </button>
          </div>
        </aside>

        <section
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative min-w-0 rounded-panel border bg-ink-900/40 transition-colors ${
            dragging ? "border-mint-300/60 bg-mint-300/5" : "border-white/10"
          }`}
        >
          {dragging ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-panel bg-mint-300/10 backdrop-blur-sm">
              <p className="rounded-full bg-mint-300 px-5 py-2.5 text-sm font-bold text-ink-950">
                释放文件开始上传
              </p>
            </div>
          ) : null}
          {mode === "files" ? (
            <div className="flex flex-col gap-3 border-b border-white/10 p-4">
              <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
                <button
                  type="button"
                  onClick={() => navigateTo("/")}
                  className="flex shrink-0 items-center gap-1.5 text-mist-300 hover:text-mist-100"
                >
                  <HardDrive className="h-4 w-4" aria-hidden="true" />
                  根目录
                </button>
                {segments.map((segment, index) => (
                  <span
                    key={segment}
                    className="flex min-w-0 items-center gap-1"
                  >
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-mist-500"
                      aria-hidden="true"
                    />
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

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索当前文件夹"
                    className="pl-10"
                    aria-label="搜索当前文件夹"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="新文件夹名称"
                    className="w-44"
                    aria-label="新文件夹名称"
                  />
                  <Button
                    onClick={() => void handleCreateFolder()}
                    disabled={!newFolderName.trim()}
                  >
                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                    新建
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const selectedFiles = Array.from(
                        event.target.files ?? [],
                      );
                      if (selectedFiles.length > 0)
                        void uploadFiles(selectedFiles);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    variant="soft"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    上传
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={refresh}
                    aria-label="刷新网盘"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="flex rounded-full bg-white/5 p-1 ring-1 ring-white/10">
                    <button
                      type="button"
                      onClick={() => setView("grid")}
                      className={`rounded-full p-2 ${
                        view === "grid"
                          ? "bg-mint-300 text-ink-950"
                          : "text-mist-400 hover:text-mist-100"
                      }`}
                      aria-label="网格视图"
                    >
                      <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className={`rounded-full p-2 ${
                        view === "list"
                          ? "bg-mint-300 text-ink-950"
                          : "text-mist-400 hover:text-mist-100"
                      }`}
                      aria-label="列表视图"
                    >
                      <LayoutList className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {mode === "trash" ? (
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-mist-100">回收站</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMode("files");
                    void load(path);
                  }}
                >
                  <ChevronRight
                    className="h-4 w-4 rotate-180"
                    aria-hidden="true"
                  />
                  返回文件
                </Button>
              </div>
              {trashItems.length === 0 ? (
                <p className="mt-6 text-sm text-mist-400">回收站是空的。</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                    >
                      {item.kind === "folder" ? (
                        <Folder
                          className="h-5 w-5 shrink-0 text-mint-300"
                          aria-hidden="true"
                        />
                      ) : (
                        <FileText
                          className="h-5 w-5 shrink-0 text-lilac-300"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-mist-100">
                          {item.name}
                        </p>
                        <p className="text-xs text-mist-500">
                          {item.kind === "file"
                            ? formatSize(item.size)
                            : "文件夹"}{" "}
                          · 删除于 {item.deletedAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRestoreTrash(item)}
                        className="flex h-9 items-center gap-1.5 rounded-full bg-white/5 px-3 text-xs font-medium text-mist-200 ring-1 ring-white/10 hover:text-mint-200"
                        aria-label={`恢复 ${item.name}`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        恢复
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePurgeTrash(item)}
                        className="flex h-9 items-center gap-1.5 rounded-full bg-red-400/10 px-3 text-xs font-medium text-red-200 ring-1 ring-red-400/20 hover:bg-red-400/20"
                        aria-label={`彻底删除 ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        彻底删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {editing ? (
                <div className="flex flex-col gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center">
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    aria-label="修改名称"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleRename()}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      取消
                    </Button>
                  </div>
                </div>
              ) : null}

              {selected.size > 0 ? (
                <div className="flex flex-col gap-2 border-b border-white/10 bg-mint-300/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-mint-200">
                    已选 {selected.size} 项
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelected(new Set())}
                    >
                      取消选择
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleDeleteSelected()}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      删除
                    </Button>
                  </div>
                </div>
              ) : null}

              {uploads.length > 0 ? (
                <div className="space-y-2 border-b border-white/10 px-4 py-3">
                  {uploads.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs text-mist-300">
                        <span className="truncate">{task.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={
                              task.status === "error"
                                ? "text-red-200"
                                : "text-mint-200"
                            }
                          >
                            {task.status === "error"
                              ? "失败"
                              : task.status === "uploading"
                                ? `${task.progress}%`
                                : "已暂停"}
                          </span>
                          {task.status === "error" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRetryUpload(task)}
                                className="flex h-7 items-center gap-1 rounded-full bg-white/5 px-2.5 text-xs text-mist-200 ring-1 ring-white/10 hover:text-mint-200"
                                aria-label={`重试上传 ${task.name}`}
                              >
                                <RefreshCw
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                重试
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveUpload(task)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                                aria-label={`移除上传任务 ${task.name}`}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </>
                          ) : null}
                        </span>
                      </div>
                      {task.status === "error" && task.error ? (
                        <p className="mt-1 text-xs text-red-200">
                          {task.error}
                        </p>
                      ) : null}
                      {task.status === "uploading" ? (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-mint-300 transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {error ? (
                <p className="m-4 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
                  {error}
                </p>
              ) : null}

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-24 text-mist-400">
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="text-sm">正在加载</span>
                </div>
              ) : filteredFolders.length + filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Folder
                    className="h-10 w-10 text-mist-500"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm text-mist-400">
                    这个文件夹是空的，拖拽文件到这里即可上传
                  </p>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.path}
                      className="group rounded-card border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20"
                    >
                      <button
                        type="button"
                        onClick={() => navigateTo(folder.path)}
                        className="flex w-full flex-col items-center gap-3"
                      >
                        <Folder
                          className="h-12 w-12 text-mint-300"
                          aria-hidden="true"
                        />
                        <span className="line-clamp-2 w-full break-all text-center text-sm font-medium text-mist-100">
                          {folder.name}
                        </span>
                      </button>
                      <div className="mt-3 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => void openShare(folder.id, folder.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`分享文件夹 ${folder.name}`}
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadFolder(folder)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`下载文件夹 ${folder.name}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({
                              kind: "folder",
                              path: folder.path,
                              name: folder.name,
                            });
                            setEditName(folder.name);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                          aria-label={`重命名文件夹 ${folder.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFolder(folder)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除文件夹 ${folder.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredFiles.map((file) => (
                    <div
                      key={file.path}
                      className={`group rounded-card border p-4 transition-colors ${
                        selected.has(`file:${file.name}`)
                          ? "border-mint-300/50 bg-mint-300/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelection(`file:${file.name}`)}
                        className="flex w-full flex-col items-center gap-3"
                      >
                        <span className="text-lilac-300">
                          <FileTypeIcon file={file} />
                        </span>
                        <span className="line-clamp-2 w-full break-all text-center text-sm font-medium text-mist-100">
                          {file.name}
                        </span>
                        <span className="text-xs text-mist-500">
                          {formatSize(file.size)}
                        </span>
                      </button>
                      <div className="mt-2 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openPreview(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`预览文件 ${file.name}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void openShare(file.id, file.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`分享文件 ${file.name}`}
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownload(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`下载文件 ${file.name}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({
                              kind: "file",
                              path: file.path,
                              name: file.name,
                            });
                            setEditName(file.name);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                          aria-label={`重命名文件 ${file.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFile(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除文件 ${file.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.path}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelection(`folder:${folder.path}`)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          selected.has(`folder:${folder.path}`)
                            ? "border-mint-300 bg-mint-300 text-ink-950"
                            : "border-white/20 text-transparent"
                        }`}
                        aria-label={`选择文件夹 ${folder.name}`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo(folder.path)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Folder
                          className="h-5 w-5 shrink-0 text-mint-300"
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium text-mist-100">
                          {folder.name}
                        </span>
                      </button>
                      <span className="hidden w-24 text-xs text-mist-500 sm:block">
                        文件夹
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => void openShare(folder.id, folder.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`分享文件夹 ${folder.name}`}
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadFolder(folder)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`下载文件夹 ${folder.name}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({
                              kind: "folder",
                              path: folder.path,
                              name: folder.name,
                            });
                            setEditName(folder.name);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                          aria-label={`重命名文件夹 ${folder.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFolder(folder)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除文件夹 ${folder.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelection(`file:${file.name}`)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          selected.has(`file:${file.name}`)
                            ? "border-mint-300 bg-mint-300 text-ink-950"
                            : "border-white/20 text-transparent"
                        }`}
                        aria-label={`选择文件 ${file.name}`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-lilac-300">
                          <FileTypeIcon file={file} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-mist-100">
                            {file.name}
                          </p>
                          <p className="text-xs text-mist-500">
                            {formatSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openPreview(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`预览文件 ${file.name}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void openShare(file.id, file.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`分享文件 ${file.name}`}
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownload(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mint-300"
                          aria-label={`下载文件 ${file.name}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({
                              kind: "file",
                              path: file.path,
                              name: file.name,
                            });
                            setEditName(file.name);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-white/5 hover:text-mist-100"
                          aria-label={`重命名文件 ${file.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteFile(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除文件 ${file.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {offlineQueueOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-panel border border-white/10 bg-ink-900 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-mist-100">
                  离线上传队列
                </h2>
                <p className="mt-1 text-sm text-mist-400">
                  {offlineQueue.length} 个文件等待上传
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOfflineQueueOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 hover:text-mist-100"
                aria-label="关闭离线队列"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                size="sm"
                disabled={flushing || offlineQueue.length === 0}
                onClick={() => void flushQueue()}
              >
                {flushing ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                {flushing ? "上传中" : "立即上传"}
              </Button>
              {typeof navigator !== "undefined" &&
              navigator.onLine === false ? (
                <span className="text-xs text-amber-200">
                  当前离线，联网后会自动上传
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
              {offlineQueue.length === 0 ? (
                <p className="py-12 text-center text-sm text-mist-500">
                  暂无离线文件
                </p>
              ) : (
                offlineQueue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-mist-100">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-mist-500">
                          {formatSize(item.size)} · {item.path}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            item.status === "error"
                              ? "bg-red-400/10 text-red-200"
                              : item.status === "uploading"
                                ? "bg-mint-300/10 text-mint-200"
                                : "bg-white/5 text-mist-300"
                          }`}
                        >
                          {item.status === "error"
                            ? "失败"
                            : item.status === "uploading"
                              ? "上传中"
                              : "待上传"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveOffline(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                          aria-label={`删除离线文件 ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {item.status === "uploading" &&
                    queueProgress[item.id] !== undefined ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-mint-300 transition-all"
                          style={{ width: `${queueProgress[item.id]}%` }}
                        />
                      </div>
                    ) : null}
                    {item.status === "error" && item.error ? (
                      <p className="mt-2 text-xs text-red-200">{item.error}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {shareModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-panel border border-white/10 bg-ink-900 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-mist-100">分享</h2>
                <p className="mt-1 text-sm text-mist-400">{shareModal.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShareModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 hover:text-mist-100"
                aria-label="关闭分享窗口"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {shareToken ? (
              <div className="mt-5">
                <p className="text-xs font-medium text-mist-400">分享链接</p>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-mist-200 focus:outline-none"
                  />
                  <Button size="sm" onClick={() => void copyShareLink()}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    复制
                  </Button>
                </div>
                <p className="mt-2 text-xs text-mist-500">
                  {shareExpiryDays ? `${shareExpiryDays} 天后过期` : "永久有效"}
                </p>
              </div>
            ) : null}

            {!shareToken ? (
              <div className="mt-5">
                <p className="text-xs font-medium text-mist-400">有效期</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { label: "永久", value: null },
                    { label: "7 天", value: 7 },
                    { label: "30 天", value: 30 },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => setShareExpiryDays(option.value)}
                      className={`h-10 rounded-xl border text-sm font-medium transition-colors ${
                        shareExpiryDays === option.value
                          ? "border-mint-300/50 bg-mint-300/10 text-mint-200"
                          : "border-white/10 bg-white/[0.02] text-mist-300 hover:border-white/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => void handleCreateShare()}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  生成分享链接
                </Button>
              </div>
            ) : null}

            <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
              <p className="text-xs font-medium text-mist-400">我的分享</p>
              {shares.length === 0 ? (
                <p className="mt-3 text-sm text-mist-500">暂无其他分享。</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-xs text-mist-300">
                          {window.location.origin}/share/{share.token}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] ${
                            share.expires_at
                              ? "text-amber-200/80"
                              : "text-mint-200/80"
                          }`}
                        >
                          {share.expires_at
                            ? `${new Date(share.expires_at).toLocaleDateString("zh-CN")} 过期`
                            : "永久有效"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteShare(share.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mist-500 hover:bg-red-400/10 hover:text-red-200"
                        aria-label={`取消分享 ${share.token}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h2 className="min-w-0 truncate text-base font-bold text-mist-100">
                {preview.name}
              </h2>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-mist-300 hover:text-mist-100"
                aria-label="关闭预览"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/40 p-4">
              {preview.kind === "image" ? (
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-h-[75vh] max-w-full object-contain"
                />
              ) : (
                <video
                  src={preview.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[75vh] max-w-full"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
