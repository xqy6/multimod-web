import {
  Bookmark,
  Globe,
  History,
  Loader2,
  Plus,
  RotateCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  addBookmark,
  addBrowserHistory,
  clearBrowserHistory,
  getBookmarks,
  getBrowserHistory,
  hostName,
  isBookmarked,
  isRestrictedUrl,
  normalizeUrl,
  removeBookmark,
  type BrowserBookmark,
  type BrowserHistoryItem,
} from "@/services/browser";

interface Tab {
  id: string;
  url: string;
  title: string;
}

const defaultUrl = "https://example.com";

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: crypto.randomUUID(), url: defaultUrl, title: "Example" },
  ]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [input, setInput] = useState(defaultUrl);
  const [history, setHistory] = useState<BrowserHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [sidePanel, setSidePanel] = useState<"history" | "bookmarks">(
    "history",
  );
  const [loading, setLoading] = useState(true);
  const [frameKey, setFrameKey] = useState(0);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const restricted = isRestrictedUrl(activeTab.url);
  const bookmarked = isBookmarked(activeTab.url);

  useEffect(() => {
    setHistory(getBrowserHistory());
    setBookmarks(getBookmarks());
  }, []);

  const activateTab = (id: string) => {
    const tab = tabs.find((item) => item.id === id);
    if (!tab) return;
    setActiveId(id);
    setInput(tab.url);
    setLoading(true);
  };

  const goTo = (rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    const title = hostName(url);
    setTabs((current) =>
      current.map((tab) =>
        tab.id === activeId ? { ...tab, url, title } : tab,
      ),
    );
    setInput(url);
    setLoading(true);
    setFrameKey((current) => current + 1);
    addBrowserHistory(url, title);
    setHistory(getBrowserHistory());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goTo(input);
  };

  const addTab = () => {
    const tab: Tab = {
      id: crypto.randomUUID(),
      url: defaultUrl,
      title: "Example",
    };
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
    setInput(defaultUrl);
    setLoading(true);
  };

  const closeTab = (id: string) => {
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.id === id);
      const next = current.filter((tab) => tab.id !== id);
      if (next.length === 0) {
        const fallback: Tab = {
          id: crypto.randomUUID(),
          url: defaultUrl,
          title: "Example",
        };
        setActiveId(fallback.id);
        setInput(defaultUrl);
        return [fallback];
      }
      if (id === activeId) {
        const target = next[Math.max(0, index - 1)];
        setActiveId(target.id);
        setInput(target.url);
      }
      return next;
    });
  };

  const toggleBookmark = () => {
    if (bookmarked) {
      const existing = getBookmarks().find(
        (item) => item.url === activeTab.url,
      );
      if (existing) removeBookmark(existing.id);
    } else {
      addBookmark(activeTab.url, activeTab.title);
    }
    setBookmarks(getBookmarks());
  };

  const handleClearHistory = () => {
    clearBrowserHistory();
    setHistory([]);
  };

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          网页内置浏览器
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">浏览器</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          多标签浏览、历史与书签保存在本地；部分站点会拒绝被嵌入。
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0 overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
          <div className="flex items-end gap-1 overflow-x-auto border-b border-white/10 px-2 pt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => activateTab(tab.id)}
                className={`group flex min-w-0 max-w-[180px] items-center gap-2 rounded-t-xl px-3 py-2 text-sm transition-colors ${
                  tab.id === activeId
                    ? "bg-white/10 text-mist-100"
                    : "text-mist-500 hover:bg-white/5 hover:text-mist-200"
                }`}
              >
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.title}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") closeTab(tab.id);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                  aria-label={`关闭标签 ${tab.title}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={addTab}
              className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mist-400 transition-colors hover:bg-white/5 hover:text-mist-100"
              aria-label="新建标签"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <form
            onSubmit={submit}
            className="flex gap-2 border-b border-white/10 p-3"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
                aria-hidden="true"
              />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="输入网址或搜索内容"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-mint-300/50 focus:outline-none focus:ring-2 focus:ring-mint-300/20"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-mint-300 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-mint-200"
            >
              前往
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true);
                setFrameKey((current) => current + 1);
              }}
              aria-label="刷新页面"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleBookmark}
              aria-label={bookmarked ? "取消收藏" : "收藏当前页面"}
              aria-pressed={bookmarked}
            >
              <Star
                className={`h-4 w-4 ${
                  bookmarked ? "fill-amber-300 text-amber-300" : ""
                }`}
                aria-hidden="true"
              />
            </Button>
          </form>

          {restricted ? (
            <div className="flex items-center gap-3 border-b border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {hostName(activeTab.url)} 通常拒绝被嵌入，可能显示空白或错误页。
                可以尝试其他可嵌入站点。
              </span>
            </div>
          ) : null}

          <div className="relative">
            {loading ? (
              <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-ink-950/80 px-4 py-2 text-xs text-mist-300 backdrop-blur-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                正在加载 {activeTab.url}
              </div>
            ) : null}
            <iframe
              key={`${activeTab.id}-${frameKey}`}
              title={activeTab.title}
              src={activeTab.url}
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              className="h-[68vh] min-h-[420px] w-full bg-white"
            />
          </div>
        </section>

        <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-4">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setSidePanel("history")}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                sidePanel === "history"
                  ? "bg-mint-300 text-ink-950"
                  : "text-mist-400 hover:text-mist-100"
              }`}
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              历史
            </button>
            <button
              type="button"
              onClick={() => setSidePanel("bookmarks")}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                sidePanel === "bookmarks"
                  ? "bg-mint-300 text-ink-950"
                  : "text-mist-400 hover:text-mist-100"
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              书签
            </button>
          </div>

          {sidePanel === "history" ? (
            <>
              <div className="mt-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-mist-100">浏览历史</h2>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-mist-500 hover:text-mist-200"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  清空
                </button>
              </div>
              {history.length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-mist-400">
                  暂无历史记录。
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {history.slice(0, 12).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(item.url)}
                      className="block w-full truncate rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left"
                    >
                      <span className="block truncate text-sm text-mist-200">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-mist-500">
                        {item.url}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-4 text-sm font-bold text-mist-100">我的书签</h2>
              {bookmarks.length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-mist-400">
                  点击地址栏右侧的星标收藏页面。
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {bookmarks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(item.url)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left"
                    >
                      <Star className="h-4 w-4 shrink-0 fill-amber-300 text-amber-300" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-mist-200">
                          {item.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-mist-500">
                          {item.url}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
