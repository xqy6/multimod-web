import { networkInterfaces } from "node:os";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(currentDir, "..", "..", "web", "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  console.error("未找到 web/dist，请先在 web 目录执行 pnpm build。");
  process.exit(1);
}

process.env.PORT = process.env.PORT || "4100";

const addresses = [];
for (const items of Object.values(networkInterfaces())) {
  for (const item of items ?? []) {
    if (item.family === "IPv4" && !item.internal) {
      addresses.push(item.address);
    }
  }
}

await import("../src/index.js");

console.log("");
console.log("局域网聊天已启动，同一 Wi-Fi 下的设备可以访问：");
for (const address of addresses) {
  console.log(`  http://${address}:${process.env.PORT}`);
}
console.log("");
console.log("请保持此窗口运行。");
