import { motion } from "framer-motion";
import { useState } from "react";

import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { SectionHeading } from "@/components/ui/SectionHeading";

const categories = ["全部", "游戏", "工具", "聊天"] as const;

const cases = [
  {
    title: "游戏主题门户",
    category: "游戏",
    description: "以游戏中心为核心的站点，内置排行榜、个人最佳与成就入口。",
    placeholder: "案例截图占位：游戏门户首页",
    hint: "建议 16:9 完整首页截图。",
  },
  {
    title: "团队工具台",
    category: "工具",
    description: "把浏览器、素材库与生成工作台组合成团队内部工具入口。",
    placeholder: "案例截图占位：团队工具台界面",
    hint: "建议 16:9 工作台截图。",
  },
  {
    title: "实时社区空间",
    category: "聊天",
    description: "围绕房间与实时消息搭建的轻量社区，支持在线状态与历史消息。",
    placeholder: "案例截图占位：聊天社区界面",
    hint: "建议 16:9 聊天室截图。",
  },
  {
    title: "品牌展示站",
    category: "工具",
    description: "用 vibe 描述快速生成品牌首页，图片与视频素材可随时替换。",
    placeholder: "案例截图占位：品牌落地页",
    hint: "建议 16:9 首屏截图。",
  },
];

type Category = (typeof categories)[number];

export function Showcase() {
  const [activeCategory, setActiveCategory] = useState<Category>("全部");
  const visibleCases =
    activeCategory === "全部"
      ? cases
      : cases.filter((item) => item.category === activeCategory);

  return (
    <section id="showcase" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <SectionHeading
        eyebrow="案例展示"
        title="从想法到上线的完整路径"
        description="同一套生成引擎可以产出游戏门户、团队工具、社区空间与品牌站。"
      />

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {categories.map((category) => {
          const active = activeCategory === category;
          return (
            <motion.button
              key={category}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-mint-300 text-ink-950"
                  : "bg-white/5 text-mist-300 ring-1 ring-white/10 hover:text-mist-100"
              }`}
            >
              {category}
            </motion.button>
          );
        })}
      </div>

      <motion.div layout className="mt-10 grid gap-6 md:grid-cols-2">
        {visibleCases.map((item) => (
          <motion.article
            key={item.title}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            whileHover={{ y: -6 }}
            className="overflow-hidden rounded-panel border border-white/10 bg-white/[0.03]"
          >
            <MediaPlaceholder
              label={item.placeholder}
              hint={item.hint}
              aspect="aspect-video"
              className="rounded-none border-0"
            />
            <div className="p-6">
              <span className="inline-flex rounded-full bg-white/5 px-3 py-1 text-xs text-mint-300 ring-1 ring-white/10">
                {item.category}
              </span>
              <h3 className="mt-4 text-xl font-bold text-mist-100">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-mist-400">
                {item.description}
              </p>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
