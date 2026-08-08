import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import {
  getSession,
  onAuthStateChange,
  signOut as signOutService,
  toAppUser,
  type AppUser,
} from "@/services/auth";

export const DEMO_USER: AppUser = {
  id: "demo-user",
  email: "demo@local",
  display_name: "演示用户",
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
    if (!supabase) {
      set({ user: DEMO_USER, loading: false });
      return;
    }
    const { session } = await getSession();
    set({ user: toAppUser(session), loading: false });
    onAuthStateChange((nextSession) => {
      set({ user: toAppUser(nextSession) });
    });
  },
  setUser: (user) => set({ user }),
  signOut: async () => {
    await signOutService();
    set({ user: null });
  },
}));
