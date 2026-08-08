import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MediaPlaceholder } from "./MediaPlaceholder";

describe("MediaPlaceholder", () => {
  it("renders the required image label", () => {
    render(
      <MediaPlaceholder label="首页主视觉占位：品牌产品大图或氛围视频" />,
    );

    expect(
      screen.getByRole("img", {
        name: "首页主视觉占位：品牌产品大图或氛围视频",
      }),
    ).toBeInTheDocument();
  });
});
