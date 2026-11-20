import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localTmp = path.resolve(__dirname, "node_modules/.tmp");
try {
  if (!fs.existsSync(localTmp)) {
    fs.mkdirSync(localTmp, { recursive: true });
  }
  process.env.TEMP = localTmp;
  process.env.TMP = localTmp;
} catch (e) {
  // ignore
}

export default defineConfig(({ mode }) => {
  // 👇 Dynamically load env variables based on mode (development/production)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: {
          name: 'SaafHisaab Mandi',
          short_name: 'SaafHisaab',
          description: 'Mandi accounts, crop weighing, stock, and staff management.',
          theme_color: '#05080F',
          background_color: '#05080F',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      port: parseInt(env.PORT || "5173"), // 👈 Uses loaded env
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL||"http://localhost:8080", // 👈 Uses loaded env
          changeOrigin: true,
          secure: false, // Set to false to avoid local SSL strictness issues
        },
      },
    },
  };
});
