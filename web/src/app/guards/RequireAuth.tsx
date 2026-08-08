import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/stores/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-mist-300">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span className="ml-3 text-sm">正在加载账号状态</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
