import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { hasNativePlugin } from "./native-plugins";

export type NativeShareData = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

export type NativeShareResult = "shared" | "cancelled" | "unavailable" | "failed";

export function isNativeCapacitorApp() {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Fall back to the runtime object below for older embedded builds.
  }

  const capacitor = (
    window as typeof window & {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
      };
    }
  ).Capacitor;

  if (capacitor?.isNativePlatform?.()) return true;
  const platform = capacitor?.getPlatform?.();
  return platform === "android" || platform === "ios";
}

export function canUseWebShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function canUseSystemShare() {
  return isNativeCapacitorApp() || canUseWebShare();
}

export function shareWithSystemShare(data: NativeShareData): Promise<NativeShareResult> | null {
  if (isNativeCapacitorApp()) return shareWithCapacitor(data);
  return shareWithWebShare(data);
}

export function shareWithWebShare(data: NativeShareData): Promise<NativeShareResult> | null {
  if (!canUseWebShare()) return null;

  const shareData = buildWebShareData(data);
  return shareWithWebFallback(shareData);
}

async function shareWithWebFallback(shareData: ShareData): Promise<NativeShareResult> {
  try {
    await navigator.share(shareData);
    return "shared";
  } catch (error) {
    if (isShareCancel(error)) return "cancelled";
    // Some Android browsers advertise Web Share but reject a URL payload.
    // Retry as plain text while this click still has user activation.
    if (shareData.url) {
      try {
        await navigator.share({
          title: shareData.title,
          text: [shareData.text, shareData.url].filter(Boolean).join("\n"),
        });
        return "shared";
      } catch (fallbackError) {
        return isShareCancel(fallbackError) ? "cancelled" : "failed";
      }
    }
    return "failed";
  }
}

export function shareWithCapacitor(data: NativeShareData): Promise<NativeShareResult> {
  if (!isNativeCapacitorApp()) return Promise.resolve("unavailable");
  // An installed shell without the native Share plugin would otherwise hit the
  // JS fallback and throw `"Share" plugin is not implemented on android`.
  if (!hasNativePlugin("Share")) {
    return shareWithWebShare(data) ?? Promise.resolve("unavailable" as const);
  }


  try {
    return Share.share({
      title: data.title ?? "Post",
      text: data.text ?? "Check this out",
      url: getAbsoluteShareUrl(data.url),
      dialogTitle: data.dialogTitle ?? "Share",
    })
      .then(() => "shared" as const)
      .catch((error) => (isShareCancel(error) ? "cancelled" : "failed"));
  } catch (error) {
    return Promise.resolve(isShareCancel(error) ? "cancelled" : "failed");
  }
}

function buildWebShareData(data: NativeShareData): ShareData {
  const shareData: ShareData = {
    title: data.title ?? "Post",
    text: data.text ?? "Check this out",
  };
  const url = getAbsoluteShareUrl(data.url);
  if (url) shareData.url = url;
  return shareData;
}

/**
 * Public origin every shared link must use.
 *
 * The Capacitor WebView serves the app from `https://localhost`, so any link
 * built from `window.location.origin` inside the Android app points at a host
 * nobody can open — share targets reject it and the Share button looks broken.
 */
export const PUBLIC_SHARE_ORIGIN = "https://viplifes.com";

export function getShareOrigin() {
  if (typeof window === "undefined") return PUBLIC_SHARE_ORIGIN;
  if (isNativeCapacitorApp()) return PUBLIC_SHARE_ORIGIN;
  const origin = window.location.origin;
  if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\./.test(origin)) {
    return PUBLIC_SHARE_ORIGIN;
  }
  return origin;
}

/** Builds an absolute, publicly reachable share link from an app path. */
export function buildShareUrl(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${getShareOrigin()}${suffix}`;
}

function getAbsoluteShareUrl(url?: string) {
  const base = getShareOrigin();
  const candidate =
    url ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/");
  try {
    const absoluteUrl = new URL(candidate, base);
    if (!/^https?:$/.test(absoluteUrl.protocol)) return undefined;
    // Never hand a localhost URL to the OS share sheet.
    if (/^localhost$|^127\./.test(absoluteUrl.hostname)) {
      return `${base}${absoluteUrl.pathname}${absoluteUrl.search}`;
    }
    return absoluteUrl.href;
  } catch {
    return undefined;
  }
}


export function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return /abort|cancel/i.test(name) || /abort|cancel/i.test(message);
}
