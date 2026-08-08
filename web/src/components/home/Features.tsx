import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Gamepad2,
  Globe2,
  HardDrive,
  MessageSquareText,
} from "lucide-react";
import { Link } from "react-router-dom";

import { SectionHeading } from "@/components/ui/SectionHeading";

const features = [
  {
    icon: Gamepad2,
    title: "休闲小游戏中心",
    description:
      "内置 2048、贪吃蛇、俄罗斯方块，支持键盘与触控，分数可进入排行榜。",
    href: "/games",
    image: "/assets/games-cover.jpg",
    alt: "二次元风格游戏中心配图",
  },
  {
    icon: Globe2,
    title: "网页内置浏览器",
    description:
      "多标签页浏览，保存历史与书签；遇到拒绝嵌入的站点会给出友好提示。",
    href: "/browser",
    image: "/assets/browser-cover.jpg",
    alt: "内置浏览器界面图片",
  },
  {
    icon: MessageSquareText,
    title: "实时在线聊天室",
    description:
      "多房间实时消息、在线状态与消息持久化，无需自建服务器即可上线。",
    href: "/chat",
    image: "/assets/chat-cover.jpg",
    alt: "二次元风格实时聊天室配图",
  },
  {
    icon: HardDrive,
    title: "百度网盘式文件管理",
    description:
      "文件夹树、对象存储去重、分片上传与回收站，文件真实存储在服务器磁盘。",
    href: "/netdisk",
    image: "/assets/showcase-brand.jpg",
    alt: "网盘文件管理界面配图",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"
    >
      <SectionHeading
        eyebrow="功能板块"
        title="四大核心模块，一个平台"
        description="游戏、浏览器、聊天室与网盘独立可交付，也能组合进 AI 生成网站。"
      />

      <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
              <ArrowUpRight
                className="h-5 w-5 text-mist-500 transition-colors group-hover:text-mint-300"
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-6 text-xl font-bold text-mist-100">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-mist-400">
              {feature.description}
            </p>
            <Link
              to={feature.href}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-mint-300 transition-colors hover:text-mint-200"
            >
              进入模块
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div className="mt-6">
              <img
                src={feature.image}
                alt={feature.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-card border border-white/10 object-cover"
              />
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
