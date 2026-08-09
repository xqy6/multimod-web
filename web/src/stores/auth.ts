import { create } from "zustand";

import { shouldUseLocalBackend } from "@/lib/api";
import {
  getSession,
  onAuthStateChange,
  signOut as signOutService,
  toAppUser,
  type AppUser,
} from "@/services/auth";

let authListenerCleanup: { unsubscribe: () => void } | undefined;

export const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@local",
  display_name: "离线演示用户",
  role: "user",
  isAdmin: false,
  isDemo: true,
};

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  initialize: () => Promise<void>;
  setUser: (user: AppUser | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialize: async () => {
    if (shouldUseLocalBackend()) {
      set({ user: DEMO_USER, loading: false });
      return;
    }
    const { session } = await getSession();
    set({ user: session ? toAppUser(session.user!) : null, loading: false });
    authListenerCleanup?.unsubscribe();
    authListenerCleanup = onAuthStateChange((nextSession) => {
      set({ user: nextSession ? toAppUser(nextSession.user!) : null });
    });
  },
  setUser: (user) => set({ user }),
  signOut: async () => {
    await signOutService();
    set({ user: null });
  },
}));

if (typeof window !== "undefined") {
  const reconnect = () => {
    void useAuthStore.getState().initialize();
  };
  window.addEventListener("online", reconnect);
  window.addEventListener("offline", reconnect);
}
