import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

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
  const webNavigator = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (webNavigator.canShare && !webNavigator.canShare(shareData)) {
    return Promise.resolve("unavailable");
  }

  try {
    return navigator
      .share(shareData)
      .then(() => "shared" as const)
      .catch((error) => (isShareCancel(error) ? "cancelled" : "failed"));
  } catch (error) {
    return Promise.resolve(isShareCancel(error) ? "cancelled" : "failed");
  }
}

export function shareWithCapacitor(data: NativeShareData): Promise<NativeShareResult> {
  if (!isNativeCapacitorApp()) return Promise.resolve("unavailable");

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

function getAbsoluteShareUrl(url?: string) {
  if (!url) return typeof window !== "undefined" ? window.location.href : undefined;
  try {
    const absoluteUrl = new URL(
      url,
      typeof window !== "undefined" ? window.location.href : undefined,
    );
    return /^(https?:|file:)$/.test(absoluteUrl.protocol) ? absoluteUrl.href : undefined;
  } catch {
    return undefined;
  }
}

export function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return /abort|cancel/i.test(name) || /abort|cancel/i.test(message);
}
