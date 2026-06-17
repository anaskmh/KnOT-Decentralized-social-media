import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server for the KnOT web client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Bind to all interfaces (0.0.0.0) so it's accessible externally
    proxy: {
      "/relay": {
        target: "ws://127.0.0.1:8765",
        ws: true,
        rewrite: (path) => path.replace(/^\/relay/, ""),
      },
    },
  },
});
