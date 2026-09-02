import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Capacitor-specific Vite config: builds a static SPA for the mobile app wrapper.
// Run from project root:  npx vite build --config capacitor/vite.config.ts
export default defineConfig({
  root: __dirname,
  envDir: projectRoot,
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
    alias: [
      // Shim server-only modules that would otherwise pull TanStack Start's
      // server pipeline (and the "#tanstack-router-entry" specifier) into the
      // Capacitor SPA bundle.
      { find: /^@tanstack\/react-start\/server$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: /^@tanstack\/react-start-server$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: /^@tanstack\/start-server-core$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: /^@tanstack\/start-storage-context$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: /.*\/routes\/sitemap\[\.\]xml$/, replacement: resolve(__dirname, "route-shim-sitemap.ts") },
      { find: /.*\/routes\/\[\.\]well-known\.assetlinks\[\.\]json$/, replacement: resolve(__dirname, "route-shim-assetlinks.ts") },
      { find: /.*\/routes\/lovable\/email\/auth\/preview$/, replacement: resolve(__dirname, "route-shim-email-preview.ts") },
      { find: /.*\/routes\/lovable\/email\/auth\/webhook$/, replacement: resolve(__dirname, "route-shim-email-webhook.ts") },
      { find: /.*\/routes\/lovable\/email\/queue\/process$/, replacement: resolve(__dirname, "route-shim-email-queue.ts") },
      { find: /.*\/integrations\/supabase\/auth-middleware$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: /.*\/integrations\/supabase\/client\.server$/, replacement: resolve(__dirname, "empty-shim.ts") },
      { find: "@", replacement: resolve(projectRoot, "src") },
    ],
  },
});
