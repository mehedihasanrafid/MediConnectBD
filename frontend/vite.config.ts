/**
 * Vite configuration. The dev server proxies /api to the backend so the browser sees a single
 * origin; this keeps the HTTP-only refresh cookie working across reloads without weakening
 * SameSite settings.
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
      generateScopedName:
        process.env.NODE_ENV === "production"
          ? "[hash:base64:6]"
          : "[name]__[local]__[hash:base64:4]",
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: false,
      },
    },
  },
});
