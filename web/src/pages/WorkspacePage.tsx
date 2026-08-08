import {
  ArrowUpRight,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createProject,
  deleteProject,
  listProjects,
  type Project,
} from "@/services/projects";
import { useAuthStore } from "@/stores/auth";

const statusLabel: Record<Project["status"], string> = {
  draft: "草稿",
  generating: "生成中",
  preview: "预览",
  exported: "已导出",
};

export default function WorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

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
      return;
    }
    if (result.data) {
      setProjects((current) => [result.data!, ...current]);
    }
    setTitle("");
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`确认删除「${project.title}」吗？`)) return;
    const result = await deleteProject(project.id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProjects((current) =>
      current.filter((item) => item.id !== project.id),
    );
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

        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-md gap-2"
        >
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
        ) : projects.length === 0 ? (
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
                <h2 className="mt-5 truncate text-lg font-bold text-mist-100">
                  {project.title}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-mist-400">
                  {project.vibe_prompt || "尚未填写 vibe 描述"}
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs text-mist-500">
                    {new Date(project.created_at).toLocaleDateString("zh-CN")}
                  </span>
                  <Link
                    to={`/generator/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-300 transition-colors hover:text-mint-200"
                  >
                    打开生成器
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
