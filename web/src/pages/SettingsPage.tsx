import { Loader2, LogOut, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
