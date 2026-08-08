import { describe, expect, it } from "vitest";

import { describeVibe, parseVibe } from "./vibeParser";

describe("vibeParser", () => {
  it("maps cyber keywords to neon preset", () => {
    const config = parseVibe("赛博朋克风格，霓虹夜景");
    expect(config.name).toBe("赛博霓虹");
    expect(config.motion).toBe("high");
  });

  it("maps minimal keywords to airy preset", () => {
    const config = parseVibe("极简留白，干净清爽");
    expect(config.name).toBe("极简留白");
    expect(config.density).toBe("airy");
  });

  it("returns a readable description", () => {
    expect(describeVibe("二次元游戏社区")).toContain("二次元动漫");
  });
});
