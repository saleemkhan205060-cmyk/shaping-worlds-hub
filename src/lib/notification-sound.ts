let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a soft notification chime using the Web Audio API.
 * Respects browser autoplay policy — will silently fail if the user
 * hasn't interacted with the page yet.
 */
export function playSoftChime() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Gentle bell-like tone (E5 + G#5)
    const frequencies = [659.25, 830.61];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      // Soft attack and long decay
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02 + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.03);
      osc.stop(now + 1.0 + i * 0.1);
    });
  } catch {
    // Ignore autoplay or other audio errors
  }
}
