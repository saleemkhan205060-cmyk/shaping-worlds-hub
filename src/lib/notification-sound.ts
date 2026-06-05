// Global, shared AudioContext for all notification sounds.
// Created lazily and unlocked on the first user interaction to comply
// with browser autoplay policies.

let audioCtx: AudioContext | null = null;
let unlockBound = false;
let unlocked = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
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

function unlock() {
  const ctx = ensureCtx();
  if (!ctx) return;
  const finish = () => {
    unlocked = true;
    // Play a 1-sample silent buffer to fully unlock on iOS/Safari.
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  };
  if (ctx.state === "suspended") {
    ctx.resume().then(finish).catch(() => {
      /* will retry on next interaction */
    });
  } else {
    finish();
  }
}

function bindUnlockListeners() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const events: (keyof WindowEventMap)[] = [
    "pointerdown",
    "touchstart",
    "mousedown",
    "keydown",
    "click",
  ];
  const handler = () => {
    unlock();
    if (unlocked) {
      events.forEach((e) =>
        window.removeEventListener(e, handler, { capture: true } as any),
      );
    }
  };
  events.forEach((e) =>
    window.addEventListener(e, handler, { capture: true, passive: true } as any),
  );
}

// Bind listeners immediately at module load (client only).
if (typeof window !== "undefined") {
  bindUnlockListeners();
}

/**
 * Play a soft notification chime using the Web Audio API.
 * Uses a shared global AudioContext. If the context is still suspended
 * (no user interaction yet), the sound is silently skipped — it will
 * work for all subsequent notifications.
 */
export function playSoftChime() {
  try {
    const ctx = ensureCtx();
    if (!ctx) return;

    // Try to resume if suspended (works after first interaction).
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;

    // Gentle bell-like tone (E5 + G#5)
    const frequencies = [659.25, 830.61];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02 + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.03);
      osc.stop(now + 1.0 + i * 0.1);
    });
  } catch {
    // Ignore audio errors
  }
}
