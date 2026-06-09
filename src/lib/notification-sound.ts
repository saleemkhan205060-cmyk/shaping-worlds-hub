// Notification chime: generated in-browser so it cannot fail because of a
// missing/blocked audio asset request. HTMLAudio is primary; WebAudio is fallback.

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let generatedChimeUrl: string | null = null;
let unlockBound = false;
let unlocked = false;
let pendingChime = false;
let loadStarted = false;
const playedChimeKeys = new Set<string>();

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

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
}

function getGeneratedChimeUrl(): string | null {
  if (typeof window === "undefined") return null;
  if (generatedChimeUrl) return generatedChimeUrl;

  const sampleRate = 22_050;
  const duration = 0.42;
  const sampleCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.018);
    const release = Math.max(0, 1 - t / duration);
    const envelope = attack * release * release;
    const first = Math.sin(2 * Math.PI * 880 * t);
    const second = t > 0.07 ? Math.sin(2 * Math.PI * 1318.51 * (t - 0.07)) : 0;
    const sample = Math.max(-1, Math.min(1, (first * 0.48 + second * 0.36) * envelope));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  generatedChimeUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return generatedChimeUrl;
}

function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const chimeUrl = getGeneratedChimeUrl();
  if (!chimeUrl) return null;
  if (!audioEl) {
    try {
      audioEl = new Audio(chimeUrl);
      audioEl.preload = "auto";
      audioEl.volume = 1.0;
      audioEl.load();
      loadStarted = true;
    } catch {
      return null;
    }
  }
  return audioEl;
}

function preloadNotificationSound() {
  const el = getAudioEl();
  if (!el || loadStarted) return;
  try {
    el.load();
    loadStarted = true;
  } catch {
    /* ignore */
  }
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
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.85);
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
  // Prime audio inside a real user gesture so later message events may play it.
  let didUnlock = false;
  const el = getAudioEl();
  if (el) {
    try {
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      didUnlock = true;
    } catch {
      /* ignore */
    }
  }
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      didUnlock = didUnlock || ctx.state === "running";
    } catch {
      /* ignore */
    }
  }
  if (!didUnlock) return;
  unlocked = true;
  removeUnlockListeners();
  if (pendingChime) {
    pendingChime = false;
    void tryPlay();
  }
}

export function initNotificationSoundUnlock() {
  if (typeof window === "undefined") return;
  preloadNotificationSound();
  if (unlockBound || unlocked) return;
  unlockBound = true;
  unlockEvents.forEach((e) => {
    window.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
    document.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
  });
}

export function playSoftChime(chimeKey?: string) {
  try {
    if (chimeKey) {
      if (playedChimeKeys.has(chimeKey)) return;
      playedChimeKeys.add(chimeKey);
      if (typeof window !== "undefined") {
        window.setTimeout(() => playedChimeKeys.delete(chimeKey), 60_000);
      }
    }
    initNotificationSoundUnlock();
    if (!unlocked) {
      pendingChime = true;
      void tryPlay().then((ok) => {
        if (ok) {
          pendingChime = false;
          unlocked = true;
          removeUnlockListeners();
        }
      });
      return;
    }
    void tryPlay().then((ok) => {
      if (!ok) {
        unlocked = false;
        pendingChime = true;
        initNotificationSoundUnlock();
      }
    });
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  initNotificationSoundUnlock();
}
