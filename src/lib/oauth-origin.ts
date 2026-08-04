import { isNativeCapacitorApp } from "./native-share";

/**
 * Origin used as the OAuth `redirect_uri`.
 *
 * In the browser/PWA this is simply the current origin. Inside the Capacitor
 * Android app the page is served from `https://localhost`, which is NOT a
 * registered redirect target — the OAuth broker answers with a 404 page.
 * Native builds therefore use the canonical custom-domain origin instead.
 * Do not use the lovable.app alias here: it redirects to this domain, and
 * that cross-origin hop can lose the browser's PKCE verifier before exchange.
 */
export const PUBLISHED_ORIGIN = "https://viplifes.com";
export const ANDROID_OAUTH_BROKER_URL = "https://viplifes.com/~oauth/initiate";

export function getOAuthCallbackUrl(): string {
  return `${getOAuthRedirectOrigin()}/auth/callback`;
}

export function getOAuthRedirectOrigin(): string {
  if (typeof window === "undefined") return PUBLISHED_ORIGIN;
  if (isNativeCapacitorApp()) return PUBLISHED_ORIGIN;
  const origin = window.location.origin;
  if (!origin || origin.startsWith("http://localhost") || origin === "https://localhost") {
    return PUBLISHED_ORIGIN;
  }
  return origin;
}
