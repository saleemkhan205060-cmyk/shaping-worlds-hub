import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Capacitor-specific Vite config: builds a static SPA for the mobile app wrapper.
// TanStack Start SPA mode generates a prerendered shell that the WebView loads.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: {
        enabled: true,
        outputPath: "/index.html",
        crawlLinks: false,
      },
    },
  },
  vite: {
    build: {
      outDir: "../dist-capacitor",
      emptyOutDir: true,
    },
  },
});
