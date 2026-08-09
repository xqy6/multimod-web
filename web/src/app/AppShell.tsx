import { LogOut, Menu, Moon, Sparkles, Sun, WifiOff, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { getAnnouncement } from "@/services/admin";

const baseNavItems = [
  { label: "首页", to: "/home" },
  { label: "工作台", to: "/workspace" },
  { label: "游戏", to: "/games" },
  { label: "浏览器", to: "/browser" },
  { label: "聊天", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
  { label: "设置", to: "/settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const online = useOnlineStatus();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const gestureStartRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!user) return;
    void getAnnouncement()
      .then((result) => {
        const value = result.data ?? "";
        setAnnouncement(value);
        setAnnouncementOpen(Boolean(value));
      })
      .catch(() => undefined);
  }, [user]);

  const navItems = useMemo(
    () =>
      user?.isAdmin
        ? [...baseNavItems, { label: "管理", to: "/admin" }]
        : baseNavItems,
    [user?.isAdmin],
  );

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${
      isActive
        ? "bg-mint-300/10 text-mint-200"
        : "text-mist-400 hover:text-mist-100"
    }`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShortcutHelpOpen((open) => !open);
        return;
      }
      if (event.key === "?" && !typing) {
        event.preventDefault();
        setShortcutHelpOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setShortcutHelpOpen(false);
        setMenuOpen(false);
        return;
      }
      if (event.ctrlKey && !typing && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const targetItem = navItems[index];
        if (targetItem) {
          event.preventDefault();
          navigate(targetItem.to);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, navItems]);

  const currentIndex = Math.max(
    0,
    navItems.findIndex((item) => item.to === location.pathname),
  );
  const previousPath = currentIndex > 0 ? navItems[currentIndex - 1].to : null;
  const nextPath =
    currentIndex < navItems.length - 1 ? navItems[currentIndex + 1].to : null;

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length < 3) return;
    const touch = event.touches[0];
    gestureStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      active: true,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    const start = gestureStartRef.current;
    if (!start.active || event.touches.length < 3) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      event.preventDefault();
      const target = dx < 0 ? nextPath : previousPath;
      if (target) navigate(target);
      gestureStartRef.current.active = false;
    }
  };

  const handleTouchEnd = () => {
    gestureStartRef.current.active = false;
  };

  return (
    <div className="lithos-shell min-h-screen bg-ink-950 text-mist-100">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-full bg-mint-300 px-4 py-2 text-sm font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        跳到主要内容
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-mint-300/25 to-lilac-300/20 text-mint-200 ring-1 ring-white/10">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-playfair hidden text-sm italic sm:block">
              MODULO
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-mist-400 xl:block">
              {user?.email}
            </span>
            {!online ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-200 ring-1 ring-amber-300/20">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                离线
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              aria-label="退出登录"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">退出</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-white/10 bg-ink-950/95 px-4 py-3 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? "bg-mint-300/10 text-mint-200"
                        : "text-mist-400 hover:bg-white/5 hover:text-mist-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>
      <main
        id="main-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="mx-auto max-w-7xl px-5 py-8 lg:px-8"
      >
        {children}
      </main>

      {shortcutHelpOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="快捷键与手势说明"
            className="w-full max-w-md rounded-panel border border-white/10 bg-ink-900 p-6 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-mist-100">快捷键与手势</h2>
              <button
                type="button"
                onClick={() => setShortcutHelpOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 hover:text-mist-100"
                aria-label="关闭快捷键说明"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-mist-400">切换导航页面</span>
                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-mist-200">
                  Ctrl + 1 ~ 7
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-mist-400">打开/关闭本说明</span>
                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-mist-200">
                  Ctrl + K
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-mist-400">移动端切换上一页/下一页</span>
                <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-mist-200">
                  三指左右滑动
                </span>
              </div>
            </div>
            <Button
              className="mt-6 w-full"
              onClick={() => setShortcutHelpOpen(false)}
            >
              知道了
            </Button>
          </div>
        </div>
      ) : null}

      {announcement && announcementOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-panel border border-white/10 bg-ink-900 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-mist-100">全服公告</h2>
              <button
                type="button"
                onClick={() => setAnnouncementOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 hover:text-mist-100"
                aria-label="关闭公告"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-mist-200">
              {announcement}
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => setAnnouncementOpen(false)}
            >
              知道了
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
