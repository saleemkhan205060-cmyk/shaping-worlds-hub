import * as React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { routeTree } from "./routeTree.gen";
import LogRocket from "logrocket";

LogRocket.init("p3epoj/vip-life-app");

// ---------------------------------------------------------------------------
// Startup guard
//
// Inside the Android WebView a single unhandled error during bootstrap leaves
// the user staring at a blank white screen with no way to recover. Surface it
// instead, and give the user a retry button.
// ---------------------------------------------------------------------------
function showStartupFailure(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const root = document.getElementById("root");
  if (!root) return;
  if (root.getAttribute("data-startup-error") === "1") return;
  root.setAttribute("data-startup-error", "1");
  root.innerHTML = `
    <div style="min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;font:15px/1.5 system-ui,-apple-system,sans-serif;color:#111;background:#fff;">
      <div style="max-width:22rem;text-align:center;">
        <h1 style="font-size:1.125rem;margin:0 0 .5rem;">App couldn't start</h1>
        <p style="color:#4b5563;margin:0 0 1rem;">Please check your connection and try again.</p>
        <button id="vip-retry" style="padding:.6rem 1.1rem;border-radius:.5rem;border:0;background:#111;color:#fff;font:inherit;">Try again</button>
        <pre style="margin-top:1rem;font-size:11px;color:#9ca3af;white-space:pre-wrap;text-align:left;">${message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>
      </div>
    </div>`;
  document.getElementById("vip-retry")?.addEventListener("click", () => window.location.reload());
}

function bootstrap() {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

// Router type registration lives in src/router.tsx.

// A blank screen during bootstrap is always a bug — report it instead of hiding it.
const startupWatchdog = window.setTimeout(() => {
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) {
    showStartupFailure(new Error("The app did not finish loading."));
  }
}, 12_000);

window.addEventListener("error", (event) => {
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) showStartupFailure(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) showStartupFailure(event.reason);
});

try {
  bootstrap();
  window.clearTimeout(startupWatchdog);
} catch (error) {
  window.clearTimeout(startupWatchdog);
  showStartupFailure(error);
}
