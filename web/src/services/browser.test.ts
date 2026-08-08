import { beforeEach, describe, expect, it } from "vitest";

import {
  addBookmark,
  addBrowserHistory,
  getBookmarks,
  getBrowserHistory,
  isBookmarked,
  isRestrictedUrl,
  normalizeUrl,
  removeBookmark,
} from "./browser";

describe("browser service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalizes URLs and search queries", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("hello world")).toContain("bing.com/search");
    expect(normalizeUrl("https://example.com/page")).toBe(
      "https://example.com/page",
    );
  });

  it("detects restricted hosts", () => {
    expect(isRestrictedUrl("https://www.google.com/")).toBe(true);
    expect(isRestrictedUrl("https://example.com/")).toBe(false);
  });

  it("stores history and bookmarks", () => {
    addBrowserHistory("https://example.com", "Example");
    expect(getBrowserHistory()).toHaveLength(1);

    addBookmark("https://example.com", "Example");
    expect(isBookmarked("https://example.com")).toBe(true);
    removeBookmark(getBookmarks()[0].id);
    expect(getBookmarks()).toHaveLength(0);
  });
});
