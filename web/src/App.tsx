import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/guards/RequireAuth";
import GeneratorPage from "@/pages/GeneratorPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import SettingsPage from "@/pages/SettingsPage";
import WorkspacePage from "@/pages/WorkspacePage";
import { useAuthStore } from "@/stores/auth";

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
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
                <PlaceholderPage
                  title="小游戏中心"
                  description="2048、贪吃蛇、俄罗斯方块将在后续迭代中开放。"
                />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/browser"
          element={
            <RequireAuth>
              <AppShell>
                <PlaceholderPage
                  title="内置浏览器"
                  description="多标签浏览、历史与书签将在后续迭代中开放。"
                />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <AppShell>
                <PlaceholderPage
                  title="聊天室"
                  description="多房间实时聊天将在后续迭代中开放。"
                />
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
    </BrowserRouter>
  );
}
