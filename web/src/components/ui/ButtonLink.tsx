import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonLinkProps extends HTMLMotionProps<"a"> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300/70";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-mint-300 text-ink-950 shadow-[0_16px_40px_rgba(111,203,164,0.22)] hover:bg-mint-200",
  ghost:
    "bg-white/5 text-mist-100 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20",
  soft: "bg-mint-300/10 text-mint-200 ring-1 ring-mint-300/25 hover:bg-mint-300/15",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-5 text-sm",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <motion.a
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.a>
  );
}
