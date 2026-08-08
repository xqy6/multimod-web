import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { useToastStore } from "@/stores/toast";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toast() {
  const toasts = useToastStore((state) => state.toasts);
  const remove = useToastStore((state) => state.remove);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-card border p-4 shadow-soft backdrop-blur-xl ${
                toast.type === "error"
                  ? "border-red-400/25 bg-red-950/80 text-red-100"
                  : toast.type === "success"
                    ? "border-mint-300/25 bg-ink-900/90 text-mint-100"
                    : "border-white/10 bg-ink-900/90 text-mist-100"
              }`}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm leading-6">{toast.message}</p>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100"
                aria-label="关闭提示"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
