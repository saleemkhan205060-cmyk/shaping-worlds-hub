import { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, RotateCcw } from "lucide-react";

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
    } catch (e) {
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
    <div className="fixed inset-0 z-[100] bg-black text-white select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 z-10">
        <button onClick={onClose} className="h-9 w-9 rounded-full bg-black/40 flex items-center justify-center">
          <X className="h-5 w-5" />
        </button>
        {recording && (
          <div className="px-3 py-1 rounded-full bg-red-600 text-sm font-bold tabular-nums">
            ● {fmt(elapsed)}
          </div>
        )}
        <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} className="h-9 w-9 rounded-full bg-black/40 flex items-center justify-center">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="absolute top-20 inset-x-4 bg-red-600/90 rounded-xl p-3 text-sm text-center z-10">
          {error}
        </div>
      )}

      {/* Mode selector */}
      <div className="absolute left-0 right-0 bottom-44 flex items-center justify-center gap-5 z-10">
        {(Object.keys(MODE_SECONDS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => !recording && setMode(m)}
            className={`text-base font-extrabold tracking-wide transition ${
              mode === m
                ? "text-black bg-white px-4 py-1.5 rounded-full"
                : "text-white/90 drop-shadow"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Record row */}
      <div className="absolute left-0 right-0 bottom-24 flex items-center justify-center z-10">
        <button
          onClick={onPickGallery}
          className="absolute left-8 h-14 w-14 rounded-full overflow-hidden bg-white/20 border-2 border-white/60 flex items-center justify-center"
          aria-label="Gallery"
        >
          <ImageIcon className="h-6 w-6 text-white" />
        </button>

        <button
          onClick={onTapRecord}
          className={`h-24 w-24 rounded-full border-[6px] border-white flex items-center justify-center transition ${
            recording ? "bg-red-600" : "bg-rose-500"
          }`}
          aria-label="Record"
        >
          {recording && <div className="h-8 w-8 rounded-md bg-white" />}
        </button>
      </div>

      {/* Bottom tabs */}
      <div className="absolute left-0 right-0 bottom-6 flex items-center justify-center gap-10 z-10 text-base font-extrabold tracking-wider">
        <span className="text-white/50">CREATE</span>
        <span className="text-white">CAMERA</span>
      </div>
    </div>
  );
}
