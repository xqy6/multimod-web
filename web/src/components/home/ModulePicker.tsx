import { motion } from "framer-motion";
import {
  Check,
  Gamepad2,
  Globe2,
  LayoutTemplate,
  MessageSquareText,
  Upload,
  Wand2,
} from "lucide-react";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";

const modules = [
  {
    id: "hero",
    name: "品牌首页",
    description: "深色玻璃拟态落地页，支持视频与渐变流体背景。",
    icon: LayoutTemplate,
  },
  {
    id: "games",
    name: "小游戏中心",
    description: "2048、贪吃蛇、俄罗斯方块，带计分与排行榜。",
    icon: Gamepad2,
  },
  {
    id: "browser",
    name: "内置浏览器",
    description: "多标签浏览、历史与书签，受限站点友好提示。",
    icon: Globe2,
  },
  {
    id: "chat",
    name: "实时聊天室",
    description: "多房间消息、在线状态与消息持久化。",
    icon: MessageSquareText,
  },
  {
    id: "assets",
    name: "素材上传",
    description: "图片与文字素材统一管理，自动接入生成结果。",
    icon: Upload,
  },
  {
    id: "ai",
    name: "AI 生成工作台",
    description: "vibe 描述、模板渲染、代码预览与 ZIP 导出。",
    icon: Wand2,
  },
];

export function ModulePicker() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["hero", "games", "chat"]),
  );

  const toggleModule = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="modules" className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden="true"
      />
      <SectionHeading
        eyebrow="模块组合"
        title="选择要开启的功能板块"
        description="点击卡片即可组合你的网站结构，预览会随选择实时更新。"
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const active = selected.has(module.id);
          return (
            <motion.button
              key={module.id}
              type="button"
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleModule(module.id)}
              className={`relative flex items-start gap-4 rounded-card border p-5 text-left transition-colors ${
                active
                  ? "border-mint-300/50 bg-mint-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
              aria-pressed={active}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  active
                    ? "bg-mint-300/15 text-mint-200 ring-mint-300/30"
                    : "bg-white/5 text-mist-300 ring-white/10"
                }`}
              >
                <module.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold text-mist-100">
                  {module.name}
                </span>
                <span className="mt-1.5 block text-sm leading-6 text-mist-400">
                  {module.description}
                </span>
              </span>
              <span
                className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                  active
                    ? "bg-mint-300 text-ink-950"
                    : "bg-white/5 text-transparent ring-1 ring-white/15"
                }`}
                aria-hidden="true"
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-10 flex flex-col items-center justify-between gap-5 rounded-panel border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md sm:flex-row"
      >
        <div>
          <p className="text-sm font-semibold text-mist-100">
            已选择 {selected.size} 个功能板块
          </p>
          <p className="mt-1 text-xs text-mist-400">
            预览将展示这些模块在生成网站中的排列顺序。
          </p>
        </div>
        <ButtonLink href="/workspace" variant="primary">
          组合预览
        </ButtonLink>
      </motion.div>
    </section>
  );
}
