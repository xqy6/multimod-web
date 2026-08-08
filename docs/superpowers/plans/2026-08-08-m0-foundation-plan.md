# M0 项目骨架与设计系统实施计划

- 日期：2026-08-08
- 状态：待确认
- 上游文档：`docs/superpowers/specs/2026-08-08-multi-module-platform-design.md`

## 1. 目标

交付一个可本地运行的 Vite + React + TypeScript 项目骨架，包含设计令牌、基础 UI 组件、应用壳、路由、Supabase 客户端和最小测试。它是后续 M1-M7 的公共底座。

## 2. 范围

### 范围内

- 在 `web/` 初始化 Vite React TS 项目。
- 接入 React Router、Zustand、lucide-react、Supabase 客户端。
- 接入 Tailwind CSS v4 与 Framer Motion，作为 MotionSites 品牌首页的基础依赖。
- 设计令牌：亮/暗主题、主色板、间距、字号、圆角、阴影、动效。
- 基础组件：Button、Input、IconButton、Modal、Tabs、Tooltip、Toast、EmptyState、ErrorBoundary。
- 应用壳：左侧导航 + 顶栏 + 内容区，桌面与移动端自适应。
- 路由与占位页：首页、登录、工作台、生成器、游戏、浏览器、聊天、设置、404。
- `.env.example` 与 Supabase 客户端降级处理，缺少环境变量时不崩溃。
- Vitest 测试环境与基础单元测试。

### 范围外

- MotionSites 品牌首页（M1）。
- 账号登录与工作台数据（M2）。
- 生成引擎、游戏、浏览器、聊天室逻辑（M3-M6）。
- Supabase 表、迁移与 RLS（随各模块交付）。

## 3. 技术决策

- 包管理器：npm。
- 样式：Tailwind CSS v4 + 设计令牌（CSS 变量），按 MotionSites 提示词统一技术栈。
- 客户端状态：Zustand，用于主题、Toast 等 UI 状态。
- 图标：lucide-react。
- 路由：react-router-dom。
- 实时与数据：@supabase/supabase-js，M0 只初始化客户端。
- 动效：Framer Motion，M0 只安装与验证，具体首页动效在 M1 实现。
- 测试：Vitest + React Testing Library。

## 4. 目录结构

```text
web/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ .env.example
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ router.tsx
│  │  └─ AppShell.tsx
│  ├─ components/ui/
│  │  ├─ Button.tsx
│  │  ├─ Input.tsx
│  │  ├─ IconButton.tsx
│  │  ├─ Modal.tsx
│  │  ├─ Tabs.tsx
│  │  ├─ Tooltip.tsx
│  │  ├─ Toast.tsx
│  │  ├─ EmptyState.tsx
│  │  └─ ErrorBoundary.tsx
│  ├─ lib/
│  │  └─ supabase.ts
│  ├─ pages/
│  │  ├─ HomePage.tsx
│  │  ├─ LoginPage.tsx
│  │  ├─ WorkspacePage.tsx
│  │  ├─ GeneratorPage.tsx
│  │  ├─ GamesPage.tsx
│  │  ├─ BrowserPage.tsx
│  │  ├─ ChatPage.tsx
│  │  ├─ SettingsPage.tsx
│  │  └─ NotFoundPage.tsx
│  ├─ stores/
│  │  ├─ theme.ts
│  │  └─ toast.ts
│  ├─ styles/
│  │  ├─ tailwind.css
│  │  ├─ tokens.css
│  │  └─ base.css
│  └─ test/
│     ├─ setup.ts
│     └─ tokens.test.ts
└─ README.md
```

## 5. 实施步骤

1. 脚手架：`web/` 初始化 Vite React TS，清理模板演示代码。
2. 依赖：安装 react-router-dom、zustand、lucide-react、@supabase/supabase-js、framer-motion、tailwindcss、@tailwindcss/vite、vitest、@testing-library/react。
3. 工程配置：TS 路径别名 `@/* -> src/*`，ESLint 与 Prettier 配置。
4. 设计令牌：`tailwind.css` 通过 Tailwind v4 CSS-first 方式注册设计令牌；`tokens.css` 定义色板、间距、字号、圆角、阴影、动效；`base.css` 提供基础排版与 reset。
5. UI 组件：按上面的文件逐个实现，统一使用 Tailwind 工具类与设计令牌，带 TypeScript 类型。
6. 状态：`theme` 支持亮/暗主题切换并持久化到 localStorage；`toast` 管理消息队列。
7. Supabase：`lib/supabase.ts` 读取 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，缺少配置时导出空客户端并输出中文警告。
8. 路由：配置全部页面路由与 404，应用内页面用 `AppShell` 包裹。
9. 应用壳：左侧导航、顶栏、移动端抽屉菜单、内容区 Outlet。
10. 测试：Vitest 配置与设计令牌/主题切换的基础单元测试。
11. 文档：更新 `README.md`，写明安装、开发、测试、环境变量说明。

## 6. 验收标准

- `npm install`、`npm run dev`、`npm run test`、`npm run build` 全部可用。
- 首页、登录、工作台、生成器、游戏、浏览器、聊天、设置、404 路由可访问。
- 亮/暗主题可切换，刷新后保持。
- Tailwind CSS v4 构建正常，Framer Motion 依赖可被 M1 直接使用。
- 360 / 768 / 1440 宽度下应用壳无横向滚动与元素重叠。
- 缺少 Supabase 环境变量时应用仍可启动并显示警告。
- 基础组件均使用设计令牌，无硬编码颜色散落。

## 7. 测试计划

- 单元：主题切换与持久化、设计令牌取值。
- 组件：ErrorBoundary 渲染兜底、Toast 消息出现与消失。
- 手动验证：桌面与移动端视口的导航与主题切换。

## 8. 风险与对策

- npm 安装需要网络：如遇沙箱网络限制，申请临时网络权限。
- Vite 模板版本差异：以当前稳定版为准，锁住关键依赖版本。
- Supabase 未配置：客户端降级为空实现，页面显示配置提示，不阻塞开发。

## 9. 完成定义

- M0 代码在 `web/` 下可运行。
- 测试与构建通过。
- 实现结果提交到 git。
