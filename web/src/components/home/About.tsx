import { motion } from "framer-motion";
import { ArrowRight, Layers, Rocket, ShieldCheck, Zap } from "lucide-react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { assetUrl } from "@/lib/assets";

const stats = [
  { icon: Layers, value: "4", label: "核心功能模块" },
  { icon: Zap, value: "0", label: "台自建服务器" },
  { icon: Rocket, value: "1", label: "个 ZIP 部署包" },
];

export function About() {
  return (
    <section
      id="about"
      className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <SectionHeading
            align="left"
            eyebrow="关于平台"
            title="不是一次性写完的网站，而是按模块交付的生产流程"
            description="AI 先把真实业务逻辑拆成独立模块，再逐个交付可直接复制的代码。每个模块都能独立运行、独立测试、独立上线。"
          />

          <div className="mt-9 grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-card border border-white/10 bg-white/[0.03] p-4"
              >
                <stat.icon
                  className="h-4 w-4 text-mint-300"
                  aria-hidden="true"
                />
                <p className="mt-3 text-2xl font-bold text-mist-100">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs leading-5 text-mist-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm text-mist-400">
            <ShieldCheck className="h-4 w-4 text-mint-300" aria-hidden="true" />
            数据与素材统一存储在 Supabase，权限策略按表隔离。
          </div>

          <ButtonLink href="#modules" variant="ghost" className="mt-8">
            查看模块组合
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src={assetUrl("assets/about-cover.jpg")}
            alt="二次元风格关于平台配图"
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-panel border border-white/10 object-cover shadow-soft"
          />
        </motion.div>
      </div>
    </section>
  );
}
