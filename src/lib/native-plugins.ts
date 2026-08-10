/**
 * Detects whether a Capacitor plugin has a *native* implementation loaded in
 * the current WebView.
 *
 * `Capacitor.isPluginAvailable(name)` is NOT enough: `registerPlugin()` always
 * registers the JS/web fallback, so it answers `true` even in an installed
 * Android shell that never bundled the native plugin. Calling the plugin then
 * hits the web implementation, which throws
 * `"App" plugin is not implemented on android`.
 *
 * The native bridge injects `window.Capacitor.PluginHeaders` listing exactly
 * the plugins compiled into the app, so that list is the source of truth.
 */
type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  PluginHeaders?: Array<{ name: string }>;
};

function runtime(): CapacitorRuntime | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { Capacitor?: CapacitorRuntime }).Capacitor;
}

export function hasNativePlugin(name: string): boolean {
  const cap = runtime();
  try {
    if (!cap?.isNativePlatform?.()) return false;
    const headers = cap.PluginHeaders;
    // Older bridges (Capacitor < 3) don't expose PluginHeaders at all; there we
    // can only fall back to the registry check.
    if (!Array.isArray(headers)) return true;
    return headers.some((header) => header?.name === name);
  } catch {
    return false;
  }
}
