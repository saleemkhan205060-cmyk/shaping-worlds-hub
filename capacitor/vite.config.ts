import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";

// Capacitor-specific Vite config: builds a static SPA for the mobile app wrapper.
// Run from project root:  npx vite build --config capacitor/vite.config.ts
export default defineConfig({
  root: ".",
  publicDir: "../public",
  build: {
    outDir: "../dist-capacitor",
    emptyOutDir: true,
  },
  plugins: [tailwindcss(), tsconfigPaths({ projects: ["../tsconfig.json"], ignoreConfigErrors: true }), react()],
  resolve: {
    alias: {
      "@": resolve("../src"),
    },
  },
});
