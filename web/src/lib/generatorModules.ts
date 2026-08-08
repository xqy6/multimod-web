export interface GeneratorModule {
  id: string;
  name: string;
  description: string;
}

export const generatorModules: GeneratorModule[] = [
  {
    id: "hero",
    name: "品牌首页",
    description: "大标题、副标题、双 CTA 与主视觉位",
  },
  {
    id: "games",
    name: "小游戏中心",
    description: "2048、贪吃蛇、俄罗斯方块入口",
  },
  {
    id: "browser",
    name: "内置浏览器",
    description: "URL 栏、标签页、历史与书签",
  },
  {
    id: "chat",
    name: "实时聊天室",
    description: "房间列表、消息流与在线状态",
  },
  {
    id: "assets",
    name: "素材图库",
    description: "图片与文字素材展示区",
  },
  {
    id: "ai",
    name: "AI 生成工作台",
    description: "vibe 输入、预览与导出入口",
  },
];
