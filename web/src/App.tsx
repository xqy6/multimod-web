import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { PageMeta } from "@/app/PageMeta";
import { RequireAuth } from "@/app/guards/RequireAuth";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));
const GeneratorPage = lazy(() => import("@/pages/GeneratorPage"));
const GamesPage = lazy(() => import("@/pages/GamesPage"));
const BrowserPage = lazy(() => import("@/pages/BrowserPage"));
const ChatHubPage = lazy(() => import("@/pages/ChatHubPage"));
const LanChatPage = lazy(() => import("@/pages/LanChatPage"));
const P2pChatPage = lazy(() => import("@/pages/P2pChatPage"));
const OfflineP2pPage = lazy(() => import("@/pages/OfflineP2pPage"));
const NetdiskPage = lazy(() => import("@/pages/NetdiskPage"));
const SharePage = lazy(() => import("@/pages/SharePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage"));

function PageLoader() {
  return <PageSkeleton />;
}

function HomeRedirect() {
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return <PageLoader />;
  }
  return <Navigate to="/home" replace />;
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Toast />
        <Suspense fallback={<PageLoader />}>
          <PageMeta />
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/share/:token" element={<SharePage />} />
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
                    <ChatHubPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/lan-chat"
              element={
                <AppShell>
                  <LanChatPage />
                </AppShell>
              }
            />
            <Route
              path="/p2p-chat"
              element={
                <AppShell>
                  <P2pChatPage />
                </AppShell>
              }
            />
            <Route
              path="/offline-p2p"
              element={
                <AppShell>
                  <OfflineP2pPage />
                </AppShell>
              }
            />
            <Route
              path="/netdisk"
              element={
                <RequireAuth>
                  <AppShell>
                    <NetdiskPage />
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
              path="/admin"
              element={
                <RequireAuth>
                  <AppShell>
                    <AdminPage />
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
    </ErrorBoundary>
  );
}
