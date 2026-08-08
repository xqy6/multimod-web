export interface ThemeConfig {
  name: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  radius: number;
  density: "compact" | "comfortable" | "airy";
  motion: "subtle" | "medium" | "high";
  font: string;
}

const presets: ThemeConfig[] = [
  {
    name: "赛博霓虹",
    background: "#070810",
    surface: "#111426",
    text: "#f2f4ff",
    muted: "#a2a8c3",
    primary: "#52e5c4",
    secondary: "#7f7cff",
    accent: "#ff7ac6",
    radius: 20,
    density: "compact",
    motion: "high",
    font: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    name: "极简留白",
    background: "#f6f5f1",
    surface: "#ffffff",
    text: "#1b1c1e",
    muted: "#7c7f87",
    primary: "#2f6f5f",
    secondary: "#b98a4e",
    accent: "#d96a4e",
    radius: 8,
    density: "airy",
    motion: "subtle",
    font: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    name: "二次元动漫",
    background: "#171226",
    surface: "#231a3a",
    text: "#fff7f2",
    muted: "#b9aed6",
    primary: "#ff9ad5",
    secondary: "#8ed0ff",
    accent: "#ffd36b",
    radius: 24,
    density: "comfortable",
    motion: "high",
    font: "'Poppins', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    name: "自然清新",
    background: "#101c16",
    surface: "#17261e",
    text: "#eef7ef",
    muted: "#9fb8a6",
    primary: "#a8e6b0",
    secondary: "#e0c06a",
    accent: "#8cc7a0",
    radius: 18,
    density: "comfortable",
    motion: "medium",
    font: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  {
    name: "复古胶片",
    background: "#241813",
    surface: "#32211a",
    text: "#f6e9d8",
    muted: "#c3a890",
    primary: "#f0b06a",
    secondary: "#d98a5f",
    accent: "#e0d068",
    radius: 12,
    density: "comfortable",
    motion: "medium",
    font: "'Georgia', 'PingFang SC', 'Microsoft YaHei', serif",
  },
  {
    name: "深色玻璃",
    background: "#0a0b10",
    surface: "#14161f",
    text: "#f4f5f8",
    muted: "#9ba0ad",
    primary: "#6fcba4",
    secondary: "#8e8acb",
    accent: "#dc986a",
    radius: 20,
    density: "comfortable",
    motion: "medium",
    font: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
];

const rules: [string[], number][] = [
  [["赛博", "霓虹", "科技", "未来", "cyber", "neon"], 0],
  [["极简", "留白", "干净", "简约", "minimal", "clean"], 1],
  [["二次元", "动漫", "游戏", "可爱", "anime"], 2],
  [["自然", "森林", "清新", "绿", "nature"], 3],
  [["复古", "胶片", "怀旧", "retro", "vintage"], 4],
];

export function parseVibe(vibe: string): ThemeConfig {
  const lower = vibe.toLowerCase();
  for (const [keywords, index] of rules) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return presets[index];
    }
  }
  return presets[5];
}

export function describeVibe(vibe: string): string {
  const config = parseVibe(vibe);
  return `${config.name} · ${config.density === "airy" ? "宽松" : config.density === "compact" ? "紧凑" : "舒适"} · 动效${config.motion === "high" ? "丰富" : config.motion === "medium" ? "中等" : "克制"}`;
}
