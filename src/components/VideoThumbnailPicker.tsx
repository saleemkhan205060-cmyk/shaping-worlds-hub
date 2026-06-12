import { useEffect, useRef, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

type Props = {
  /** Video source URL (remote URL or blob/object URL). */
  videoSrc: string;
  open: boolean;
  onClose: () => void;
  /** Called with the captured frame as a JPEG File. */
  onPick: (file: File, previewUrl: string) => void;
};

/**
 * TikTok / Instagram style thumbnail picker. Scrubs through a video and
 * captures the current frame to a JPEG via canvas.
 */
export function VideoThumbnailPicker({ videoSrc, open, onClose, onPick }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReady(false);
      setDuration(0);
      setCurrent(0);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    // Seek a tiny bit so we have a first frame to show.
    try {
      v.currentTime = 0.1;
    } catch {}
    setReady(true);
  };

  const onSeek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setCurrent(val);
  };

  const capture = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    setBusy(true);
    setError(null);
    try {
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (!w || !h) throw new Error("Video not ready");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.drawImage(v, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) =>
        c.toBlob((b) => res(b), "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Couldn't capture frame");
      const file = new File([blob], `thumbnail-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(blob);
      onPick(file, previewUrl);
      onClose();
    } catch (e: any) {
      // Most likely a CORS taint when the video is served without
      // Access-Control-Allow-Origin headers.
      setError(
        e?.message?.includes("tainted")
          ? "This video can't be captured here due to security restrictions."
          : e?.message || "Couldn't capture frame"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} className="p-2 -ml-2 active:scale-95">
          <X className="h-6 w-6" />
        </button>
        <h3 className="text-sm font-semibold">Choose cover</h3>
        <button
          onClick={capture}
          disabled={!ready || busy}
          className="inline-flex items-center gap-1.5 text-sm font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-full active:scale-95 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Use
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          crossOrigin="anonymous"
          playsInline
          muted
          preload="auto"
          onLoadedMetadata={onLoadedMeta}
          onSeeked={() => setCurrent(videoRef.current?.currentTime ?? 0)}
          className="max-h-full max-w-full"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-rose-300 text-center">{error}</div>
      )}

      <div className="px-5 py-5 bg-black/90 text-white">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.01)}
          step={0.05}
          value={current}
          disabled={!ready || duration <= 0}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="mt-1 flex justify-between text-[11px] text-white/60 tabular-nums">
          <span>{current.toFixed(1)}s</span>
          <span>{duration.toFixed(1)}s</span>
        </div>
        <p className="mt-2 text-[11px] text-center text-white/50">
          Drag to pick the frame you want as the cover
        </p>
      </div>
    </div>
  );
}
