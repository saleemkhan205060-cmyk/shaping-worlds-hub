// Notification chime: uses an HTMLAudioElement (works reliably on mobile,
// respects media volume) with a WebAudio fallback.
import chimeUrl from "@/assets/notification-chime.wav";

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let unlockBound = false;
let unlocked = false;
let pendingChime = false;

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

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

function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    try {
      audioEl = new Audio(chimeUrl);
      audioEl.preload = "auto";
      audioEl.volume = 1.0;
    } catch {
      return null;
    }
  }
  return audioEl;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as AudioWindow;
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try { audioCtx = new Ctor(); } catch { return null; }
  }
  return audioCtx;
}

function removeUnlockListeners() {
  if (!unlockBound || typeof window === "undefined") return;
  unlockEvents.forEach((e) => window.removeEventListener(e, unlockFromGesture, true));
  unlockBound = false;
}

function playFallbackChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.25, now + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  master.connect(ctx.destination);
  [880, 1318.51].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.06;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.75);
    osc.connect(gain); gain.connect(master);
    osc.start(start); osc.stop(start + 0.85);
  });
}

async function tryPlay(): Promise<boolean> {
  // Prefer HTMLAudio — more reliable, especially on mobile.
  const el = getAudioEl();
  if (el) {
    try {
      el.pause();
      el.currentTime = 0;
      await el.play();
      return true;
    } catch {
      /* blocked — fall through to WebAudio */
    }
  }
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;
    playFallbackChime(ctx);
    return true;
  } catch {
    return false;
  }
}

async function unlockFromGesture() {
  // Prime HTMLAudio (a play+pause inside a user gesture grants permission for later programmatic plays).
  const el = getAudioEl();
  if (el) {
    try {
      const prevVol = el.volume;
      el.volume = 0;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.volume = prevVol;
    } catch {
      /* ignore */
    }
  }
  const ctx = getAudioContext();
  if (ctx) {
    try { if (ctx.state === "suspended") await ctx.resume(); } catch { /* ignore */ }
  }
  unlocked = true;
  removeUnlockListeners();
  if (pendingChime) {
    pendingChime = false;
    void tryPlay();
  }
}

export function initNotificationSoundUnlock() {
  if (unlockBound || unlocked || typeof window === "undefined") return;
  unlockBound = true;
  unlockEvents.forEach((e) =>
    window.addEventListener(e, unlockFromGesture, { capture: true, passive: true }),
  );
}

export function playSoftChime() {
  try {
    initNotificationSoundUnlock();
    if (!unlocked) {
      pendingChime = true;
      return;
    }
    void tryPlay().then((ok) => {
      if (!ok) pendingChime = true;
    });
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  initNotificationSoundUnlock();
}
