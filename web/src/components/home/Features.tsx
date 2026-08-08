import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Gamepad2,
  Globe2,
  MessageSquareText,
} from "lucide-react";

import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { SectionHeading } from "@/components/ui/SectionHeading";

const features = [
  {
    icon: Gamepad2,
    title: "休闲小游戏中心",
    description:
      "内置 2048、贪吃蛇、俄罗斯方块，支持键盘与触控，分数可进入排行榜。",
    placeholder: "游戏截图占位：2048 或贪吃蛇界面",
    hint: "建议 4:3 游戏实机截图或操作演示动图。",
  },
  {
    icon: Globe2,
    title: "网页内置浏览器",
    description:
      "多标签页浏览，保存历史与书签；遇到拒绝嵌入的站点会给出友好提示。",
    placeholder: "浏览器截图占位：带标签页的网页界面",
    hint: "建议 16:10 浏览器窗口截图。",
  },
  {
    icon: MessageSquareText,
    title: "实时在线聊天室",
    description:
      "多房间实时消息、在线状态与消息持久化，无需自建服务器即可上线。",
    placeholder: "聊天界面占位：房间列表与消息流",
    hint: "建议 16:9 聊天室界面截图。",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
      <SectionHeading
        eyebrow="功能板块"
        title="三大核心模块，一个平台"
        description="每个模块独立可交付，也能组合进 AI 生成网站：从氛围描述到可运行前端，一次完成。"
      />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
            whileHover={{ y: -8 }}
            className="group rounded-panel border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-300/10 text-mint-300 ring-1 ring-mint-300/20">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowUpRight className="h-5 w-5 text-mist-500 transition-colors group-hover:text-mint-300" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-mist-100">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-mist-400">
              {feature.description}
            </p>
            <div className="mt-6">
              <MediaPlaceholder
                label={feature.placeholder}
                hint={feature.hint}
                aspect="aspect-[4/3]"
              />
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
