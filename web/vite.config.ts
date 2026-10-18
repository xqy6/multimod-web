import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/multimod-web/" : "/",
  define: {
    global: "globalThis",
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "嘉兴 3D 旅行沙盘",
        short_name: "嘉兴沙盘",
        description: "嘉兴九大核心景点的 3D 微缩旅行导览",
        theme_color: "#0a0b10",
        background_color: "#0a0b10",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,jpg,jpeg,svg,webp,json,woff2}"],
        globIgnores: ["assets/*.mp4"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".mp4"),
            handler: "CacheFirst",
            options: {
              cacheName: "media",
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      events: "events",
      process: "process/browser",
      buffer: "buffer",
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
