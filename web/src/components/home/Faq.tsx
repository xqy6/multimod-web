import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/ui/SectionHeading";

const faqItems = [
  {
    question: "生成后的代码可以直接部署吗？",
    answer:
      "可以。生成器会导出包含页面、模块与配置说明的 ZIP 包，静态站点可直接托管到 Vercel 或任意静态平台。",
  },
  {
    question: "内置浏览器能访问所有网站吗？",
    answer:
      "MVP 阶段采用 iframe 方案，部分网站会拒绝被嵌入。我们会检测常见受限站点并给出中文提示，后续再评估代理方案。",
  },
  {
    question: "聊天室需要自己准备服务器吗？",
    answer:
      "不需要。聊天室基于 Supabase Realtime，账号、消息持久化和在线状态都由托管服务提供。",
  },
  {
    question: "上传的图片和文字素材存储在哪里？",
    answer:
      "图片存储在 Supabase Storage，文字素材存储在项目记录中；每条数据都受 RLS 权限策略保护。",
  },
  {
    question: "我需要准备哪些账号？",
    answer:
      "本地开发只需 Vercel 与 Supabase 两个免费账号。Vercel 托管前端，Supabase 提供数据库、认证、实时消息与存储。",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-24 lg:py-32">
      <SectionHeading
        eyebrow="FAQ"
        title="常见问题"
        description="关于生成、部署、聊天室与素材存储的高频疑问。"
      />

      <div className="mt-12 space-y-3">
        {faqItems.map((item, index) => {
          const open = openIndex === index;
          return (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={`overflow-hidden rounded-card border transition-colors ${
                open
                  ? "border-mint-300/30 bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={open}
              >
                <span className="text-base font-semibold text-mist-100">
                  {item.question}
                </span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-mist-300 ring-1 ring-white/10"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-sm leading-7 text-mist-400">
                      {item.answer}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
