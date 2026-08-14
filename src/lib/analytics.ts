// Google Analytics 4 (GA4) helper for VIP Life.
// The base gtag.js tag is server-rendered in src/routes/__root.tsx head(),
// so data collection starts on the very first page load (no hydration needed).
export const GA_MEASUREMENT_ID = "G-8T3RJMJXQV";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

let initialized = false;
let firstPageViewSkipped = false;

function isNativeShell() {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  // Skip the native Capacitor shell — GA4 web stream only tracks the website.
  if (isNativeShell()) return;
  initialized = true;

  // Fallback: if the head tag was blocked or stripped, inject it here.
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.ga4 = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, { send_page_view: true });
  }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined" || isNativeShell()) return;
  // The initial page_view is sent by gtag('config', ...) in the head tag.
  if (!firstPageViewSkipped) {
    firstPageViewSkipped = true;
    return;
  }
  gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
