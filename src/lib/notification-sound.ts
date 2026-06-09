// Notification chime: generated with WebAudio so it cannot fail because of a
// missing/blocked audio file. The AudioContext is resumed synchronously from a
// real user gesture, then reused for message events.

let audioCtx: AudioContext | null = null;
let unlockBound = false;
let unlocked = false;
let pendingChimes = 0;
let queueRunning = false;
const playedChimeKeys = new Set<string>();

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const CHIME_PREF_KEY = "vip:notification-chime-enabled";
const CHIME_PREF_EVENT = "vip:notification-chime-changed";
const MAX_PENDING_CHIMES = 6;

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

function playSilentUnlockTone(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(440, now);
  gain.gain.setValueAtTime(0.00001, now);
  gain.gain.setValueAtTime(0.00001, now + 0.03);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

function playGeneratedChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const compressor = ctx.createDynamicsCompressor();
  const master = ctx.createGain();

  compressor.threshold.setValueAtTime(-6, now);
  compressor.knee.setValueAtTime(20, now);
  compressor.ratio.setValueAtTime(3, now);
  compressor.attack.setValueAtTime(0.001, now);
  compressor.release.setValueAtTime(0.15, now);

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(1.6, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
  master.connect(compressor);
  compressor.connect(ctx.destination);

  [
    { freq: 880, start: 0, stop: 0.28, gain: 1.4, type: "triangle" as OscillatorType },
    { freq: 1318.51, start: 0.055, stop: 0.36, gain: 1.2, type: "sine" as OscillatorType },
    { freq: 1760, start: 0.12, stop: 0.42, gain: 0.9, type: "sine" as OscillatorType },
    { freq: 2349.32, start: 0.18, stop: 0.48, gain: 0.6, type: "sine" as OscillatorType },
  ].forEach((tone) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + tone.start;
    const stop = now + tone.stop;
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(stop + 0.04);
  });
}

async function tryPlay(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return false;
    unlocked = true;
    removeUnlockListeners();
    playGeneratedChime(ctx);
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
        window.setTimeout(playNext, 620);
      } else {
        queueRunning = false;
      }
    });
  };

  playNext();
}

function unlockFromGesture() {
  // Keep media calls inside the original gesture stack; do not await before
  // resuming/starting audio, because mobile browsers drop the activation token.
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const resumePromise = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    playSilentUnlockTone(ctx);
    void resumePromise.then(() => {
      if (ctx.state !== "running") return;
      unlocked = true;
      removeUnlockListeners();
      drainChimeQueue();
    });
    if (ctx.state === "running") {
      unlocked = true;
      removeUnlockListeners();
      drainChimeQueue();
    }
  } catch {
    /* ignore */
  }
}

export function initNotificationSoundUnlock() {
  if (typeof window === "undefined") return;
  if (audioCtx?.state === "running") {
    unlocked = true;
    removeUnlockListeners();
    return;
  }
  if (unlockBound || unlocked) return;
  unlockBound = true;
  unlockEvents.forEach((e) => {
    window.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
    document.addEventListener(e, unlockFromGesture, { capture: true, passive: true });
  });
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
