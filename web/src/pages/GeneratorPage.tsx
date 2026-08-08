import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { renderSiteHtml, type SiteAsset } from "@/lib/generateSite";
import { generatorModules } from "@/lib/generatorModules";
import { describeVibe, parseVibe } from "@/lib/vibeParser";
import {
  addImageAsset,
  addTextAsset,
  deleteAsset,
  listAssets,
  type Asset,
} from "@/services/assets";
import {
  getProject,
  updateProject,
  type Project,
} from "@/services/projects";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

const defaultModules = ["hero", "games", "browser", "chat"];

export default function GeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const user = useAuthStore((state) => state.user);
  const pushToast = useToastStore((state) => state.push);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("");
  const [modules, setModules] = useState<string[]>(defaultModules);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [textName, setTextName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void Promise.all([getProject(projectId), listAssets(projectId)]).then(
      ([projectResult, assetResult]) => {
        if (cancelled) return;
        setLoading(false);
        if (projectResult.error || !projectResult.data) {
          setError(projectResult.error ?? "项目不存在");
          return;
        }
        const loaded = projectResult.data;
        setProject(loaded);
        setTitle(loaded.title);
        setVibe(loaded.vibe_prompt);
        setModules(
          loaded.modules.length > 0 ? loaded.modules : defaultModules,
        );
        setAssets(assetResult.data ?? []);
        if (assetResult.error) setError(assetResult.error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!project || !projectId) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const result = await updateProject(projectId, {
        title,
        vibe_prompt: vibe,
        modules,
      });
      setSaving(false);
      if (!result.error) {
        setSavedAt(new Date().toLocaleTimeString("zh-CN"));
      } else {
        pushToast("error", result.error);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [project, projectId, title, vibe, modules]);

  const config = useMemo(() => parseVibe(vibe), [vibe]);

  const siteAssets: SiteAsset[] = useMemo(
    () =>
      assets.map((asset) => ({
        name: asset.name,
        dataUrl: asset.dataUrl ?? asset.content ?? "",
      })),
    [assets],
  );

  const previewHtml = useMemo(
    () =>
      renderSiteHtml({
        title,
        vibe,
        config,
        modules,
        assets: siteAssets,
      }),
    [title, vibe, config, modules, siteAssets],
  );

  const toggleModule = (id: string) => {
    setModules((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file || !projectId) return;
    setUploading(true);
    const result = await addImageAsset(projectId, user?.id ?? "demo-user", file);
    setUploading(false);
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    if (result.data) setAssets((current) => [...current, result.data!]);
  };

  const handleTextAsset = async () => {
    if (!projectId || !textName.trim() || !textContent.trim()) return;
    const result = await addTextAsset(
      projectId,
      user?.id ?? "demo-user",
      textName.trim(),
      textContent.trim(),
    );
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    if (result.data) setAssets((current) => [...current, result.data!]);
    setTextName("");
    setTextContent("");
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!projectId) return;
    const result = await deleteAsset(projectId, asset.id);
    if (result.error) {
      setError(result.error);
      pushToast("error", result.error);
      return;
    }
    setAssets((current) => current.filter((item) => item.id !== asset.id));
  };

  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);
    const { downloadBlob, exportSiteZip } = await import("@/lib/exportSite");
    const { blob, fileName } = await exportSiteZip({
      html: previewHtml,
      assets: siteAssets,
      title,
    });
    downloadBlob(blob, fileName);
    await updateProject(projectId, { status: "exported" });
    setExporting(false);
    pushToast("success", "ZIP 导出完成");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-mist-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="ml-3 text-sm">正在加载生成器</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-panel border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-mist-200">{error ?? "项目不存在"}</p>
        <Link to="/workspace" className="mt-4 inline-block text-sm text-mint-300">
          返回工作台
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to="/workspace"
            className="inline-flex items-center gap-2 text-sm text-mist-400 transition-colors hover:text-mist-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回工作台
          </Link>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            网站生成器
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-mist-500 sm:inline">
            {saving ? "保存中…" : savedAt ? `已保存 ${savedAt}` : ""}
          </span>
          <Button
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            导出 ZIP
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-2 text-mint-300">
              <Save className="h-4 w-4" aria-hidden="true" />
              <h2 className="text-base font-bold">01 · 基础信息</h2>
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-medium text-mist-400">
                网站名称
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="给你的网站起个名字"
              />
            </label>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-medium text-mist-400">
                vibe 描述
              </span>
              <textarea
                value={vibe}
                onChange={(event) => setVibe(event.target.value)}
                placeholder="例如：赛博朋克风格的游戏社区，暗色、霓虹、未来感"
                className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist-100 placeholder:text-mist-500 focus:border-mint-300/50 focus:outline-none focus:ring-2 focus:ring-mint-300/20"
              />
            </label>
            <div className="mt-5 rounded-xl bg-white/5 p-4 text-xs leading-6 text-mist-300 ring-1 ring-white/10">
              <span className="font-semibold text-mint-300">
                当前风格：
              </span>
              {describeVibe(vibe)}
            </div>
          </section>

          <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-mint-300">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              02 · 功能模块
            </h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {generatorModules.map((module) => {
                const active = modules.includes(module.id);
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    aria-pressed={active}
                    className={`rounded-card border p-4 text-left transition-colors ${
                      active
                        ? "border-mint-300/50 bg-mint-300/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-mist-100">
                        {module.name}
                      </span>
                      {active ? (
                        <Check className="h-4 w-4 text-mint-300" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-mist-400">
                      {module.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-mint-300">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              03 · 素材上传
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleImageUpload(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              className="mt-5 w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              )}
              上传图片素材
            </Button>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Input
                value={textName}
                onChange={(event) => setTextName(event.target.value)}
                placeholder="文字标题"
              />
              <Input
                value={textContent}
                onChange={(event) => setTextContent(event.target.value)}
                placeholder="文字内容"
              />
            </div>
            <Button
              variant="soft"
              className="mt-2 w-full"
              onClick={() => void handleTextAsset()}
              disabled={!textName.trim() || !textContent.trim()}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              添加文字素材
            </Button>

            {assets.length > 0 ? (
              <div className="mt-5 space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    {asset.kind === "image" ? (
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-mist-300">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-mist-100">
                        {asset.name}
                      </p>
                      <p className="truncate text-xs text-mist-500">
                        {asset.kind === "image"
                          ? "图片素材"
                          : asset.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAsset(asset)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mist-500 transition-colors hover:bg-red-400/10 hover:text-red-200"
                      aria-label={`删除素材 ${asset.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <section className="min-w-0 rounded-panel border border-white/10 bg-ink-900/50 p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-mist-100">实时预览</h2>
            <span className="text-xs text-mist-500">{config.name}</span>
          </div>
          <iframe
            title="生成网站预览"
            sandbox="allow-scripts"
            srcDoc={previewHtml}
            className="h-[640px] w-full rounded-card border border-white/10 bg-white"
          />
        </section>
      </div>
    </div>
  );
}
