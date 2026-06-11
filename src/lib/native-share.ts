export type NativeShareData = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

export type NativeShareResult = "shared" | "cancelled" | "unavailable" | "failed";

export function isNativeCapacitorApp() {
  if (typeof window === "undefined") return false;
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

export function shareWithWebShare(data: NativeShareData): Promise<NativeShareResult> | null {
  if (!canUseWebShare()) return null;

  try {
    return navigator
      .share({ title: data.title, text: data.text, url: data.url })
      .then(() => "shared" as const)
      .catch((error) => (isShareCancel(error) ? "cancelled" : "failed"));
  } catch (error) {
    return Promise.resolve(isShareCancel(error) ? "cancelled" : "failed");
  }
}

export async function shareWithCapacitor(data: NativeShareData): Promise<NativeShareResult> {
  if (!isNativeCapacitorApp()) return "unavailable";

  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: data.title,
      text: data.text,
      url: data.url,
      dialogTitle: data.dialogTitle ?? "Share",
    });
    return "shared";
  } catch (error) {
    return isShareCancel(error) ? "cancelled" : "failed";
  }
}

export function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return /abort|cancel/i.test(name) || /abort|cancel/i.test(message);
}
