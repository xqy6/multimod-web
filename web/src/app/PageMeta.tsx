import { useLocation } from "react-router-dom";

import { usePageMeta } from "@/hooks/usePageMeta";

const pages = [
  {
    path: "/home",
    title: "MODULO - 多功能 Web 平台",
    description:
      "AI 建站生成、小游戏中心、内置浏览器、实时聊天室与网盘，一个平台组合出可部署的完整网站。",
  },
  {
    path: "/login",
    title: "登录 - MODULO",
    description: "登录或注册 MODULO 多功能 Web 平台账号，继续创作你的网站。",
  },
  {
    path: "/workspace",
    title: "工作台 - MODULO",
    description: "创建、管理和导出你的 AI 建站项目。",
  },
  {
    path: "/generator",
    title: "网站生成器 - MODULO",
    description: "用 vibe 描述氛围，生成可运行、可导出的完整网站。",
  },
  {
    path: "/games",
    title: "小游戏中心 - MODULO",
    description:
      "扫雷、记忆翻牌、打地鼠、2048、贪吃蛇、俄罗斯方块与蘑菇漂流，全部本地运行。",
  },
  {
    path: "/browser",
    title: "内置浏览器 - MODULO",
    description: "多标签网页浏览、历史记录与书签，常用入口一键打开。",
  },
  {
    path: "/chat",
    title: "聊天室 - MODULO",
    description: "在线聊天、局域网聊天、P2P 与离线直连，实时收发消息。",
  },
  {
    path: "/lan-chat",
    title: "局域网聊天 - MODULO",
    description: "同一局域网内的设备通过本地服务实时聊天。",
  },
  {
    path: "/p2p-chat",
    title: "P2P 聊天 - MODULO",
    description: "浏览器之间点对点实时聊天，消息不经过自己的服务器。",
  },
  {
    path: "/offline-p2p",
    title: "离线 P2P 聊天 - MODULO",
    description: "完全离线状态下两台设备互相复制连接码即可直连聊天。",
  },
  {
    path: "/netdisk",
    title: "网盘 - MODULO",
    description: "文件夹管理、分片上传、断点续传、回收站与分享下载。",
  },
  {
    path: "/settings",
    title: "设置 - MODULO",
    description: "管理个人资料、头像与账号设置。",
  },
  {
    path: "/admin",
    title: "管理后台 - MODULO",
    description: "平台用户、项目、聊天记录与网盘数据管理。",
  },
  {
    path: "/share",
    title: "文件分享 - MODULO",
    description: "查看并下载分享的文件或文件夹。",
  },
];

export function PageMeta() {
  const { pathname } = useLocation();
  const page =
    pages.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    ) ?? pages[0];
  const jsonLd =
    page.path === "/home"
      ? [
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MODULO",
            alternateName: "多功能 Web 平台",
            url:
              typeof window === "undefined"
                ? "https://xieqiyan.pages.dev"
                : window.location.origin,
            inLanguage: "zh-CN",
            description: page.description,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MODULO",
            url:
              typeof window === "undefined"
                ? "https://xieqiyan.pages.dev"
                : window.location.origin,
            logo: `${
              typeof window === "undefined"
                ? "https://xieqiyan.pages.dev"
                : window.location.origin
            }/icons/icon-512.png`,
          },
        ]
      : undefined;

  usePageMeta({
    title: page.title,
    description: page.description,
    image: "/og-cover.png",
    jsonLd,
  });

  return null;
}
