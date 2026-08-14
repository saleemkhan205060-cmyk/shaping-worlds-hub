// Google Analytics 4 (GA4) helper for VIP Life.
export const GA_MEASUREMENT_ID = "G-8T3RJMJXQV";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  // Skip the native Capacitor shell (served from the capacitor:// or
  // https://localhost origin) — GA4 only tracks the website.
  const isNativeShell =
    typeof (window as { Capacitor?: unknown }).Capacitor !== "undefined" ||
    !/^https?:$/.test(window.location.protocol);
  if (isNativeShell) return;
  initialized = true;

  if (!document.querySelector(`script[data-ga4="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.ga4 = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageView(path: string) {
  if (!initialized) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
