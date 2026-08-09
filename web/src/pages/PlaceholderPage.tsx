import { ArrowLeft } from "lucide-react";

import { ButtonLink } from "@/components/ui/ButtonLink";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="lithos-shell flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center text-mist-100">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
        多功能 Web 平台
      </p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-mist-400">
        {description}
      </p>
      <ButtonLink href="/" variant="ghost" className="mt-8">
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </ButtonLink>
    </main>
  );
}
