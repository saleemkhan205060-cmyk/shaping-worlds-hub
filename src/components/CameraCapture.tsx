import { useEffect, useRef, useState } from "react";
import { X, Music, Sparkles, ChevronDown, Pause, Play } from "lucide-react";

type Mode = "10m" | "60s" | "15s" | "PHOTO";

const MODE_SECONDS: Record<Mode, number> = {
  "10m": 600,
  "60s": 60,
  "15s": 15,
  PHOTO: 0,
};

type BeautyLevel = 0 | 1 | 2 | 3;
const BEAUTY_FILTERS: Record<BeautyLevel, string> = {
  0: "none",
  1: "brightness(1.06) contrast(0.98) saturate(1.05) blur(0.4px)",
  2: "brightness(1.12) contrast(0.96) saturate(1.1) blur(0.8px)",
  3: "brightness(1.18) contrast(0.94) saturate(1.18) blur(1.2px)",
};

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
  onPickGallery: () => void;
}

export function CameraCapture({ onCapture, onClose, onPickGallery }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<Mode>("60s");
  const [facing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [beauty, setBeauty] = useState<BeautyLevel>(0);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Camera not available. Please allow camera & microphone access.");
      }
    })();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [facing]);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (beauty > 0) ctx.filter = BEAUTY_FILTERS[beauty];
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(f);
      },
      "image/jpeg",
      0.92,
    );
  };

  const startTimer = () => {
    const max = MODE_SECONDS[mode];
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= max) stopRecording();
        return next;
      });
    }, 1000);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(stream, { mimeType: "video/mp4" });
    } catch {
      try {
        mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      } catch {
        mr = new MediaRecorder(stream);
      }
    }
    recorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const type = mr.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const f = new File([blob], `video-${Date.now()}.${ext}`, { type });
      onCapture(f);
    };
    mr.start();
    setRecording(true);
    setPaused(false);
    setElapsed(0);
    startTimer();
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      /* noop */
    }
    setRecording(false);
    setPaused(false);
  };

  const togglePause = () => {
    const mr = recorderRef.current;
    if (!mr) return;
    if (!paused) {
      try {
        mr.pause();
      } catch {
        /* noop */
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setPaused(true);
    } else {
      try {
        mr.resume();
      } catch {
        /* noop */
      }
      startTimer();
      setPaused(false);
    }
  };

  const onTapRecord = () => {
    if (mode === "PHOTO") {
      takePhoto();
      return;
    }
    if (recording) stopRecording();
    else startRecording();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white select-none overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ filter: BEAUTY_FILTERS[beauty] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 z-10">
        <button onClick={onClose} aria-label="Close" className="p-1">
          <X className="h-7 w-7 text-white drop-shadow" strokeWidth={2.5} />
        </button>

        <button className="flex items-center gap-1.5 bg-black/45 rounded-full px-4 py-2">
          <Music className="h-4 w-4 text-white" fill="white" />
          <span className="text-[15px] font-bold text-white">Add sound</span>
        </button>

        <div className="w-7" />
      </div>

      {/* Right side icon column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-6">
        <button
          onClick={() => setBeauty((b) => (((b + 1) % 4) as BeautyLevel))}
          aria-label="Beauty filter"
          className="relative"
        >
          <Sparkles
            className={`h-8 w-8 drop-shadow ${beauty > 0 ? "text-rose-400" : "text-white"}`}
            strokeWidth={2}
            fill={beauty > 0 ? "currentColor" : "none"}
          />
          {beauty > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 border border-black flex items-center justify-center text-[10px] font-bold leading-none">
              {beauty}
            </span>
          )}
        </button>
        <button aria-label="More">
          <ChevronDown className="h-8 w-8 text-white drop-shadow" strokeWidth={2.25} />
        </button>
      </div>

      {error && (
        <div className="absolute top-24 inset-x-6 bg-red-600/90 rounded-xl p-3 text-sm text-center z-10">
          {error}
        </div>
      )}

      {recording && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-600 text-sm font-bold tabular-nums z-10 flex items-center gap-2">
          <span className={paused ? "opacity-50" : "animate-pulse"}>●</span>
          {fmt(elapsed)}
          {paused && <span className="text-xs font-semibold">PAUSED</span>}
        </div>
      )}

      {/* Mode selector */}
      <div className="absolute left-0 right-0 bottom-32 flex items-center justify-center gap-7 z-10">
        {(Object.keys(MODE_SECONDS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => !recording && setMode(m)}
            className={
              mode === m
                ? "text-black bg-white px-4 py-1.5 rounded-full text-[18px] font-extrabold"
                : "text-white text-[18px] font-extrabold drop-shadow"
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Record row */}
      <div className="absolute left-0 right-0 bottom-6 flex items-center justify-between px-8 z-10">
        {/* Pause/Resume slot (only while recording) */}
        <div className="h-14 w-14 flex items-center justify-center">
          {recording && mode !== "PHOTO" ? (
            <button
              onClick={togglePause}
              aria-label={paused ? "Resume" : "Pause"}
              className="h-12 w-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg"
            >
              {paused ? (
                <Play className="h-6 w-6" fill="currentColor" />
              ) : (
                <Pause className="h-6 w-6" fill="currentColor" />
              )}
            </button>
          ) : null}
        </div>

        <button
          onClick={onTapRecord}
          className="h-[88px] w-[88px] rounded-full border-[5px] border-white flex items-center justify-center bg-transparent"
          aria-label="Record"
        >
          <span
            className={`block bg-rose-500 ${
              recording ? "h-8 w-8 rounded-md" : "h-[72px] w-[72px] rounded-full"
            }`}
          />
        </button>

        <button
          onClick={onPickGallery}
          aria-label="Gallery"
          className="h-14 w-14 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden"
        >
          <svg viewBox="0 0 64 64" className="h-11 w-11">
            {[
              { c: "#FF3B30", a: 0 },
              { c: "#FF9500", a: 45 },
              { c: "#FFCC00", a: 90 },
              { c: "#34C759", a: 135 },
              { c: "#00C7BE", a: 180 },
              { c: "#007AFF", a: 225 },
              { c: "#5856D6", a: 270 },
              { c: "#AF52DE", a: 315 },
            ].map((p, i) => (
              <ellipse
                key={i}
                cx="32"
                cy="18"
                rx="8"
                ry="14"
                fill={p.c}
                opacity="0.92"
                transform={`rotate(${p.a} 32 32)`}
              />
            ))}
            <circle cx="32" cy="32" r="5" fill="#fff" />
          </svg>
        </button>
      </div>
    </div>
  );
}
