import { motion } from "framer-motion";
import { Globe, Mail, Sparkles } from "lucide-react";

const featureLinks = [
  { label: "功能", href: "#features" },
  { label: "案例", href: "#showcase" },
  { label: "模块", href: "#modules" },
  { label: "关于", href: "#about" },
  { label: "FAQ", href: "#faq" },
];

const moduleLinks = [
  { label: "小游戏中心", href: "/games" },
  { label: "内置浏览器", href: "/browser" },
  { label: "聊天室", href: "/chat" },
  { label: "生成工作台", href: "/workspace" },
];

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="border-t border-white/10 bg-ink-900/40"
    >
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-mint-300/25 to-lilac-300/20 text-mint-200 ring-1 ring-white/10">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-mist-100">
                MODULO
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-mist-400">
              多功能 Web 平台骨架版本：AI
              建站生成、小游戏中心、内置浏览器与实时聊天室将按模块逐步交付。
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist-500">
              页面
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {featureLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-mist-300 transition-colors hover:text-mist-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist-500">
              模块
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {moduleLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-mist-300 transition-colors hover:text-mist-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-mist-500">
            © 2026 MODULO · 骨架版本，品牌文案与素材待替换
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#home"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 ring-1 ring-white/10 transition-colors hover:text-mist-100"
              aria-label="官网占位链接"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#home"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-mist-300 ring-1 ring-white/10 transition-colors hover:text-mist-100"
              aria-label="联系邮箱占位链接"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
