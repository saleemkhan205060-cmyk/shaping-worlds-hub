// Notification chime: plays an uploaded MP3 file. Falls back to a WebAudio
// synth if HTMLAudioElement playback fails. The audio is unlocked on the
// first user gesture so it can play reliably on later message events.

import notificationAsset from "@/assets/notification.mp3.asset.json";

let audioCtx: AudioContext | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let unlockBound = false;
let unlocked = false;
let pendingChimes = 0;
let queueRunning = false;
const playedChimeKeys = new Set<string>();

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const CHIME_PREF_KEY = "vip:notification-chime-enabled";
const CHIME_PREF_EVENT = "vip:notification-chime-changed";
const MAX_PENDING_CHIMES = 6;
const NOTIFICATION_ICON = "/logo.png";

const unlockEvents: (keyof WindowEventMap)[] = [
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "mousedown",
  "mouseup",
  "keydown",
  "click",
];

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!htmlAudio) {
    try {
      htmlAudio = new Audio(notificationAsset.url);
      htmlAudio.preload = "auto";
      htmlAudio.volume = 1;
      htmlAudio.crossOrigin = "anonymous";
    } catch {
      return null;
    }
  }
  return htmlAudio;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as AudioWindow;
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function removeUnlockListeners() {
  if (!unlockBound || typeof window === "undefined") return;
  unlockEvents.forEach((e) => {
    window.removeEventListener(e, unlockFromGesture, true);
    document.removeEventListener(e, unlockFromGesture, true);
  });
  unlockBound = false;
}

function playFallbackChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1.2, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  master.connect(ctx.destination);
  [880, 1318.51, 1760].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const start = now + i * 0.06;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.8, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + 0.36);
  });
}

async function playUploadedSound(): Promise<boolean> {
  const el = getAudioElement();
  if (!el) return false;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
  try {
    const p = el.play();
    if (p && typeof p.then === "function") {
      await p;
    }
    return true;
  } catch {
    return false;
  }
}

async function tryPlay(): Promise<boolean> {
  // Try uploaded MP3 first
  const ok = await playUploadedSound();
  if (ok) {
    unlocked = true;
    removeUnlockListeners();
    return true;
  }
  // Fallback to WebAudio synth
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;
    unlocked = true;
    removeUnlockListeners();
    playFallbackChime(ctx);
    return true;
  } catch {
    return false;
  }
}

function drainChimeQueue() {
  if (queueRunning || typeof window === "undefined") return;
  queueRunning = true;

  const playNext = () => {
    if (pendingChimes <= 0) {
      queueRunning = false;
      return;
    }
    void tryPlay().then((ok) => {
      if (!ok) {
        unlocked = false;
        queueRunning = false;
        initNotificationSoundUnlock();
        return;
      }
      pendingChimes -= 1;
      if (pendingChimes > 0) {
        window.setTimeout(playNext, 700);
      } else {
        queueRunning = false;
      }
    });
  };

  playNext();
}

function unlockFromGesture() {
  requestNotificationPermissionFromGesture();

  // Prime HTMLAudio inside the gesture so future programmatic plays work
  const el = getAudioElement();
  if (el) {
    try {
      const prevVol = el.volume;
      el.muted = true;
      const p = el.play();
      if (p && typeof p.then === "function") {
        void p
          .then(() => {
            el.pause();
            try {
              el.currentTime = 0;
            } catch {
              /* ignore */
            }
            el.muted = false;
            el.volume = prevVol;
            unlocked = true;
            removeUnlockListeners();
            drainChimeQueue();
          })
          .catch(() => {
            el.muted = false;
            el.volume = prevVol;
          });
      } else {
        el.pause();
        el.muted = false;
        unlocked = true;
        removeUnlockListeners();
        drainChimeQueue();
      }
    } catch {
      /* ignore */
    }
  }

  // Also resume AudioContext as a fallback
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

export function initNotificationSoundUnlock() {
  if (typeof window === "undefined") return;
  if (unlocked) return;
  if (unlockBound) return;
  unlockBound = true;
  unlockEvents.forEach((e) => {
    window.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
    document.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
  });
  // Start loading the audio file
  getAudioElement();
}

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function requestNotificationPermissionFromGesture() {
  if (!canUseBrowserNotifications()) return;
  if (window.Notification.permission !== "default") return;
  void window.Notification.requestPermission().catch(() => {});
}

export function initBackgroundMessageNotifications() {
  if (typeof window === "undefined") return;
  if (!canUseBrowserNotifications()) return;
  if (window.Notification.permission === "default") {
    requestNotificationPermissionFromGesture();
  }
}

export async function showNewMessageNotification({
  title,
  body,
  tag,
  url = "/messages",
}: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}) {
  if (typeof window === "undefined" || !canUseBrowserNotifications()) return;
  if (window.Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body,
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag,
    data: { url },
  } as NotificationOptions;

  try {
    const registration = navigator.serviceWorker?.controller
      ? await Promise.race<ServiceWorkerRegistration | null>([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 400)),
        ])
      : null;
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    /* fall back to window Notification */
  }

  try {
    const notification = new window.Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.href = url;
      notification.close();
    };
  } catch {
    /* ignore */
  }
}

export function isNotificationChimeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(CHIME_PREF_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setNotificationChimeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHIME_PREF_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent(CHIME_PREF_EVENT, { detail: enabled }));
    if (enabled) initNotificationSoundUnlock();
  } catch {
    /* ignore */
  }
}

export function subscribeNotificationChimePref(cb: (enabled: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === CHIME_PREF_KEY) cb(e.newValue !== "0");
  };
  window.addEventListener(CHIME_PREF_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(CHIME_PREF_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

export function playSoftChime(chimeKey?: string) {
  try {
    if (!isNotificationChimeEnabled()) return;
    if (chimeKey) {
      if (playedChimeKeys.has(chimeKey)) return;
      playedChimeKeys.add(chimeKey);
      if (typeof window !== "undefined") {
        window.setTimeout(() => playedChimeKeys.delete(chimeKey), 60_000);
      }
    }
    pendingChimes = Math.min(MAX_PENDING_CHIMES, pendingChimes + 1);
    initNotificationSoundUnlock();
    drainChimeQueue();
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  initNotificationSoundUnlock();
}
