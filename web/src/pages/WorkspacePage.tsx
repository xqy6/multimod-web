import {
  ArrowUpRight,
  Check,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createProject,
  deleteProject,
  listProjects,
  renameProject,
  type Project,
} from "@/services/projects";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

const statusLabel: Record<Project["status"], string> = {
  draft: "草稿",
  generating: "生成中",
  preview: "预览",
  exported: "已导出",
};

export default function WorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Project["status"] | "all">(
    "all",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listProjects().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setProjects(result.data ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = await createProject({ title: trimmed });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    if (result.data) {
      setProjects((current) => [result.data!, ...current]);
    }
    setTitle("");
    pushToast("success", "项目已创建");
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`确认删除「${project.title}」吗？`)) return;
    const result = await deleteProject(project.id);
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    setProjects((current) =>
      current.filter((item) => item.id !== project.id),
    );
    pushToast("success", "项目已删除");
  };

  const visibleProjects = projects.filter((project) => {
    const matchesQuery =
      project.title.toLowerCase().includes(query.toLowerCase()) ||
      project.vibe_prompt.toLowerCase().includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const handleRename = async (project: Project) => {
    const nextTitle = editTitle.trim();
    if (!nextTitle) return;
    const result = await renameProject(project.id, nextTitle);
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    setProjects((current) =>
      current.map((item) =>
        item.id === project.id
          ? { ...item, title: nextTitle, updated_at: new Date().toISOString() }
          : item,
      ),
    );
    setEditingId(null);
    pushToast("success", "项目名称已更新");
  };

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
            个人工作台
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">我的项目</h1>
          <p className="mt-3 text-sm leading-6 text-mist-400">
            {user?.isDemo
              ? "当前为本地演示模式，项目保存在浏览器中。"
              : "项目数据保存在 Supabase，仅自己可见。"}
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="输入项目名称"
              aria-label="新项目名称"
            />
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              新建
            </Button>
          </form>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索项目"
                className="pl-10"
                aria-label="搜索项目"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as Project["status"] | "all",
                )
              }
              className="h-12 rounded-xl border border-white/10 bg-ink-900 px-3 text-sm text-mist-200 focus:border-mint-300/50 focus:outline-none"
              aria-label="按状态筛选"
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="generating">生成中</option>
              <option value="preview">预览</option>
              <option value="exported">已导出</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <div className="mt-10">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-mist-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span className="ml-3 text-sm">正在加载项目</span>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-white/15 bg-white/[0.02] px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-300/10 text-mint-300 ring-1 ring-mint-300/20">
              <FolderPlus className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-bold">还没有项目</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-mist-400">
              新建一个项目后，就可以进入生成器描述 vibe、选择模块并导出网站。
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="group rounded-card border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-mint-300 ring-1 ring-white/10">
                    {statusLabel[project.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(project)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 transition-colors hover:bg-red-400/10 hover:text-red-200"
                    aria-label={`删除项目 ${project.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {editingId === project.id ? (
                  <div className="mt-5 flex gap-2">
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="h-10"
                      aria-label="修改项目名称"
                    />
                    <Button
                      size="sm"
                      onClick={() => void handleRename(project)}
                      aria-label="保存重命名"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="取消重命名"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <h2 className="mt-5 truncate text-lg font-bold text-mist-100">
                    {project.title}
                  </h2>
                )}
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-mist-400">
                  {project.vibe_prompt || "尚未填写 vibe 描述"}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs text-mist-500">
                    {new Date(project.created_at).toLocaleDateString("zh-CN")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(project.id);
                        setEditTitle(project.title);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-mist-500 transition-colors hover:bg-white/5 hover:text-mist-100"
                      aria-label={`重命名项目 ${project.title}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <Link
                      to={`/generator/${project.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-300 transition-colors hover:text-mint-200"
                    >
                      打开生成器
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
