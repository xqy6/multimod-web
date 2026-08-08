import { motion } from "framer-motion";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`max-w-3xl ${alignment}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-bold leading-tight text-mist-100 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-7 text-mist-400 sm:text-lg">
          {description}
        </p>
      ) : null}
    </motion.div>
  );
}
