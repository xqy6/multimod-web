export const browserProxyUrl = (
  import.meta.env.VITE_PROXY_URL ?? ""
).trim();

export const netdiskApiUrl = (
  import.meta.env.VITE_NETDISK_URL ?? "http://localhost:4000"
)
  .trim()
  .replace(/\/+$/, "");
