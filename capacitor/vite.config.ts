import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Capacitor-specific Vite config: builds a static SPA for the mobile app wrapper.
// Run from project root:  npx vite build --config capacitor/vite.config.ts
export default defineConfig({
  root: __dirname,
  publicDir: resolve(projectRoot, "public"),
  build: {
    outDir: resolve(projectRoot, "dist-capacitor"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
  plugins: [tailwindcss(), tsconfigPaths({ projects: [resolve(projectRoot, "tsconfig.json")], ignoreConfigErrors: true }), react()],
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
});
