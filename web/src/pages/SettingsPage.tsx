import { ImagePlus, Loader2, LogOut, Save, User } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const pushToast = useToastStore((state) => state.push);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;
    if (currentUser.isDemo || !supabase) {
      setAvatarUrl(localStorage.getItem("multimod-demo-avatar") ?? "");
      return;
    }
    const client = supabase;
    void client
      .from("profiles")
      .select("avatar_url")
      .eq("id", currentUser.id)
      .single()
      .then(async ({ data }) => {
        const path = (data as { avatar_url?: string } | null)?.avatar_url;
        if (!path) return;
        const { data: signed } = await client.storage
          .from("project-assets")
          .createSignedUrl(path, 3600);
        if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
      });
  }, [supabase, user]);

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("读取头像失败"));
      reader.readAsDataURL(file);
    });

    if (!supabase || user.isDemo) {
      localStorage.setItem("multimod-demo-avatar", dataUrl);
      setAvatarUrl(dataUrl);
      setUploading(false);
      pushToast("success", "头像已更新");
      return;
    }

    const path = `${user.id}/avatar-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("project-assets")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      pushToast("error", uploadError.message);
      return;
    }
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    const { data: signed } = await supabase.storage
      .from("project-assets")
      .createSignedUrl(path, 3600);
    setAvatarUrl(signed?.signedUrl ?? dataUrl);
    setUploading(false);
    pushToast("success", "头像已更新");
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);

    if (!user?.isDemo && supabase) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      });
      if (authError) {
        setError(authError.message);
        setSaving(false);
        return;
      }
    } else {
      localStorage.setItem(
        "multimod-demo-profile",
        JSON.stringify({ display_name: displayName }),
      );
    }

    setSaving(false);
    setMessage("资料已保存");
    pushToast("success", "资料已保存");
  };

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
        个人设置
      </p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">账号资料</h1>

      <form
        onSubmit={saveProfile}
        className="mt-8 rounded-panel border border-white/10 bg-white/[0.03] p-6"
      >
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="用户头像"
              className="h-20 w-20 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-mist-400 ring-1 ring-white/10">
              <User className="h-8 w-8" aria-hidden="true" />
            </span>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleAvatarUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={uploading}
            onClick={() => avatarInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            上传头像
          </Button>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-mist-400">
            邮箱
          </span>
          <Input value={user?.email ?? ""} disabled />
        </label>

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-medium text-mist-400">
            昵称
          </span>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="你的昵称"
          />
        </label>

        {message ? (
          <p className="mt-4 rounded-xl bg-mint-300/10 px-4 py-3 text-sm text-mint-200 ring-1 ring-mint-300/20">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            保存资料
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            退出登录
          </Button>
        </div>
      </form>

      {user?.isDemo ? (
        <p className="mt-5 rounded-xl bg-amber-300/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-300/20">
          当前为本地演示模式，资料仅保存在浏览器。配置 Supabase 后才会写入数据库。
        </p>
      ) : null}
    </div>
  );
}
