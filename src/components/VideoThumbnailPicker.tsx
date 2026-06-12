import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  /** Video source URL (remote URL or blob/object URL). */
  videoSrc: string;
  open: boolean;
  onClose: () => void;
  /** Called with the captured frame (or uploaded image) as a File. */
  onPick: (file: File, previewUrl: string) => void;
};

const FRAME_COUNT = 8;

/**
 * TikTok / Instagram style cover picker: large preview, a filmstrip of
 * frames at the bottom to tap-select, plus an Upload tile.
 */
export function VideoThumbnailPicker({ videoSrc, open, onClose, onPick }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFrames([]);
      setSelected(0);
      setError(null);
      return;
    }
    let cancelled = false;
    const extract = async () => {
      setExtracting(true);
      setError(null);
      try {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        v.src = videoSrc;
        await new Promise<void>((res, rej) => {
          v.onloadedmetadata = () => res();
          v.onerror = () => rej(new Error("Couldn't load video"));
        });
        const dur = Number.isFinite(v.duration) ? v.duration : 0;
        const c = document.createElement("canvas");
        const scale = Math.min(1, 180 / (v.videoHeight || 180));
        c.width = Math.max(1, Math.round(v.videoWidth * scale));
        c.height = Math.max(1, Math.round(v.videoHeight * scale));
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("Canvas unsupported");
        const urls: string[] = [];
        for (let i = 0; i < FRAME_COUNT; i++) {
          if (cancelled) return;
          const t = dur > 0 ? Math.min(dur * (i / FRAME_COUNT) + 0.1, Math.max(dur - 0.05, 0)) : 0;
          await new Promise<void>((res) => {
            v.onseeked = () => res();
            try {
              v.currentTime = t;
            } catch {
              res();
            }
          });
          ctx.drawImage(v, 0, 0, c.width, c.height);
          urls.push(c.toDataURL("image/jpeg", 0.7));
          if (!cancelled) setFrames([...urls]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Couldn't read video frames");
      } finally {
        if (!cancelled) setExtracting(false);
      }
    };
    void extract();
    return () => {
      cancelled = true;
    };
  }, [open, videoSrc]);

  // Keep big preview in sync with selected frame
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const dur = Number.isFinite(v.duration) ? v.duration : 0;
      try {
        v.currentTime = dur > 0 ? Math.min(dur * (selected / FRAME_COUNT) + 0.1, Math.max(dur - 0.05, 0)) : 0;
      } catch {}
    };
    if (v.readyState >= 1) onMeta();
    else v.onloadedmetadata = onMeta;
  }, [open, selected]);

  if (!open) return null;

  const save = async () => {
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
      const file = new File([blob], `thumbnail-${Date.now()}.jpg`, { type: "image/jpeg" });
      onPick(file, URL.createObjectURL(blob));
      onClose();
    } catch (e: any) {
      setError(
        e?.message?.includes("tainted")
          ? "This video can't be captured here due to security restrictions."
          : e?.message || "Couldn't capture frame"
      );
    } finally {
      setBusy(false);
    }
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image");
      return;
    }
    onPick(file, URL.createObjectURL(file));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={onClose} className="text-xl font-semibold text-slate-900 active:opacity-60">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="text-xl font-semibold text-slate-900 active:opacity-60 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Big preview */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black mx-4 rounded-xl">
        <video
          ref={videoRef}
          src={videoSrc}
          crossOrigin="anonymous"
          playsInline
          muted
          preload="auto"
          className="max-h-full max-w-full"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && <div className="px-4 py-1 text-xs text-rose-500 text-center">{error}</div>}

      {/* Filmstrip + Upload */}
      <div className="px-4 pt-3 pb-6">
        <div className="flex items-center justify-end mb-2 gap-1.5 text-slate-900">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="12" cy="12" r="3" />
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          </svg>
          <span className="text-sm font-bold">Preview</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {extracting && frames.length === 0 && (
            <div className="h-24 flex-1 flex items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {frames.map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative shrink-0 h-24 w-16 rounded-lg overflow-hidden border-2 ${
                selected === i ? "border-rose-500" : "border-transparent"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="shrink-0 h-24 w-20 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-900 active:scale-95"
          >
            <span className="text-2xl leading-none font-light">+</span>
            <span className="text-sm font-medium">Upload</span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    </div>
  );
}
