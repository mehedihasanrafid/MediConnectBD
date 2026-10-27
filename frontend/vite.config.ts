/**
 * Vite configuration. The dev server proxies /api to the backend so the browser sees a single
 * origin; this keeps the HTTP-only refresh cookie working across reloads without weakening
 * SameSite settings. Includes @tailwindcss/vite matching DokanBD.
 */

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
