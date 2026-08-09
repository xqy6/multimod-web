export const browserProxyUrl = (import.meta.env.VITE_PROXY_URL ?? "").trim();

const configuredApiUrl = (import.meta.env.VITE_NETDISK_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

export const netdiskApiUrl =
  configuredApiUrl === "auto"
    ? typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:4100"
    : configuredApiUrl || "http://localhost:4000";

export const serverApiUrl = netdiskApiUrl;
