import { describe, expect, it } from "vitest";

import { renderSiteHtml } from "./generateSite";
import { parseVibe } from "./vibeParser";

describe("generateSite", () => {
  it("renders selected modules and gallery assets", () => {
    const html = renderSiteHtml({
      title: "测试站点",
      vibe: "二次元游戏社区",
      config: parseVibe("二次元游戏社区"),
      modules: ["hero", "games", "chat"],
      assets: [
        {
          name: "cover.png",
          dataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      ],
    });

    expect(html).toContain("测试站点");
    expect(html).toContain("小游戏中心");
    expect(html).toContain("实时聊天室");
    expect(html).toContain("素材图库");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("application/ld+json");
  });
});
