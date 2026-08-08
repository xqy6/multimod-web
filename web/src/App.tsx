import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { useAuthStore } from "@/stores/auth";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));
const GeneratorPage = lazy(() => import("@/pages/GeneratorPage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const BrowserPage = lazy(() => import("@/pages/BrowserPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 text-mist-400">
      <span className="text-sm">正在加载页面…</span>
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/workspace"
            element={
              <RequireAuth>
                <AppShell>
                  <WorkspacePage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/generator/:projectId"
            element={
              <RequireAuth>
                <AppShell>
                  <GeneratorPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/games"
            element={
              <RequireAuth>
                <AppShell>
                  <GamesPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/browser"
            element={
              <RequireAuth>
                <AppShell>
                  <BrowserPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <AppShell>
                  <ChatPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <AppShell>
                  <SettingsPage />
                </AppShell>
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="页面不存在"
                description="你访问的页面还没有创建。"
              />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
