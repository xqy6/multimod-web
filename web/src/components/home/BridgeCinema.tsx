import { useEffect, useRef, type TouchEvent, type WheelEvent } from "react";
import { Link } from "react-router-dom";

import { assetUrl } from "@/lib/assets";

const BRIDGE_IMAGE = assetUrl("assets/mostar/bridge.webp");
const SKY_IMAGE = assetUrl("assets/mostar/sky.webp");
const ARCH_MASK =
  "radial-gradient(ellipse 44% 54% at 50% 62%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.92) 62%, rgba(0,0,0,0.35) 70%, transparent 78%)";

const NAV_LINKS = [
  { label: "工作台", to: "/workspace" },
  { label: "游戏", to: "/games" },
  { label: "浏览器", to: "/browser" },
  { label: "聊天", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
];

const MODULES = [
  { label: "小游戏中心", to: "/games" },
  { label: "内置浏览器", to: "/browser" },
  { label: "实时聊天室", to: "/chat" },
  { label: "网盘", to: "/netdisk" },
];

export function BridgeCinema() {
  const contentRef = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const target = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    const tick = () => {
      const maxOffset = Math.max(
        120,
        Math.min(window.innerHeight * 0.34, 340),
      );
      current.current += (target.current - current.current) * 0.12;
      if (Math.abs(target.current - current.current) < 0.001) {
        current.current = target.current;
      }
      if (contentRef.current) {
        contentRef.current.style.transform = `translate3d(0, ${
          -current.current * maxOffset
        }px, 0)`;
      }
      if (Math.abs(target.current - current.current) > 0.001) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    const start = () => {
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };
    start();
    window.addEventListener("resize", start);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", start);
    };
  }, []);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    target.current = Math.max(
      -1,
      Math.min(1, target.current + event.deltaY * 0.003),
    );
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = touchStartY.current - event.touches[0].clientY;
    touchStartY.current = event.touches[0].clientY;
    target.current = Math.max(
      -1,
      Math.min(1, target.current + delta * 0.0035),
    );
  };

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      className="fixed inset-0 h-[100dvh] w-full touch-none select-none overflow-hidden bg-[#0b1110] text-[#fdf1e1]"
      style={{ touchAction: "none" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          WebkitMaskImage: ARCH_MASK,
          maskImage: ARCH_MASK,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      >
        <div
          ref={contentRef}
          className="pointer-events-auto absolute inset-0 will-change-transform"
        >
          <img
            src={SKY_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex min-h-0 flex-col items-center justify-center px-4 text-center">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide backdrop-blur-md">
              多功能 Web 平台 · AI 建站生成
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.04] text-[#fdf1e1] drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl">
              多功能
              <span className="mt-1 block">Web 平台</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/90 sm:text-base">
              从 vibe 氛围到 UI 效果图、交互原型，再到完整可部署的前端代码。
              小游戏中心、内置浏览器、实时聊天室、网盘，按需组合，一次生成。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/workspace"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#e8702a] px-7 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                开始生成
              </Link>
              <Link
                to="/games"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                打开小游戏
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {MODULES.map((module) => (
                <Link
                  key={module.to}
                  to={module.to}
                  className="rounded-full bg-[#fdf1e1] px-4 py-2 text-xs font-semibold text-[#111411] transition-transform hover:scale-[1.03]"
                >
                  {module.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <img
        src={BRIDGE_IMAGE}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 z-30 h-full w-full object-cover"
      />

      <nav className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          to="/home"
          className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-[#fdf1e1]"
        >
          MODULO
        </Link>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/20 bg-white/10 px-2 py-1.5 backdrop-blur-md">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/20 hover:text-white sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Link
          to="/settings"
          className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur-md"
        >
          设置
        </Link>
      </nav>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 text-center text-xs text-white/80">
        滚动鼠标即可
        <span className="mx-auto mt-1 block h-8 w-px bg-white/70" />
      </div>
    </div>
  );
}
