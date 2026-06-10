import { useEffect, useRef, useState } from "react";
import { X, Music, RefreshCw, Zap, Timer, LayoutPanelTop, UserPlus2, ChevronDown } from "lucide-react";

type Mode = "10m" | "60s" | "15s" | "PHOTO";

const MODE_SECONDS: Record<Mode, number> = {
  "10m": 600,
  "60s": 60,
  "15s": 15,
  PHOTO: 0,
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
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startStream = async (face: "user" | "environment") => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: face },
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
  };

  useEffect(() => {
    startStream(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(f);
    }, "image/jpeg", 0.92);
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
    setElapsed(0);
    const max = MODE_SECONDS[mode];
    timerRef.current = window.setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= max) stopRecording();
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    setRecording(false);
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
      <div className="absolute inset-0 rounded-[28px] overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
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
      <div className="absolute right-3 top-20 z-10 flex flex-col items-center gap-5">
        <button
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Flip camera"
        >
          <RefreshCw className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
        </button>
        <button aria-label="Flash">
          <Zap className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
        </button>
        <div className="w-6 h-px bg-white/70" />
        <button aria-label="Timer">
          <Timer className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
        </button>
        <button aria-label="Templates">
          <LayoutPanelTop className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
        </button>
        <button aria-label="Effects" className="relative">
          <UserPlus2 className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 border border-black flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        </button>
        <button aria-label="More">
          <ChevronDown className="h-7 w-7 text-white drop-shadow" strokeWidth={2.25} />
        </button>
      </div>

      {error && (
        <div className="absolute top-24 inset-x-6 bg-red-600/90 rounded-xl p-3 text-sm text-center z-10">
          {error}
        </div>
      )}

      {recording && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-600 text-sm font-bold tabular-nums z-10">
          ● {fmt(elapsed)}
        </div>
      )}

      {/* Mode selector */}
      <div className="absolute left-0 right-0 bottom-36 flex items-center justify-center gap-7 z-10">
        {(Object.keys(MODE_SECONDS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => !recording && setMode(m)}
            className={
              mode === m
                ? "text-black bg-white px-4 py-1.5 rounded-full text-[17px] font-extrabold"
                : "text-white text-[17px] font-extrabold drop-shadow"
            }
          >
            {m}
          </button>
        ))}
      </div>

      {/* Record row */}
      <div className="absolute left-0 right-0 bottom-16 flex items-center justify-between px-6 z-10">
        <button
          onClick={onPickGallery}
          className="h-14 w-14 rounded-full overflow-hidden bg-gradient-to-br from-sky-300 to-emerald-400 border-2 border-white/40"
          aria-label="Gallery"
        />

        <button
          onClick={onTapRecord}
          className="h-[88px] w-[88px] rounded-full border-[5px] border-white/80 flex items-center justify-center bg-transparent"
          aria-label="Record"
        >
          <span
            className={`block rounded-full bg-rose-500 ${
              recording ? "h-8 w-8 rounded-md" : "h-[72px] w-[72px]"
            }`}
          />
        </button>

        <button
          onClick={onPickGallery}
          className="h-14 w-14 rounded-lg overflow-hidden bg-gradient-to-br from-amber-300 to-amber-500 border border-white/30"
          aria-label="Gallery 2"
        />
      </div>

      {/* Bottom tabs */}
      <div className="absolute left-0 right-0 bottom-3 flex items-center justify-around z-10 text-[15px] font-extrabold tracking-wider px-4">
        <span className="text-white/60">SELF</span>
        <span className="text-white/60">LIVE</span>
        <span className="text-white">CAMERA</span>
        <span className="text-white/60">CREATE</span>
      </div>
    </div>
  );
}
