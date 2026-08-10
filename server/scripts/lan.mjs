import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLanAddresses } from "../src/utils/lanAddresses.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(currentDir, "..", "..", "web", "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  console.error("未找到 web/dist，请先在 web 目录执行 pnpm build。");
  process.exit(1);
}

process.env.PORT = process.env.PORT || "4100";

const { addresses, isFallback } = getLanAddresses();

await import("../src/index.js");

console.log("");
console.log("局域网聊天已启动，同一 Wi-Fi 下的设备可以访问：");
for (const address of addresses) {
  console.log(`  http://${address}:${process.env.PORT}`);
}
console.log("");
if (isFallback) {
  console.log("未检测到局域网 IP：请确认电脑已连接 Wi-Fi 或路由器。");
  console.log("其他设备需要与电脑在同一网络；本机可先用 http://127.0.0.1:4100 测试。");
  console.log("");
}
console.log("请保持此窗口运行。");
