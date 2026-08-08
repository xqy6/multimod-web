import { motion } from "framer-motion";
import {
  ArrowRight,
  MousePointerClick,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { assetUrl } from "@/lib/assets";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = () => {
    if (!videoRef.current) return;
    const next = !soundOn;
    videoRef.current.muted = !next;
    setSoundOn(next);
  };

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-16"
    >
      <motion.div
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(111,203,164,0.14), rgba(142,138,203,0.12), rgba(220,152,106,0.10), rgba(111,203,164,0.14))",
          backgroundSize: "300% 300%",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 10%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-8"
      >
        <div>
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-mist-300 ring-1 ring-white/10 backdrop-blur-md"
          >
            <Sparkles
              className="h-3.5 w-3.5 text-mint-300"
              aria-hidden="true"
            />
            多功能 Web 平台 · AI 建站生成
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 text-4xl font-bold leading-[1.08] tracking-tight text-mist-100 sm:text-6xl lg:text-7xl"
          >
            用一句话描述氛围，
            <span className="block bg-gradient-to-r from-mint-200 via-mint-300 to-lilac-200 bg-clip-text text-transparent">
              生成可运行的多功能网站。
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-7 max-w-xl text-base leading-8 text-mist-400 sm:text-lg"
          >
            从 vibe 氛围到 UI 效果图、交互原型，再到完整可部署的前端代码。
            小游戏中心、内置浏览器、实时聊天室、网盘，按需组合，一次生成。
          </motion.p>

          <motion.div
            variants={item}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="/workspace" variant="primary" size="lg">
              开始生成
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="#modules" variant="ghost" size="lg">
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
              查看模块
            </ButtonLink>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-mist-400"
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-300" />
              无需自建服务器
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lilac-300" />
              实时聊天
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-peach-300" />
              可部署前端包
            </span>
          </motion.div>
        </div>

        <motion.div variants={item} className="relative">
          <div className="absolute -inset-6 rounded-hero bg-gradient-to-br from-mint-300/10 via-transparent to-lilac-300/10 blur-2xl" />
          <div className="relative aspect-[4/3] overflow-hidden rounded-hero border border-white/10 bg-ink-900 shadow-soft">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={assetUrl("assets/hero.mp4")}
              poster={assetUrl("assets/hero-poster.jpg")}
              preload="metadata"
              autoPlay
              muted
              loop
              playsInline
              aria-label="首页主视觉品牌视频"
            />
            <span className="absolute bottom-4 left-4 rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-medium text-mist-200 ring-1 ring-white/10 backdrop-blur-md">
              首页主视觉 · 品牌视频
            </span>
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink-950/70 text-mist-100 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-ink-900/80"
              aria-label={soundOn ? "关闭声音" : "开启声音"}
              aria-pressed={soundOn}
            >
              {soundOn ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
            className="absolute -bottom-6 -left-5 hidden rounded-card border border-white/10 bg-ink-900/80 p-5 backdrop-blur-xl sm:block"
          >
            <p className="text-xs text-mist-400">品牌视频素材</p>
            <p className="mt-1 text-sm font-semibold text-mist-100">
              循环播放 · 低透明度 · 不抢内容
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-mist-500 sm:block"
      >
        <div className="flex h-12 w-7 items-start justify-center rounded-full border border-white/15 p-1.5">
          <motion.span
            animate={{ y: [0, 16, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-mint-300"
          />
        </div>
      </motion.div>
    </section>
  );
}
