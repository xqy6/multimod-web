import { Loader2, Mail, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  signInWithMagicLink,
  signInWithPassword,
  signUp,
} from "@/services/auth";
import { DEMO_USER, useAuthStore } from "@/stores/auth";

type Mode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const enterDemo = () => {
    setUser(DEMO_USER);
    navigate("/workspace");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);

    if (mode === "magic") {
      const result = await signInWithMagicLink(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSent(true);
      }
      setLoading(false);
      return;
    }

    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password, displayName || email.split("@")[0]);

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate("/workspace");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-10 text-mist-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint-300/25 to-lilac-300/20 text-mint-200 ring-1 ring-white/10">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.18em]">
            MODULO
          </span>
        </div>

        <div className="rounded-panel border border-white/10 bg-white/[0.03] p-6 shadow-soft backdrop-blur-md sm:p-8">
          {!isSupabaseConfigured ? (
            <div className="text-center">
              <p className="text-lg font-bold">本地演示模式</p>
              <p className="mt-3 text-sm leading-6 text-mist-400">
                尚未配置 Supabase。你可以先用演示账号体验工作台，后续填入环境变量后即可启用真实登录。
              </p>
              <Button onClick={enterDemo} className="mt-6">
                进入演示工作台
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
                {(
                  [
                    ["signin", "登录"],
                    ["signup", "注册"],
                    ["magic", "魔法链接"],
                  ] as [Mode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setError(null);
                      setSent(false);
                    }}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      mode === value
                        ? "bg-mint-300 text-ink-950"
                        : "text-mist-400 hover:text-mist-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-7 space-y-4">
                {mode === "signup" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-mist-400">
                      昵称
                    </span>
                    <Input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="你的昵称"
                      autoComplete="nickname"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-mist-400">
                    邮箱
                  </span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                {mode !== "magic" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-mist-400">
                      密码
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="至少 6 位"
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      required
                    />
                  </label>
                ) : null}

                {error ? (
                  <p className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
                    {error}
                  </p>
                ) : null}

                {sent ? (
                  <p className="flex items-center gap-2 rounded-xl bg-mint-300/10 px-4 py-3 text-sm text-mint-200 ring-1 ring-mint-300/20">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    登录链接已发送，请查收邮箱。
                  </p>
                ) : null}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {mode === "signin"
                    ? "登录"
                    : mode === "signup"
                      ? "创建账号"
                      : "发送登录链接"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-mist-500">
          账号数据由 Supabase 提供，页面代码部署在 Vercel。
        </p>
      </div>
    </main>
  );
}
