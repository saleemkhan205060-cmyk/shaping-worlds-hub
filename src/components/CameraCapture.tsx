import { useEffect, useRef, useState } from "react";
import { X, Music, Sparkles, ChevronDown, ChevronUp, Check, RotateCcw, ChevronRight, SwitchCamera } from "lucide-react";

type Mode = "10m" | "60s" | "15s" | "PHOTO";

const MODE_SECONDS: Record<Mode, number> = {
  "10m": 600,
  "60s": 60,
  "15s": 15,
  PHOTO: 0,
};

type BeautyLevel = 0 | 1 | 2 | 3;
const BEAUTY_FILTERS: Record<BeautyLevel, string> = {
  0: "",
  1: "brightness(1.06) contrast(0.98) saturate(1.05)",
  2: "brightness(1.12) contrast(0.96) saturate(1.1)",
  3: "brightness(1.18) contrast(0.94) saturate(1.18)",
};

interface FilterPreset {
  id: string;
  name: string;
  css: string;
  swatch: string;
}

const FILTERS: FilterPreset[] = [
  { id: "normal", name: "Normal", css: "", swatch: "linear-gradient(135deg,#9ca3af,#e5e7eb)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.5) contrast(1.1)", swatch: "linear-gradient(135deg,#ff5e62,#ff9966)" },
  { id: "warm", name: "Warm", css: "sepia(0.25) saturate(1.3) hue-rotate(-10deg) brightness(1.05)", swatch: "linear-gradient(135deg,#f6d365,#fda085)" },
  { id: "cool", name: "Cool", css: "saturate(1.1) hue-rotate(15deg) brightness(1.02)", swatch: "linear-gradient(135deg,#74ebd5,#9face6)" },
  { id: "bw", name: "B&W", css: "grayscale(1) contrast(1.15)", swatch: "linear-gradient(135deg,#232526,#a8a8a8)" },
  { id: "vintage", name: "Vintage", css: "sepia(0.5) contrast(0.95) brightness(1.05) saturate(0.9)", swatch: "linear-gradient(135deg,#c79081,#dfa579)" },
  { id: "dramatic", name: "Drama", css: "contrast(1.35) saturate(0.85) brightness(0.95)", swatch: "linear-gradient(135deg,#1f1c2c,#928dab)" },
  { id: "fade", name: "Fade", css: "contrast(0.85) brightness(1.1) saturate(0.8)", swatch: "linear-gradient(135deg,#fceabb,#f8b500)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.9)", swatch: "linear-gradient(135deg,#000,#434343)" },
  { id: "pink", name: "Pink", css: "saturate(1.2) hue-rotate(-20deg) brightness(1.05)", swatch: "linear-gradient(135deg,#ffafbd,#ffc3a0)" },
  { id: "neon", name: "Neon", css: "saturate(2) contrast(1.2) hue-rotate(20deg)", swatch: "linear-gradient(135deg,#00f2fe,#4facfe)" },
  { id: "sunset", name: "Sunset", css: "sepia(0.3) saturate(1.4) hue-rotate(-15deg) brightness(1.08)", swatch: "linear-gradient(135deg,#ff6e7f,#bfe9ff)" },
  { id: "lush", name: "Lush", css: "saturate(1.4) contrast(1.05) hue-rotate(-5deg)", swatch: "linear-gradient(135deg,#0ba360,#3cba92)" },
  { id: "mint", name: "Mint", css: "saturate(1.15) hue-rotate(40deg) brightness(1.05)", swatch: "linear-gradient(135deg,#a8edea,#fed6e3)" },
  { id: "berry", name: "Berry", css: "saturate(1.3) hue-rotate(-30deg) contrast(1.05)", swatch: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { id: "ocean", name: "Ocean", css: "saturate(1.2) hue-rotate(25deg) brightness(0.98) contrast(1.05)", swatch: "linear-gradient(135deg,#2193b0,#6dd5ed)" },
  { id: "honey", name: "Honey", css: "sepia(0.35) saturate(1.4) brightness(1.06)", swatch: "linear-gradient(135deg,#f7971e,#ffd200)" },
  { id: "mono", name: "Mono", css: "grayscale(1) brightness(1.05) contrast(1.05)", swatch: "linear-gradient(135deg,#bdc3c7,#2c3e50)" },
  { id: "polaroid", name: "Polaroid", css: "sepia(0.2) saturate(1.1) brightness(1.08) contrast(0.95)", swatch: "linear-gradient(135deg,#ede574,#e1f5c4)" },
  { id: "cinema", name: "Cinema", css: "contrast(1.2) saturate(0.9) brightness(0.95) hue-rotate(-5deg)", swatch: "linear-gradient(135deg,#141e30,#243b55)" },
];

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
  const pendingFileRef = useRef<File | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const drawFrameRef = useRef<number | null>(null);
  const filterRef = useRef<string>("none");
  const activeRecordingMsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const advanceAfterStopRef = useRef(false);

  const [mode, setMode] = useState<Mode>("60s");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [beauty, setBeauty] = useState<BeautyLevel>(0);
  const [filterId, setFilterId] = useState<string>("normal");
  const [showFilters, setShowFilters] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [camTick, setCamTick] = useState(0);
  const [previewKind, setPreviewKind] = useState<"image" | "video" | null>(null);
  const [hasClip, setHasClip] = useState(false);
  const [progress, setProgress] = useState(0);

  const combinedFilter = (() => {
    const f = FILTERS.find((x) => x.id === filterId)?.css ?? "";
    const b = BEAUTY_FILTERS[beauty];
    const parts = [f, b].filter(Boolean).join(" ");
    return parts || "none";
  })();

  useEffect(() => {
    filterRef.current = combinedFilter;
  }, [combinedFilter]);

  useEffect(() => {
    let cancelled = false;
    // Stop any previous stream before requesting a new one (e.g. on facing flip)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const restart = () => {
      if (!cancelled) setCamTick((t) => t + 1);
    };
    let watchdog: number | null = null;
    (async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing } },
            audio: true,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // If the OS/browser kills the track, automatically restart the camera
        stream.getVideoTracks().forEach((track) => {
          track.onended = restart;
          track.onmute = () => {
            // Some devices temporarily mute; if it stays muted, restart
            window.setTimeout(() => {
              if (!cancelled && track.muted && track.readyState === "live") restart();
            }, 2000);
          };
        });
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          const tryPlay = () => v.play().catch(() => {});
          if (v.readyState >= 1) tryPlay();
          else v.onloadedmetadata = tryPlay;
          v.oncanplay = tryPlay;
        }
        // Watchdog: if the preview picture stops advancing, restart the camera
        let lastTime = -1;
        let stalledChecks = 0;
        watchdog = window.setInterval(() => {
          if (cancelled || document.visibilityState !== "visible") return;
          const vid = videoRef.current;
          const track = streamRef.current?.getVideoTracks()[0];
          if (!vid || !track) return;
          if (track.readyState === "ended") {
            restart();
            return;
          }
          if (vid.paused && streamRef.current) {
            vid.play().catch(() => {});
            return;
          }
          if (vid.currentTime === lastTime) {
            stalledChecks += 1;
            if (stalledChecks >= 2) {
              stalledChecks = 0;
              restart();
            }
          } else {
            stalledChecks = 0;
          }
          lastTime = vid.currentTime;
        }, 2500);
      } catch {
        if (!cancelled) setError("Camera not available. Please allow camera & microphone access.");
      }
    })();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === "ended") restart();
      else videoRef.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (watchdog) window.clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVisible);
      stopCanvasLoop();
      canvasStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      streamRef.current?.getTracks().forEach((t) => {
        t.onended = null;
        t.onmute = null;
        t.stop();
      });
      streamRef.current = null;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [facing, camTick]);

  // If the preview video element ever pauses on its own, resume it
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPause = () => {
      if (streamRef.current && !previewUrl) v.play().catch(() => {});
    };
    v.addEventListener("pause", onPause);
    return () => v.removeEventListener("pause", onPause);
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setPreviewFile = (f: File, kind: "image" | "video") => {
    pendingFileRef.current = f;
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setPreviewKind(kind);
  };

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (combinedFilter !== "none") ctx.filter = combinedFilter;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        setPreviewFile(f, "image");
      },
      "image/jpeg",
      0.92,
    );
  };

  const stopCanvasLoop = () => {
    if (drawFrameRef.current) {
      window.cancelAnimationFrame(drawFrameRef.current);
      drawFrameRef.current = null;
    }
  };

  const startCanvasLoop = () => {
    stopCanvasLoop();
    const canvas = recordCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const draw = () => {
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = filterRef.current === "none" ? "none" : filterRef.current;
      const scale = Math.max(canvas.width / vw, canvas.height / vh);
      const sw = canvas.width / scale;
      const sh = canvas.height / scale;
      const sx = Math.max(0, (vw - sw) / 2);
      const sy = Math.max(0, (vh - sh) / 2);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      drawFrameRef.current = window.requestAnimationFrame(draw);
    };
    draw();
  };

  const getPortraitRecordingStream = () => {
    if (canvasStreamRef.current) return canvasStreamRef.current;
    const source = streamRef.current;
    if (!source) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    recordCanvasRef.current = canvas;
    const stream = canvas.captureStream(30);
    source.getAudioTracks().forEach((track) => stream.addTrack(track.clone()));
    canvasStreamRef.current = stream;
    startCanvasLoop();
    return stream;
  };

  const stopRecordingStream = () => {
    stopCanvasLoop();
    canvasStreamRef.current?.getTracks().forEach((t) => t.stop());
    canvasStreamRef.current = null;
    recordCanvasRef.current = null;
  };

  const stopTimer = () => {
    if (segmentStartedAtRef.current !== null) {
      activeRecordingMsRef.current += performance.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    const max = MODE_SECONDS[mode];
    segmentStartedAtRef.current = performance.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const ms = activeRecordingMsRef.current + (segmentStartedAtRef.current ? performance.now() - segmentStartedAtRef.current : 0);
      const next = Math.floor(ms / 1000);
      setElapsed(next);
      setProgress(max ? Math.min(1, ms / (max * 1000)) : 0);
      if (max && ms >= max * 1000) finalizeRecording(false);
    }, 200);
  };

  const startRecording = () => {
    const existing = recorderRef.current;
    if (existing?.state === "paused") {
      try {
        startCanvasLoop();
        existing.resume();
      } catch {
        return;
      }
      setRecording(true);
      startTimer();
      return;
    }

    const stream = getPortraitRecordingStream();
    if (!stream) return;
    chunksRef.current = [];
    let mr: MediaRecorder;
    const opts = { videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 };
    try {
      mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus", ...opts });
    } catch {
      try {
        mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus", ...opts });
      } catch {
        mr = new MediaRecorder(stream, opts);
      }
    }
    recorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const type = mr.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const f = new File([blob], `video-${Date.now()}.webm`, { type });
      pendingFileRef.current = f;
      setHasClip(true);
      stopRecordingStream();
      if (advanceAfterStopRef.current) {
        advanceAfterStopRef.current = false;
        onCapture(f);
      }
    };
    mr.start(250);
    pendingFileRef.current = null;
    setHasClip(false);
    setRecording(true);
    activeRecordingMsRef.current = 0;
    setElapsed(0);
    setProgress(0);
    startTimer();
  };

  const stopRecording = () => {
    stopTimer();
    try {
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.pause();
    } catch {
      /* noop */
    }
    stopCanvasLoop();
    setHasClip(true);
    setRecording(false);
  };

  const finalizeRecording = (advance: boolean) => {
    stopTimer();
    advanceAfterStopRef.current = advance;
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      else if (advance && pendingFileRef.current) onCapture(pendingFileRef.current);
    } catch {
      if (advance && pendingFileRef.current) onCapture(pendingFileRef.current);
    }
    recorderRef.current = null;
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

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* noop */
    }
    stopRecordingStream();
    recorderRef.current = null;
    pendingFileRef.current = null;
    setPreviewUrl(null);
    setPreviewKind(null);
    setHasClip(false);
    activeRecordingMsRef.current = 0;
    segmentStartedAtRef.current = null;
    setElapsed(0);
    setProgress(0);
    setRecording(false);
  };

  const confirmUse = () => {
    const f = pendingFileRef.current;
    if (!f) return;
    onCapture(f);
  };

  const onNext = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      finalizeRecording(true);
      return;
    }
    confirmUse();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  // Preview review screen — user explicitly confirms or retakes
  if (previewUrl && previewKind) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white select-none overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {previewKind === "video" ? (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              controls
              playsInline
              style={{ filter: combinedFilter }}
              className="max-h-full max-w-full"
            />
          ) : (
            <img
              src={previewUrl}
              alt="preview"
              style={{ filter: combinedFilter }}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 z-10">
          <button onClick={retake} aria-label="Retake" className="flex items-center gap-2 bg-black/55 rounded-full px-4 py-2">
            <RotateCcw className="h-5 w-5" />
            <span className="text-[15px] font-bold">Retake</span>
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 bg-black/55 rounded-full px-4 py-2"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[15px] font-bold">Filters</span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="absolute left-0 right-0 bottom-28 z-10 px-3">
            <FiltersPanel filterId={filterId} setFilterId={setFilterId} onClose={() => setShowFilters(false)} />
          </div>
        )}

        <div className="absolute left-0 right-0 bottom-6 flex items-center justify-center gap-4 px-6 z-10">
          <button
            onClick={retake}
            className="flex-1 max-w-[160px] py-3 rounded-full bg-white/15 border border-white/40 text-[15px] font-bold"
          >
            Cancel
          </button>
          <button
            onClick={confirmUse}
            className="flex-1 max-w-[200px] py-3 rounded-full bg-rose-500 text-[15px] font-extrabold inline-flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Use this
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white select-none overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ filter: combinedFilter }}
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
        <button
          aria-label="Filters"
          onClick={() => setShowFilters((v) => !v)}
          className="relative"
        >
          {showFilters ? (
            <ChevronUp className="h-8 w-8 text-white drop-shadow" strokeWidth={2.25} />
          ) : (
            <ChevronDown className="h-8 w-8 text-white drop-shadow" strokeWidth={2.25} />
          )}
          {filterId !== "normal" && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-rose-500" />
          )}
        </button>
        {(hasClip || recording) && mode !== "PHOTO" && (
          <button
            onClick={onNext}
            aria-label="Next"
            className="mt-1 flex flex-col items-center"
          >
            <span className="h-11 w-11 rounded-full bg-rose-500 flex items-center justify-center shadow-lg">
              <ChevronRight className="h-6 w-6 text-white" strokeWidth={3} />
            </span>
            <span className="mt-1 text-[11px] font-bold text-white drop-shadow">Next</span>
          </button>
        )}
      </div>

      {error && (
        <div className="absolute top-24 inset-x-6 bg-red-600/90 rounded-xl p-3 text-sm text-center z-10">
          {error}
        </div>
      )}




      {/* Filters panel — stays open until user closes it */}
      {showFilters && (
        <div className="absolute left-0 right-0 bottom-44 z-10 px-3">
          <FiltersPanel filterId={filterId} setFilterId={setFilterId} onClose={() => setShowFilters(false)} />
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
      <div className="absolute left-0 right-0 bottom-4 flex items-center justify-between px-7 z-10">
        <button
          onClick={() => !recording && setFacing((f) => (f === "user" ? "environment" : "user"))}
          aria-label="Flip camera"
          disabled={recording}
          className="h-12 w-12 rounded-full border-2 border-white/90 bg-black/40 flex items-center justify-center active:scale-95 disabled:opacity-40"
        >
          <SwitchCamera className="h-5 w-5 text-white" strokeWidth={2.25} />
        </button>

        <div className="relative flex items-center">
          {(recording || hasClip) && (
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[13px] font-bold tabular-nums text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] bg-black/45 rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {fmt(elapsed)}
            </span>
          )}
          <button
            onClick={onTapRecord}
            className="relative h-[84px] w-[84px] rounded-full flex items-center justify-center bg-transparent overflow-visible active:scale-[0.98]"
            aria-label={recording ? "Pause recording" : hasClip ? "Resume recording" : "Record"}
          >
            {(recording || hasClip) && (
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
                <circle
                  cx="42"
                  cy="42"
                  r="38"
                  fill="none"
                  stroke="#ff2b5d"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(progress, recording ? 0.03 : 0.018) * 238.76} 238.76`}
                />
              </svg>
            )}
            <span
              className={`relative block bg-[#ff2b5d] shadow-[0_4px_18px_rgba(0,0,0,0.18)] ${
                recording ? "h-[34px] w-[34px] rounded-[7px]" : "h-[60px] w-[60px] rounded-full"
              }`}
            />
          </button>
        </div>


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

function FiltersPanel({
  filterId,
  setFilterId,
  onClose,
}: {
  filterId: string;
  setFilterId: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-black/65 backdrop-blur-md rounded-2xl px-3 py-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[13px] font-bold text-white/90">Filters</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/70">
            {FILTERS.find((f) => f.id === filterId)?.name}
          </span>
          {filterId !== "normal" && (
            <button
              onClick={() => setFilterId("normal")}
              className="text-[11px] font-semibold text-rose-300"
            >
              Reset
            </button>
          )}
          <button onClick={onClose} aria-label="Close filters" className="text-white/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = f.id === filterId;
          return (
            <button
              key={f.id}
              onClick={() => setFilterId(f.id)}
              className="flex flex-col items-center shrink-0"
            >
              <span
                className={`h-14 w-14 rounded-xl border-2 ${active ? "border-rose-500" : "border-white/40"}`}
                style={{ backgroundImage: f.swatch }}
              />
              <span
                className={`mt-1 text-[11px] font-semibold ${active ? "text-rose-400" : "text-white/85"}`}
              >
                {f.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
