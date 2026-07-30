import { isNativeCapacitorApp } from "./native-share";

/**
 * Origin used as the OAuth `redirect_uri`.
 *
 * In the browser/PWA this is simply the current origin. Inside the Capacitor
 * Android app the page is served from `https://localhost`, which is NOT a
 * registered redirect target — the OAuth broker answers with a 404 page.
 * Native builds therefore use the published https origin instead.
 */
export const PUBLISHED_ORIGIN = "https://vip-life.lovable.app";

export function getOAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  if (isNativeCapacitorApp()) return PUBLISHED_ORIGIN;
  const origin = window.location.origin;
  if (!origin || origin.startsWith("http://localhost") || origin === "https://localhost") {
    return PUBLISHED_ORIGIN;
  }
  return origin;
}
