/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_URL?: string;
  readonly VITE_NETDISK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
