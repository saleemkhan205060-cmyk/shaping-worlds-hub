// One shared AudioContext powers every notification chime app-wide.
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

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const audioWindow = window as AudioWindow;
  const Ctor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
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
  unlockEvents.forEach((eventName) =>
    window.removeEventListener(eventName, unlockFromGesture, true),
  );
  unlockBound = false;
}

function playSilentUnlockBuffer(ctx: AudioContext) {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    source.stop(ctx.currentTime + 0.01);
  } catch {
    /* ignore unlock buffer failures */
  }
}

async function unlockAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    playSilentUnlockBuffer(ctx);
    unlocked = ctx.state === "running";
    if (unlocked) {
      removeUnlockListeners();
      if (pendingChime) {
        pendingChime = false;
        playChime(ctx);
      }
    }
    return unlocked;
  } catch {
    return false;
  }
}

function unlockFromGesture() {
  void unlockAudioContext();
}

export function initNotificationSoundUnlock() {
  if (unlockBound || unlocked || typeof window === "undefined") return;
  unlockBound = true;
  unlockEvents.forEach((eventName) =>
    window.addEventListener(eventName, unlockFromGesture, {
      capture: true,
      passive: true,
    }),
  );
}

function playChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  master.connect(ctx.destination);

  [659.25, 830.61].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * 0.045;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.75, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.75);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.85);
  });
}

export function playSoftChime() {
  try {
    initNotificationSoundUnlock();
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state !== "running") {
      pendingChime = true;
      void unlockAudioContext();
      return;
    }

    unlocked = true;
    removeUnlockListeners();
    playChime(ctx);
  } catch {
    /* ignore audio errors */
  }
}

if (typeof window !== "undefined") {
  initNotificationSoundUnlock();
}
