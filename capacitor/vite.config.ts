import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Capacitor-specific Vite config: builds a static SPA for the mobile app wrapper.
export default defineConfig({
  root: "..",
  publicDir: "public",
  build: {
    outDir: "dist-capacitor",
    emptyOutDir: true,
  },
  plugins: [tailwindcss(), tsconfigPaths({ projects: ["./tsconfig.json"] }), react()],
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
  },
});
