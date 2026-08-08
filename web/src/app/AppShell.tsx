import { LogOut, Sparkles, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/stores/auth";

const navItems = [
  { label: "工作台", to: "/workspace" },
  { label: "游戏", to: "/games" },
  { label: "浏览器", to: "/browser" },
  { label: "聊天", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
  { label: "设置", to: "/settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mint-300/25 to-lilac-300/20 text-mint-200 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.18em]">
              MODULO
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-white/10 text-mist-100"
                      : "text-mist-400 hover:text-mist-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 text-xs text-mist-400 md:block">
            {user?.email}
          </div>
          {!online ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-200 ring-1 ring-amber-300/20">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              离线模式
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</main>
    </div>
  );
}
