import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { assetUrl } from "@/lib/assets";
import { useAuthStore } from "@/stores/auth";

const SPOTLIGHT_R = 260;
const BG_IMAGE_1 = assetUrl("assets/lithos-base.webp");
const BG_IMAGE_2 = assetUrl("assets/lithos-reveal.webp");

const navLinks = [
  { label: "工作台", to: "/workspace" },
  { label: "游戏", to: "/games" },
  { label: "浏览器", to: "/browser" },
  { label: "聊天", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
  { label: "设置", to: "/settings" },
];

export function Hero() {
  const user = useAuthStore((state) => state.user);
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const entryPath = user ? "/workspace" : "/login";

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      mouse.current = { x: event.clientX, y: event.clientY };
    };
    const onScroll = () => setScrolled(window.scrollY > 16);
    const tick = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const spotlightMask = `radial-gradient(circle ${SPOTLIGHT_R}px at ${cursorPos.x}px ${cursorPos.y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.12) 88%, transparent 100%)`;

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "100dvh" }}
    >
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 transition-colors duration-300 sm:p-5 ${
          scrolled ? "bg-black/60 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <a href="#home" className="flex items-center gap-3">
          <svg
            width="26"
            height="26"
            viewBox="0 0 256 256"
            fill="#ffffff"
            aria-hidden="true"
          >
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="font-playfair text-2xl italic text-white">Lithos</span>
        </a>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-2 backdrop-blur-md md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                "text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            to={entryPath}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
          >
            注册 / 登录
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 md:hidden"
          aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {menuOpen ? (
        <div className="fixed left-4 right-4 top-20 z-[99] rounded-2xl border border-white/20 bg-black/80 p-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-white/85 transition-colors hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={entryPath}
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-gray-900"
            >
              注册 / 登录
            </Link>
          </div>
        </div>
      ) : null}

      <div
        className="hero-zoom absolute inset-0 z-10 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 z-30 bg-center bg-cover bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${BG_IMAGE_2})`,
          WebkitMaskImage: spotlightMask,
          maskImage: spotlightMask,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute left-0 right-0 top-[14%] z-50 flex flex-col items-center px-5 text-center">
        <h1 className="leading-[0.95] text-white">
          <span
            className="hero-anim hero-reveal font-playfair block text-5xl font-normal italic sm:text-7xl md:text-8xl"
            style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
          >
            层层沉积
          </span>
          <span
            className="hero-anim hero-reveal -mt-1 block text-5xl font-normal text-white sm:text-7xl md:text-8xl"
            style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
          >
            藏尽时光
          </span>
        </h1>
      </div>

      <div className="hero-anim hero-fade absolute bottom-14 left-10 z-50 hidden max-w-[260px] sm:block md:left-14">
        <p className="text-sm leading-relaxed text-white/80">
          每一层沉积物都记录着地球的一章：从远古海床到飘落的火山灰，数百万年的时间就在我们脚下层层展开。
        </p>
      </div>

      <div
        className="hero-anim hero-fade absolute bottom-10 left-5 right-5 z-50 flex max-w-full flex-col items-start gap-4 sm:bottom-24 sm:left-auto sm:right-10 sm:max-w-[260px] sm:gap-5 md:right-14"
        style={{ animationDelay: "0.85s" }}
      >
        <p className="text-xs leading-relaxed text-white/80 sm:text-sm">
          交互地图让你层层剥开地壳，追踪岩石、化石与深时如何共同塑造脚下的土地。
        </p>
        <Link
          to={entryPath}
          className="rounded-full bg-[#e8702a] px-7 py-3 text-sm font-medium text-white transition-all hover:scale-[1.03] hover:bg-[#d2611f] hover:shadow-lg hover:shadow-[#e8702a]/30 active:scale-95"
        >
          开始探索
        </Link>
      </div>
    </section>
  );
}
