import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { previewLocalApiPlugin } from "./script/preview-local-api";

export default defineConfig(async ({ mode }) => {
  const plugins: Plugin[] = [
    react(),
    runtimeErrorOverlay(),
  ];

  if (mode === "preview-local") {
    plugins.push(previewLocalApiPlugin());
  }

  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    plugins.push(
      await import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer(),
      ),
    );
    plugins.push(
      await import("@replit/vite-plugin-dev-banner").then((m) =>
        m.devBanner(),
      ),
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
