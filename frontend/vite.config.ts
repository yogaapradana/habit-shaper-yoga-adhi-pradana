import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The proxy is only used by `npm run dev`; in Docker, Nginx proxies /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5000" },
  },
});
