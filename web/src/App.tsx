import { BrowserRouter, Route, Routes } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import PlaceholderPage from "@/pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/workspace"
          element={
            <PlaceholderPage
              title="工作台"
              description="这里将承载项目创建、素材管理与生成记录。"
            />
          }
        />
        <Route
          path="/generator/:projectId"
          element={
            <PlaceholderPage
              title="生成器"
              description="这里将实现 vibe 描述、模块选择、素材上传与代码预览。"
            />
          }
        />
        <Route
          path="/games"
          element={
            <PlaceholderPage
              title="小游戏中心"
              description="2048、贪吃蛇、俄罗斯方块将在后续迭代中开放。"
            />
          }
        />
        <Route
          path="/browser"
          element={
            <PlaceholderPage
              title="内置浏览器"
              description="多标签浏览、历史与书签将在后续迭代中开放。"
            />
          }
        />
        <Route
          path="/chat"
          element={
            <PlaceholderPage
              title="聊天室"
              description="多房间实时聊天将在后续迭代中开放。"
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              title="设置"
              description="个人资料与偏好设置将在后续迭代中开放。"
            />
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
