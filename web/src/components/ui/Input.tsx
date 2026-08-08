import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-mint-300/50 focus:outline-none focus:ring-2 focus:ring-mint-300/20 ${className}`}
    />
  );
}
