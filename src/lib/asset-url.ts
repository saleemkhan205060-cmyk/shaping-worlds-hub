import { PUBLISHED_ORIGIN } from "./oauth-origin";

/**
 * Resolve a Lovable CDN asset pointer URL (`/__l5e/assets-v1/...`) to a URL the
 * current runtime can actually fetch.
 *
 * The pointer URL is origin-relative and is only served by Lovable's hosting
 * infrastructure. Inside the Capacitor Android app the page is served from
 * `https://localhost`, where nothing answers `/__l5e/...` — every such request
 * 404s. That silently breaks the share icon, the like sound and the
 * notification chime, and the failed <audio> loads keep re-arming the
 * capture-phase unlock listeners on every gesture, which is what the WebView
 * shows as a freeze.
 *
 * On the web we keep the relative URL (same-origin, CDN-cached). Everywhere the
 * origin cannot serve the pointer we prefix the canonical published origin.
 */
export function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/__l5e/")) return url;
  if (typeof window === "undefined") return `${PUBLISHED_ORIGIN}${url}`;
  const origin = window.location.origin;
  if (!origin || origin === "https://localhost" || origin.startsWith("http://localhost") || origin.startsWith("capacitor://") || origin.startsWith("file://")) {
    return `${PUBLISHED_ORIGIN}${url}`;
  }
  return url;
}
