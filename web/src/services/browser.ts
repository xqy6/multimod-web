export interface BrowserHistoryItem {
  id: string;
  url: string;
  title: string;
  visitedAt: string;
}

export interface BrowserBookmark {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}

const HISTORY_KEY = "multimod-browser-history";
const BOOKMARKS_KEY = "multimod-browser-bookmarks";

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value)) {
    return `https://${value}`;
  }
  return `https://www.bing.com/search?q=${encodeURIComponent(value)}`;
}

export function hostName(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const restrictedHosts = [
  "google.com",
  "facebook.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "github.com",
  "baidu.com",
  "zhihu.com",
  "weibo.com",
  "bilibili.com",
  "microsoft.com",
  "apple.com",
  "taobao.com",
  "jd.com",
];

export function isRestrictedUrl(url: string): boolean {
  const host = hostName(url).toLowerCase();
  return restrictedHosts.some(
    (restricted) => host === restricted || host.endsWith(`.${restricted}`),
  );
}

export function getBrowserHistory(): BrowserHistoryItem[] {
  return read<BrowserHistoryItem>(HISTORY_KEY);
}

export function addBrowserHistory(url: string, title: string) {
  const history = getBrowserHistory().filter((item) => item.url !== url);
  history.unshift({
    id: crypto.randomUUID(),
    url,
    title,
    visitedAt: new Date().toISOString(),
  });
  write(HISTORY_KEY, history.slice(0, 50));
}

export function clearBrowserHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getBookmarks(): BrowserBookmark[] {
  return read<BrowserBookmark>(BOOKMARKS_KEY);
}

export function addBookmark(url: string, title: string): BrowserBookmark {
  const bookmarks = getBookmarks().filter((item) => item.url !== url);
  const bookmark: BrowserBookmark = {
    id: crypto.randomUUID(),
    url,
    title,
    createdAt: new Date().toISOString(),
  };
  bookmarks.unshift(bookmark);
  write(BOOKMARKS_KEY, bookmarks);
  return bookmark;
}

export function removeBookmark(id: string) {
  write(
    BOOKMARKS_KEY,
    getBookmarks().filter((item) => item.id !== id),
  );
}

export function isBookmarked(url: string): boolean {
  return getBookmarks().some((item) => item.url === url);
}
