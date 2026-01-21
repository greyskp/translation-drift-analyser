import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(__dirname);

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/analyse-drift": "http://localhost:3000",
      "/analyses": "http://localhost:3000",
    },
  },
  build: {
    outDir: path.resolve(root, "../dist/client"),
  },
});