# 多功能 AI 建站平台设计文档

- 日期：2026-08-08
- 状态：待审阅
- 目标读者：平台负责人、实现工程师

## 1. 背景与目标

构建一个多功能 Web 平台，核心能力包括：

1. 休闲小游戏中心：2048、贪吃蛇、俄罗斯方块。
2. 网页内置浏览器：URL 输入、标签页、历史记录，MVP 采用 iframe 方案。
3. 实时在线聊天室：多房间、账号、消息持久化、实时收发。
4. AI 建站生成流程：vibe 描述 + 功能模块选择 + 素材上传，经过 UI 效果图、交互原型，最终导出可运行、可部署的前端代码包。

平台自身需要一套品牌首页，视觉与结构以用户提供的 MotionSites 提示词为种子，配合用户提供的图片和视频素材落地。

## 2. 范围与边界

### MVP 范围内

- MotionSites 品牌首页，素材槽位可替换，桌面与移动端完整适配。
- 平台应用壳、账号登录、个人工作台。
- 生成引擎：风格解析、模板渲染、素材上传、预览、ZIP 导出。
- 小游戏中心：2048、贪吃蛇、俄罗斯方块，含本地计分与服务端排行榜。
- 内置浏览器：iframe MVP、标签、历史、书签、受限提示。
- 聊天室：多房间、账号、消息持久化、实时订阅、在线状态。
- 部署：Vercel 前端 + Supabase 后端，配置与迁移文件齐全。

### MVP 范围外

- 真实 LLM 自动生成完整代码（预留接口，后续接入 Edge Function 代理）。
- 后端代理式浏览器，可访问拒绝 iframe 嵌入的网站。
- 一键远程部署到用户自己的 Vercel 项目。
- 公开运营所需的重型审核、举报、支付、多租户团队管理。

## 3. 技术架构

采用无服务器方案，前端静态托管，数据与实时能力由 Supabase 提供。

```text
D:\xqy的网页
├─ web/         React + Vite + TypeScript，部署到 Vercel
├─ supabase/    数据库迁移、RLS、Realtime、Storage、Edge Function
├─ shared/      共享类型、设计令牌、模板定义、生成引擎核心
├─ docs/        设计文档与交付说明
└─ README.md    项目说明与本地启动方式
```

技术选型：

- 前端：React、Vite、TypeScript、React Router。
- 状态：Zustand 管理客户端状态，服务数据通过 Supabase 客户端获取。
- UI：CSS 变量设计令牌 + CSS Modules；图标使用 lucide-react。
- 动效：品牌首页使用 CSS 关键帧与 Framer Motion；应用内部动效克制，尊重 `prefers-reduced-motion`。
- 实时：Supabase Realtime 订阅房间消息与在线状态。
- 存储：Supabase Storage 保存图片、视频、导出包。
- 测试：Vitest + React Testing Library，关键流程用 Playwright。

## 4. 核心数据模型

### profiles

- `id`：uuid，关联 `auth.users`。
- `email`、`display_name`、`avatar_url`、`created_at`。
- 用户注册后由触发器自动创建个人资料行。

### projects

- `id`、`owner_id`。
- `title`、`vibe_prompt`、`style_params`（jsonb）、`modules`（text[]）。
- `status`：draft / generating / preview / exported。
- `created_at`、`updated_at`。

### assets

- `id`、`project_id`、`owner_id`。
- `kind`：image / text。
- `name`、`storage_path` 或 `content`、`created_at`。
- 图片存 Supabase Storage，文字素材直接存字段。

### rooms / room_members / messages

- `rooms`：`id`、`name`、`slug`、`is_public`、`created_by`、`created_at`。
- `room_members`：`room_id`、`user_id`、`role`、`joined_at`，复合主键。
- `messages`：`id`、`room_id`、`user_id`、`body`、`created_at`。

### generated_sites

- `id`、`project_id`、`version`。
- `package_url`：导出包地址。
- `deploy_url`：部署地址，MVP 阶段可留空。
- `created_at`。

### scores

- `id`、`game_id`、`user_id`、`score`、`created_at`。
- 同一用户同一游戏保留最佳成绩，排行榜按分数降序。

所有数据表启用 RLS：用户只能管理自己的资料、项目和素材；房间与消息对已登录用户按策略开放；Storage 桶按项目归属隔离。

## 5. 页面与路由

- `/`：MotionSites 品牌首页，公开访问。
- `/login`、`/register`：Supabase Auth。
- `/workspace`：个人工作台，项目列表与新建入口。
- `/generator/:projectId`：生成器，分步完成描述、选模块、素材、预览、导出。
- `/games`：游戏中心。
- `/browser`：内置浏览器。
- `/chat`：聊天室。
- `/settings`：个人设置。

应用内路由由登录守卫保护；品牌首页与登录页公开。

## 6. 模块设计

### M0 项目骨架与设计系统

- 初始化 Vite + React + TS，接入 ESLint、Prettier、React Router、Supabase 客户端。
- 设计令牌：亮/暗主题、主色板、间距、字号、8px 圆角卡片。
- 基础组件：按钮、输入框、图标按钮、弹窗、标签页、Tooltip、Toast、空状态、错误边界。
- 应用壳：左侧导航 + 顶栏 + 内容区，桌面与手机自适应。

### M1 品牌首页（MotionSites 种子）

- 输入依赖：用户提供的 MotionSites 完整提示词、图片、视频、品牌名与 Logo。
- 落地方式：将提示词解析为“结构 + 风格 + 动效 + 素材槽位”，转换为平台自有首页模板。
- 素材替换：提示词中的外链占位素材统一替换为 Supabase Storage 中的本地素材。
- 适配要求：覆盖 360 / 768 / 1440 宽度，首屏无内容重叠，视频延迟加载，支持减弱动效。
- 验收：桌面与移动端截图检查、素材可正常加载、无布局溢出、键盘可操作。

### M2 账号与工作台

- 邮箱魔法链接或密码登录，登录后自动创建 `profiles`。
- 个人资料编辑：昵称、头像。
- 工作台：项目创建、列表、删除，按状态筛选。
- 所有项目数据通过 RLS 限制为本人可见。

### M3 生成引擎

- 第一步：vibe 描述与风格关键词输入。
- 第二步：勾选要生成的功能模块（首页、游戏中心、浏览器、聊天室、图库、特性、联系等）。
- 第三步：上传图片/文字素材，存入项目资产。
- 风格解析器：把 vibe 关键词映射为 `ThemeConfig`，包含色系、排版、密度、动效等级、背景类型。
- 模板注册表：内置若干可生成模板，与品牌首页模板分离。
- 预览：在沙箱 iframe 中渲染生成结果，实时反映模块与素材变化。
- 导出：浏览器端生成 ZIP，包含 `index.html`、`assets/`、`modules/`、`config.example.js`、`README.md`，可直接静态部署。
- AI 预留：后续通过 Supabase Edge Function 代理 LLM，不在前端暴露 Key。

### M4 小游戏中心

- 游戏清单：2048、贪吃蛇、俄罗斯方块。
- 每款游戏独立模块，包含渲染、状态机、键盘与移动端触控、暂停/重开。
- 分数写入 `scores` 相关服务，MVP 支持个人最佳与服务端排行榜。
- 游戏逻辑与 UI 分离，便于以后作为生成站点模块复用。

### M5 内置浏览器

- 地址栏输入校验：仅允许 http / https。
- iframe 嵌入，多标签页切换、新建、关闭。
- 历史记录本地保存，支持书签与常用站点快捷入口。
- 检测常见拒绝嵌入站点，显示中文受限提示，不尝试绕过。
- 不保存密码、不处理下载、不在 iframe 外打开第三方页面。

### M6 聊天室

- 房间列表、创建房间、加入/离开。
- 消息写入 `messages`，通过 Supabase Realtime 实时广播。
- 在线状态与输入中状态通过 Presence 通道实现。
- 消息分页加载历史。
- 管理员可删除房间内消息，普通成员仅能删除自己的消息。

### M7 部署上线

- Vercel 项目配置、环境变量模板。
- Supabase 迁移脚本与种子数据。
- README 提供本地开发、环境变量、上线步骤。
- 可选 GitHub Actions：lint、test、build。

## 7. 非功能要求

- 性能：品牌首页首屏 LCP 目标 3 秒内；游戏、聊天等路由按需加载。
- 响应式：360px 至 1440px 可用，无横向滚动与元素重叠。
- 可访问性：键盘可达、焦点可见、语义化标签、`prefers-reduced-motion` 降级。
- 错误处理：全局错误边界 + Toast，Supabase 错误映射为中文提示。
- 安全：全部表启用 RLS，密钥只存在于服务端环境，iframe 限制第三方内容，用户输入统一转义。
- 数据：素材与消息持久化在 Supabase，本地历史仅作浏览器辅助功能。

## 8. 测试策略

- 单元测试：风格解析器、游戏核心逻辑、模板渲染器、消息服务。
- 组件测试：基础组件、生成器向导、聊天输入与消息列表。
- 端到端测试：登录、创建项目、生成预览、玩游戏、打开浏览器、发送聊天消息。
- 视觉测试：品牌首页在 360 / 768 / 1440 视口截图，检查素材渲染与布局溢出。

## 9. 交付顺序与验收

1. M0 项目骨架：本地可启动，设计系统与路由可用。
2. M1 品牌首页：MotionSites 素材替换完成，响应式验收通过。
3. M2 账号与工作台：注册、登录、项目 CRUD 可用。
4. M3 生成引擎：vibe 到预览到 ZIP 导出全链路可用。
5. M4 游戏中心：三款游戏可玩，计分与排行榜可用。
6. M5 内置浏览器：标签、历史、受限提示可用。
7. M6 聊天室：多房间实时消息与在线状态可用。
8. M7 部署：Vercel + Supabase 上线步骤可复现。

每完成一个模块即交付一次可运行代码，不跨模块混写。

## 10. 待提供的外部输入

以下内容由用户提供，属于实现依赖而非设计缺口：

- MotionSites 完整提示词。
- 品牌首页使用的图片、视频素材。
- 品牌名称、Logo、Slogan 等文案。
- 素材是否可商用的确认。
- Vercel 与 Supabase 账号。

## 11. 风险与对策

- iframe 嵌入限制：MVP 只支持可嵌入站点，其余给出受限提示，后续再评估代理方案。
- Supabase 免费额度：限制单文件大小，监控存储与实时用量。
- MotionSites 素材版权：使用用户自有素材替换占位内容。
- 动效性能：首页媒体延迟加载、路由级代码拆分、减弱动效模式。
- RLS 配置错误：迁移文件中明确策略，端到端测试覆盖权限边界。
