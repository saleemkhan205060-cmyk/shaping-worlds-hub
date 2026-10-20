/**
 * Native AdMob overlay manager (Android only).
 *
 * The capacitor-admob-nextgen plugin renders native ads as a native overlay at
 * absolute screen coordinates — not as an inline DOM element. Only one overlay
 * can be visible at a time, so this module keeps a registry of ad slots
 * (placeholder divs in scrollable lists) and, on scroll/resize, shows the ad
 * at the first slot currently inside the viewport and hides it when no slot
 * is visible.
 *
 * Everything here is a no-op outside the native Android shell, so the website
 * never loads the plugin, never renders an ad, and never reserves space.
 */
import { hasNativePlugin, isNativeShell } from "@/lib/native-plugins";

const AD_UNIT_ID = "ca-app-pub-2264861631936875/2027702345";
const PLUGIN_NAME = "AdMobNextGen";

type AdMobNextGenApi = {
  initialize(options: { testingDevices?: string[] }): Promise<unknown>;
  showNativeAd(options: {
    adUnitId: string;
    template?: "small" | "medium";
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }): Promise<{ width: number; height: number }>;
  hideNativeAd(): Promise<void>;
};

type Slot = {
  id: string;
  getRect: () => { x: number; y: number; width: number; height: number } | null;
};

const slots = new Map<string, Slot>();
let plugin: AdMobNextGenApi | null = null;
let initPromise: Promise<AdMobNextGenApi | null> | null = null;
let listenerInstalled = false;
let scheduled = false;
let visibleSlotId: string | null = null;

/** True only in the installed Android app with the native ad plugin bundled. */
export function nativeAdsAvailable(): boolean {
  return isNativeShell() && hasNativePlugin(PLUGIN_NAME);
}

async function loadPlugin(): Promise<AdMobNextGenApi | null> {
  if (plugin) return plugin;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mod = (await import("capacitor-admob-nextgen")) as {
        AdMobNextGen: AdMobNextGenApi;
      };
      await mod.AdMobNextGen.initialize({});
      plugin = mod.AdMobNextGen;
      return plugin;
    } catch {
      return null;
    }
  })();
  return initPromise;
}

function firstVisibleSlot(): { slot: Slot; rect: NonNullable<ReturnType<Slot["getRect"]>> } | null {
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  for (const slot of slots.values()) {
    const rect = slot.getRect();
    if (!rect) continue;
    // Fully above or below the viewport → skip.
    if (rect.y + rect.height <= 0 || rect.y >= vh) continue;
    return { slot, rect };
  }
  return null;
}

async function syncAdPosition(): Promise<void> {
  scheduled = false;
  const found = firstVisibleSlot();
  if (!found) {
    if (visibleSlotId !== null) {
      visibleSlotId = null;
      try {
        await plugin?.hideNativeAd();
      } catch {
        /* overlay already gone */
      }
    }
    return;
  }
  const { slot, rect } = found;
  const api = await loadPlugin();
  if (!api) return;
  // Re-check after the async load: the slot may have scrolled away meanwhile.
  const current = slot.getRect();
  if (!current || current.y + current.height <= 0 || current.y >= window.innerHeight) {
    return;
  }
  try {
    await api.showNativeAd({
      adUnitId: AD_UNIT_ID,
      template: "small",
      x: Math.round(current.x),
      y: Math.round(current.y),
      width: Math.round(current.width),
      height: Math.round(current.height),
    });
    visibleSlotId = slot.id;
  } catch {
    /* ad load failed (offline, no fill) — leave the slot empty */
  }
}

function scheduleSync(): void {
  if (scheduled) return;
  scheduled = true;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => void syncAdPosition());
  } else {
    setTimeout(() => void syncAdPosition(), 50);
  }
}

function installListeners(): void {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
}

/**
 * Register a placeholder slot. Returns an unregister function that also hides
 * the overlay if this slot was the visible one.
 */
export function registerNativeAdSlot(slot: Slot): () => void {
  if (!nativeAdsAvailable()) return () => {};
  slots.set(slot.id, slot);
  installListeners();
  scheduleSync();
  return () => {
    slots.delete(slot.id);
    if (visibleSlotId === slot.id) {
      visibleSlotId = null;
      void plugin?.hideNativeAd().catch(() => {});
    }
    if (slots.size === 0) {
      void plugin?.hideNativeAd().catch(() => {});
    }
  };
}
