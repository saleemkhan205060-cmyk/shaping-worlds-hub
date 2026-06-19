import { useEffect, useRef, useState } from "react";
import { useHistoryBackClose } from "@/hooks/use-history-back-close";
import { MoreVertical, Upload, Play, Pause, X, Sparkles, Music, Scissors, Volume2, VolumeX, Crop, SlidersHorizontal, Gauge, Type, Pencil, Camera, Sun, Wand2, Moon, Contrast, Droplet, Thermometer, Palette, CircleDot, Sunrise, Sunset } from "lucide-react";
import fixWebmDuration from "fix-webm-duration";

type Props = {
  file: File;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: "none", label: "Original", css: "none" },
  { id: "warm", label: "Warm", css: "saturate(1.2) hue-rotate(-10deg) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(15deg) brightness(1.02)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(0.95) saturate(1.2)" },
  { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.1) saturate(0.85)" },
];

const ASPECTS: { id: string; label: string; ratio: string }[] = [
  { id: "free", label: "Custom", ratio: "auto" },
  { id: "9:16", label: "9:16", ratio: "9 / 16" },
  { id: "2:3", label: "2:3", ratio: "2 / 3" },
  { id: "3:4", label: "3:4", ratio: "3 / 4" },
  { id: "1:1", label: "Square", ratio: "1 / 1" },
  { id: "16:9", label: "16:9", ratio: "16 / 9" },
];

type EditTab = "auto" | "crop" | "adjust" | "filters" | "audio" | "speed" | "music" | "text";
type AdjustSub = "brightness" | "contrast" | "saturation" | "highlights" | "shadows" | "whitePoint" | "blackPoint" | "warmth" | "tint" | "vignette" | null;
type CropRect = { x: number; y: number; w: number; h: number };
type VisualAdjustments = {
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  whitePoint: number;
  blackPoint: number;
  warmth: number;
  tint: number;
  vignette: number;
};

const FULL_CROP: CropRect = { x: 0, y: 0, w: 100, h: 100 };
const DEFAULT_VISUAL_ADJUSTMENTS: VisualAdjustments = {
  filter: "none",
  brightness: 1,
  contrast: 1,
  saturation: 1,
  highlights: 0,
  shadows: 0,
  whitePoint: 0,
  blackPoint: 0,
  warmth: 0,
  tint: 0,
  vignette: 0,
};

export function FullscreenVideoEditor({ file, onClose, onConfirm }: Props) {
  const handleClose = useHistoryBackClose(onClose);
  const videoRef = useRef<HTMLVideoElement>(null);
  const editPreviewRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string>("");
  const [musicSrc, setMusicSrc] = useState<string>("");
  const [musicName, setMusicName] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<null | "filter" | "sound" | "trim" | "edit">("edit");
  const [editTab, setEditTab] = useState<EditTab>("crop");
  const [adjustSub, setAdjustSub] = useState<AdjustSub>("brightness");
  const [filter, setFilter] = useState<string>("none");
  const [aspect, setAspect] = useState<string>("free");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  // Pro-grade tonal & color params (all centered at 0, range -1..1, except vignette 0..1)
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [whitePoint, setWhitePoint] = useState(0);
  const [blackPoint, setBlackPoint] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [tint, setTint] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [origVol, setOrigVol] = useState(1);
  const [musicVol, setMusicVol] = useState(0.8);
  const [origMuted, setOrigMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [overlayText, setOverlayText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(28);
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [savingCrop, setSavingCrop] = useState(false);
  const [savingElapsed, setSavingElapsed] = useState(0);

  useEffect(() => {
    if (!savingCrop) { setSavingElapsed(0); return; }
    const start = Date.now();
    setSavingElapsed(0);
    const id = window.setInterval(() => {
      setSavingElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [savingCrop]);




  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = origVol;
    v.muted = origMuted;
  }, [origVol, origMuted, src]);

  useEffect(() => {
    const a = musicRef.current;
    if (!a) return;
    a.volume = musicVol;
    a.muted = musicMuted;
  }, [musicVol, musicMuted, musicSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed, src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      editPreviewRef.current?.play().catch(() => {});
      musicRef.current?.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      editPreviewRef.current?.pause();
      musicRef.current?.pause();
      setPlaying(false);
    }
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    const ep = editPreviewRef.current;
    if (ep && Math.abs(ep.currentTime - v.currentTime) > 0.25) {
      ep.currentTime = v.currentTime;
    }
    if (trimEnd > 0 && v.currentTime >= trimEnd) {
      v.pause();
      v.currentTime = trimStart;
      if (ep) ep.currentTime = trimStart;
      if (musicRef.current) musicRef.current.currentTime = 0;
      setPlaying(false);
    }
  };


  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    if (trimEnd === 0) setTrimEnd(v.duration || 0);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "00:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrent(t);
  };

  const onPickMusic = (f: File | null) => {
    if (!f) return;
    if (musicSrc) URL.revokeObjectURL(musicSrc);
    setMusicSrc(URL.createObjectURL(f));
    setMusicName(f.name);
  };

  // High-quality pro tonal pipeline (Google Photos style).
  // Brightness is baked into an SVG gamma+lift curve combined with shadows/highlights/
  // black/white points, so it always applies smoothly across the full tonal range
  // without blowing out highlights or crushing shadows.
  const presetCss = FILTERS.find((f) => f.id === filter)?.css;
  const presetPart = presetCss && presetCss !== "none" ? presetCss + " " : "";

  // Warmth: positive = warmer (toward red/yellow), negative = cooler (toward blue)
  // Tint: positive = magenta, negative = green. Approximated with hue-rotate + sepia.
  const warmCss = warmth > 0
    ? `sepia(${(warmth * 0.35).toFixed(3)}) hue-rotate(${(-warmth * 6).toFixed(2)}deg)`
    : warmth < 0
      ? `hue-rotate(${(-warmth * 18).toFixed(2)}deg) saturate(${(1 + Math.abs(warmth) * 0.1).toFixed(3)})`
      : "";
  const tintCss = tint !== 0 ? `hue-rotate(${(tint * 22).toFixed(2)}deg)` : "";

  // Build a 9-point tone curve table combining brightness gamma + shadows/highlights/
  // black/white points. brightness>1 → gamma<1 (lift midtones), brightness<1 → gamma>1.
  const bDelta = brightness - 1; // typically -0.7 .. 0.8
  const gamma = brightness > 0 ? 1 / Math.pow(brightness, 0.85) : 1;
  const lift = bDelta * 0.04; // gentle shadow lift / drop
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const buildPoint = (x: number) => {
    // base brightness curve
    let y = Math.pow(x, gamma) + lift;
    // shadows: affect lower half, peak influence near x=0.25
    const shadowWeight = Math.max(0, 1 - Math.abs(x - 0.25) / 0.4);
    y += shadows * 0.22 * shadowWeight;
    // highlights: affect upper half, peak influence near x=0.75
    const highlightWeight = Math.max(0, 1 - Math.abs(x - 0.75) / 0.4);
    y += highlights * 0.22 * highlightWeight;
    // black point shifts the bottom of the curve
    y += blackPoint * 0.18 * (1 - x);
    // white point shifts the top of the curve
    y += whitePoint * 0.18 * x;
    return clamp01(y);
  };
  const steps = 9;
  const tonePts: number[] = [];
  for (let i = 0; i < steps; i++) tonePts.push(buildPoint(i / (steps - 1)));
  const toneTable = tonePts.map((n) => n.toFixed(4)).join(" ");

  // Compensating CSS contrast keeps punch when lifting brightness, so highlights
  // stay clean and shadows keep depth even with the gamma curve applied.
  const compContrast = contrast * (1 - bDelta * 0.12);

  const videoFilter = `url(#vfx-tone) ${presetPart}${warmCss ? warmCss + " " : ""}${tintCss ? tintCss + " " : ""}contrast(${compContrast}) saturate(${saturation})`;
  const aspectStyle = aspect === "free" ? {} : { aspectRatio: ASPECTS.find((a) => a.id === aspect)?.ratio };

  // Vignette overlay style (radial darkening at edges)
  const vignetteStyle: React.CSSProperties | null = vignette > 0
    ? { background: `radial-gradient(ellipse at center, transparent ${(60 - vignette * 30).toFixed(0)}%, rgba(0,0,0,${(vignette * 0.75).toFixed(3)}) 100%)` }
    : null;

  const handleDone = async () => {
    if (savingCrop) return;
    const cropChanged = Math.abs(crop.x) > 0.05 || Math.abs(crop.y) > 0.05 || Math.abs(crop.w - 100) > 0.05 || Math.abs(crop.h - 100) > 0.05;
    const effectiveEnd = trimEnd > 0 ? trimEnd : duration;
    const trimChanged = duration > 0 && (trimStart > 0.05 || effectiveEnd < duration - 0.05);
    const visualAdjustments: VisualAdjustments = { filter, brightness, contrast, saturation, highlights, shadows, whitePoint, blackPoint, warmth, tint, vignette };
    const visualChanged = hasVisualAdjustments(visualAdjustments);
    setSavingCrop(true);
    try {
      if (!cropChanged && !trimChanged && !visualChanged) {
        await new Promise((r) => setTimeout(r, Math.max(1200, Math.min(4000, Math.ceil((duration || 4) * 300)))));
        onConfirm(file);
        return;
      }
      const outFile = cropChanged || visualChanged
        ? await createCroppedVideoFile(file, cropChanged ? crop : FULL_CROP, trimStart, effectiveEnd, visualAdjustments)
        : await createTrimmedVideoFile(file, trimStart, effectiveEnd);
      onConfirm(outFile);
    } catch (error) {
      console.error("Video export failed", error);
      window.alert("Save failed. Please try again.");
    } finally {
      setSavingCrop(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col">
      {/* Hidden SVG filter for pro tonal curve */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="vfx-tone" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={toneTable} />
              <feFuncG type="table" tableValues={toneTable} />
              <feFuncB type="table" tableValues={toneTable} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* Video */}
      <div className="relative flex-1 overflow-hidden" onClick={togglePlay}>
        {src && (
          <video
            ref={videoRef}
            src={src}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: videoFilter }}
            onTimeUpdate={onTime}
            onLoadedMetadata={onLoaded}
            playsInline
          />
        )}
        {vignetteStyle && <div className="absolute inset-0 pointer-events-none" style={vignetteStyle} />}
        {musicSrc && <audio ref={musicRef} src={musicSrc} loop />}

        {/* Overlay text */}
        {overlayText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
            <span
              className="font-bold text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              style={{ color: textColor, fontSize: `${textSize}px` }}
            >
              {overlayText}
            </span>
          </div>
        )}

        {/* Top-right menu */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center border border-white/15 active:scale-95 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="h-11 w-11 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center border border-white/15 active:scale-95 transition"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Center play/pause button (real, tappable) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`pointer-events-auto h-20 w-20 rounded-full border-2 border-white/90 bg-black/30 backdrop-blur flex items-center justify-center active:scale-95 transition ${playing ? "opacity-0" : "opacity-100"}`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-9 w-9 text-white fill-white" /> : <Play className="h-9 w-9 text-white fill-white ml-1" />}
          </button>
        </div>

        {/* Bottom-right upload */}
        <div className="absolute bottom-20 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleDone}
            disabled={savingCrop}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-fuchsia-500/40 active:scale-95 transition"
            aria-label="Upload"
          >
            <Upload className="h-6 w-6" />
          </button>
        </div>


        {/* Bottom time + progress */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-6 bg-gradient-to-t from-black/60 to-transparent" onClick={(e) => e.stopPropagation()}>
          <div className="text-white text-xs font-medium tabular-nums mb-1">
            {fmt(current)} / {fmt(duration)}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={current}
              onChange={onSeek}
              className="flex-1 accent-white h-1"
            />
          </div>
        </div>
      </div>

      {/* Menu sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-[410] bg-black/60 flex items-end" onClick={() => setMenuOpen(false)}>
          <div className="w-full bg-white rounded-t-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <SheetItem icon={<Pencil className="h-5 w-5" />} label="Edit" onClick={() => { setMenuOpen(false); setSheet("edit"); setEditTab("crop"); }} />
            <SheetItem icon={<Sparkles className="h-5 w-5" />} label="Filters" onClick={() => { setMenuOpen(false); setSheet("filter"); }} />
            <SheetItem icon={<Music className="h-5 w-5" />} label="Sound settings" onClick={() => { setMenuOpen(false); setSheet("sound"); }} />
            <SheetItem icon={<Scissors className="h-5 w-5" />} label="Trim video" onClick={() => { setMenuOpen(false); setSheet("trim"); }} />
            <button onClick={() => setMenuOpen(false)} className="w-full py-3 text-sm font-semibold text-slate-600 border-t border-slate-100">Cancel</button>
          </div>
        </div>
      )}

      {/* EDIT — fullscreen editor (Google Photos style, tight spacing) */}
      {sheet === "edit" && (
        <div className="fixed inset-0 z-[420] bg-black flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Top processing banner — appears when Done is pressed */}
          {savingCrop && (() => {
            const estTotal = Math.max(6, Math.ceil((duration || 8) * 1.2));
            const remaining = Math.max(0, estTotal - savingElapsed);
            const pct = Math.min(99, Math.round((savingElapsed / estTotal) * 100));
            return (
              <div className="absolute top-0 left-0 right-0 z-[430] bg-gradient-to-b from-black/90 to-black/60 px-4 pt-3 pb-2">
                <div className="flex items-center justify-between text-white text-xs font-semibold mb-2 tabular-nums">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                    Preparing video…
                  </span>
                  <span>~{fmt(remaining)} left</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <span className="text-white text-sm font-semibold">Edit</span>
            {savingCrop ? (
              <div className="h-7 w-[72px]" aria-hidden />
            ) : (
              <button onClick={handleDone} className="text-black text-xs font-bold px-4 py-1.5 rounded-full bg-white active:scale-95 transition">Done</button>
            )}
          </div>



          {/* Preview — fills remaining space, no extra gap */}
          <div className="flex-1 min-h-0 flex items-center justify-center relative">
            {src && (
              <video
                ref={editPreviewRef}
                src={src}
                className={aspect === "free" ? "max-h-full max-w-full object-contain" : "w-full h-full object-contain"}
                style={{ filter: videoFilter, ...(aspect === "free" ? {} : aspectStyle) }}
                muted
                playsInline
                onClick={togglePlay}
                onLoadedMetadata={(e) => { e.currentTarget.currentTime = current; }}
              />
            )}
            {vignetteStyle && <div className="absolute inset-0 pointer-events-none" style={vignetteStyle} />}
            {overlayText && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none px-4">
                <span
                  className="font-bold text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                  style={{ color: textColor, fontSize: `${Math.max(14, textSize * 0.7)}px` }}
                >
                  {overlayText}
                </span>
              </div>
            )}

            {/* Crop overlay — aligned to video's actual rendered edges, draggable */}
            {editTab === "crop" && (
              <CropOverlay videoRef={editPreviewRef} crop={crop} onCropChange={setCrop} />
            )}
          </div>

          {/* Play + time pill (tight, directly below video) */}
          <div className="flex items-center justify-center gap-3 px-3 py-1.5 shrink-0">
            <button onClick={togglePlay} className="text-white active:scale-95 transition" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white" />}
            </button>
            <div className="inline-flex items-center gap-2 bg-white/10 text-white rounded-full px-4 py-1 text-sm font-medium tabular-nums">
              <Camera className="h-4 w-4" />
              {fmt(current)} / {fmt(duration)}
            </div>
          </div>

          {/* Trim strip with draggable handles (Google Photos style) — shown only in Auto tab */}
          {editTab === "auto" && (
          <div className="px-3 pb-1.5 shrink-0">

            <TrimStrip
              src={src}
              duration={duration}
              current={current}
              trimStart={trimStart}
              trimEnd={trimEnd || duration}
              onTrimStart={(t) => {
                setTrimStart(t);
                if (videoRef.current) videoRef.current.currentTime = t;
                if (editPreviewRef.current) editPreviewRef.current.currentTime = t;
              }}
              onTrimEnd={(t) => {
                setTrimEnd(t);
                if (videoRef.current && videoRef.current.currentTime > t) {
                  videoRef.current.currentTime = t;
                }
              }}
              onSeek={(t) => {
                if (videoRef.current) videoRef.current.currentTime = t;
                if (editPreviewRef.current) editPreviewRef.current.currentTime = t;
                setCurrent(t);
              }}
            />
          </div>
          )}


          {/* Active tab panel — compact */}
          {(editTab !== "crop" || true) && (
          <div className="px-3 pb-2 shrink-0">
            {editTab === "crop" && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAspect(a.id)}
                    className={`shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl border ${aspect === a.id ? "border-sky-300 bg-white/10" : "border-transparent bg-white/[0.06]"}`}
                  >
                    <span className={`h-5 w-5 rounded-[3px] ${aspect === a.id ? "bg-sky-200" : "bg-white/60"}`} />
                    <span className="text-[11px] font-medium text-white">{a.label}</span>
                  </button>
                ))}
              </div>
            )}
            {editTab === "auto" && (
              <div className="text-white">
                <button
                  onClick={() => { setBrightness(1.08); setContrast(1.12); setSaturation(1.15); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/20 transition active:scale-95"
                >
                  <Wand2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Auto Enhance</span>
                </button>
              </div>
            )}
            {editTab === "adjust" && (
              <div className="space-y-3 text-white">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {([
                    { id: "brightness", label: "Brightness", icon: <Sun className="h-4 w-4" /> },
                    { id: "contrast", label: "Contrast", icon: <Contrast className="h-4 w-4" /> },
                    { id: "highlights", label: "Highlights", icon: <Sunrise className="h-4 w-4" /> },
                    { id: "shadows", label: "Shadows", icon: <Moon className="h-4 w-4" /> },
                    { id: "whitePoint", label: "White point", icon: <Sunset className="h-4 w-4" /> },
                    { id: "blackPoint", label: "Black point", icon: <CircleDot className="h-4 w-4" /> },
                    { id: "saturation", label: "Saturation", icon: <Droplet className="h-4 w-4" /> },
                    { id: "warmth", label: "Warmth", icon: <Thermometer className="h-4 w-4" /> },
                    { id: "tint", label: "Tint", icon: <Palette className="h-4 w-4" /> },
                    { id: "vignette", label: "Vignette", icon: <SlidersHorizontal className="h-4 w-4" /> },
                  ] as const).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAdjustSub(a.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${adjustSub === a.id ? "bg-white text-black" : "bg-white/[0.08] text-white"}`}
                    >
                      {a.icon}
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
                {adjustSub === "brightness" && (
                  <AdjustRow label="Brightness" value={brightness} min={0.3} max={1.8} onChange={setBrightness} />
                )}
                {adjustSub === "contrast" && (
                  <AdjustRow label="Contrast" value={contrast} min={0.5} max={1.5} onChange={setContrast} />
                )}
                {adjustSub === "saturation" && (
                  <AdjustRow label="Saturation" value={saturation} min={0} max={2} onChange={setSaturation} />
                )}
                {adjustSub === "highlights" && (
                  <AdjustRow label="Highlights" value={highlights} min={-1} max={1} onChange={setHighlights} />
                )}
                {adjustSub === "shadows" && (
                  <AdjustRow label="Shadows" value={shadows} min={-1} max={1} onChange={setShadows} />
                )}
                {adjustSub === "whitePoint" && (
                  <AdjustRow label="White point" value={whitePoint} min={-1} max={1} onChange={setWhitePoint} />
                )}
                {adjustSub === "blackPoint" && (
                  <AdjustRow label="Black point" value={blackPoint} min={-1} max={1} onChange={setBlackPoint} />
                )}
                {adjustSub === "warmth" && (
                  <AdjustRow label="Warmth" value={warmth} min={-1} max={1} onChange={setWarmth} />
                )}
                {adjustSub === "tint" && (
                  <AdjustRow label="Tint" value={tint} min={-1} max={1} onChange={setTint} />
                )}
                {adjustSub === "vignette" && (
                  <AdjustRow label="Vignette" value={vignette} min={0} max={1} onChange={setVignette} />
                )}
              </div>
            )}
            {editTab === "filters" && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button key={f.id} onClick={() => setFilter(f.id)} className="shrink-0 flex flex-col items-center gap-1">
                    <div
                      className={`h-12 w-12 rounded-lg overflow-hidden border-2 ${filter === f.id ? "border-white" : "border-transparent"} bg-slate-700`}
                      style={{ filter: f.css }}
                    >
                      {src && <video src={src} className="w-full h-full object-cover" muted />}
                    </div>
                    <span className="text-[10px] text-white">{f.label}</span>
                  </button>
                ))}
              </div>
            )}
            {editTab === "audio" && (
              <div className="space-y-2 text-white text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span>Original sound</span>
                    <button onClick={() => setOrigMuted((m) => !m)}>
                      {origMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={origMuted ? 0 : origVol}
                    onChange={(e) => { setOrigVol(Number(e.target.value)); setOrigMuted(false); }}
                    className="w-full accent-white" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span>Music {musicName && <span className="opacity-70">· {musicName}</span>}</span>
                    <button onClick={() => setMusicMuted((m) => !m)} disabled={!musicSrc}>
                      {musicMuted || !musicSrc ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={musicMuted || !musicSrc ? 0 : musicVol}
                    onChange={(e) => { setMusicVol(Number(e.target.value)); setMusicMuted(false); }}
                    className="w-full accent-white" disabled={!musicSrc} />
                </div>
              </div>
            )}
            {editTab === "speed" && (
              <div className="flex gap-2 overflow-x-auto">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition active:scale-95 ${speed === s ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30" : "bg-white/10 text-white border border-white/15"}`}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
            {editTab === "music" && (
              <div className="text-white text-xs space-y-2">
                <button onClick={() => musicInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold shadow-lg shadow-fuchsia-500/30 active:scale-95 transition">
                  <Music className="h-4 w-4" /> {musicSrc ? "Change music" : "Pick from gallery"}
                </button>
                {musicName && <p className="opacity-80 truncate">Selected: {musicName}</p>}
                <input ref={musicInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => onPickMusic(e.target.files?.[0] ?? null)} />
              </div>
            )}
            {editTab === "text" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Add text…"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 text-sm outline-none"
                />
                <div className="flex items-center gap-3">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-8 w-10 bg-transparent" />
                  <input type="range" min={14} max={64} value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="flex-1 accent-white" />
                  <span className="text-white text-xs w-8 text-right">{textSize}</span>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Bottom tabs — Google Photos style */}
          <div className="flex justify-between gap-1 overflow-x-auto px-2 pb-3 pt-1 bg-black shrink-0 scrollbar-none">
            <EditTabBtn icon={<Wand2 className="h-6 w-6" />} label="Auto" active={editTab === "auto"} onClick={() => setEditTab("auto")} />
            <EditTabBtn icon={<SlidersHorizontal className="h-6 w-6" />} label="Adjust" active={editTab === "adjust"} onClick={() => setEditTab("adjust")} />
            <EditTabBtn icon={<Crop className="h-6 w-6" />} label="Crop" active={editTab === "crop"} onClick={() => setEditTab("crop")} />
            <EditTabBtn icon={<Sparkles className="h-6 w-6" />} label="Filters" active={editTab === "filters"} onClick={() => setEditTab("filters")} />
            <EditTabBtn icon={<Volume2 className="h-6 w-6" />} label="Audio" active={editTab === "audio"} onClick={() => setEditTab("audio")} />
            <EditTabBtn icon={<Gauge className="h-6 w-6" />} label="Speed" active={editTab === "speed"} onClick={() => setEditTab("speed")} />
            <EditTabBtn icon={<Music className="h-6 w-6" />} label="Music" active={editTab === "music"} onClick={() => setEditTab("music")} />
            <EditTabBtn icon={<Type className="h-6 w-6" />} label="Text" active={editTab === "text"} onClick={() => setEditTab("text")} />
          </div>
        </div>
      )}

      {/* Filter sheet */}
      {sheet === "filter" && (
        <BottomSheet title="Filters" onClose={() => setSheet(null)}>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 flex flex-col items-center gap-1.5 ${filter === f.id ? "" : "opacity-80"}`}
              >
                <div
                  className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${filter === f.id ? "border-indigo-600" : "border-transparent"} bg-slate-200`}
                  style={{ filter: f.css }}
                >
                  {src && <video src={src} className="w-full h-full object-cover" muted />}
                </div>
                <span className="text-[11px] font-medium text-slate-700">{f.label}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* Sound sheet */}
      {sheet === "sound" && (
        <BottomSheet title="Sound settings" onClose={() => setSheet(null)}>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">Original sound</span>
                <button onClick={() => setOrigMuted((m) => !m)} className="text-slate-700">
                  {origMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={origMuted ? 0 : origVol}
                onChange={(e) => { setOrigVol(Number(e.target.value)); setOrigMuted(false); }}
                className="w-full accent-indigo-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">
                  Added music {musicName && <span className="text-slate-500 font-normal">· {musicName}</span>}
                </span>
                <button onClick={() => setMusicMuted((m) => !m)} className="text-slate-700" disabled={!musicSrc}>
                  {musicMuted || !musicSrc ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={musicMuted || !musicSrc ? 0 : musicVol}
                onChange={(e) => { setMusicVol(Number(e.target.value)); setMusicMuted(false); }}
                className="w-full accent-indigo-600"
                disabled={!musicSrc}
              />
              <button
                onClick={() => musicInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
              >
                <Music className="h-4 w-4" /> {musicSrc ? "Change music" : "Pick from gallery"}
              </button>
              <input
                ref={musicInputRef} type="file" accept="audio/*" className="hidden"
                onChange={(e) => onPickMusic(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Trim sheet */}
      {sheet === "trim" && (
        <BottomSheet title="Trim video" onClose={() => setSheet(null)}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Start</span><span className="tabular-nums">{fmt(trimStart)}</span>
              </div>
              <input
                type="range" min={0} max={duration} step={0.1} value={trimStart}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), trimEnd - 0.5);
                  setTrimStart(v);
                  if (videoRef.current) videoRef.current.currentTime = v;
                }}
                className="w-full accent-indigo-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>End</span><span className="tabular-nums">{fmt(trimEnd)}</span>
              </div>
              <input
                type="range" min={0} max={duration} step={0.1} value={trimEnd}
                onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
                className="w-full accent-indigo-600"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Trim is applied when you tap Done.
            </p>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

const EXPORT_FPS = 30;
const MAX_EXPORT_EDGE = 720;

function hasVisualAdjustments(adjustments: VisualAdjustments) {
  return adjustments.filter !== "none"
    || Math.abs(adjustments.brightness - 1) > 0.005
    || Math.abs(adjustments.contrast - 1) > 0.005
    || Math.abs(adjustments.saturation - 1) > 0.005
    || Math.abs(adjustments.highlights) > 0.005
    || Math.abs(adjustments.shadows) > 0.005
    || Math.abs(adjustments.whitePoint) > 0.005
    || Math.abs(adjustments.blackPoint) > 0.005
    || Math.abs(adjustments.warmth) > 0.005
    || Math.abs(adjustments.tint) > 0.005
    || adjustments.vignette > 0.005;
}

function buildCanvasFilter(adjustments: VisualAdjustments) {
  const presetCss = FILTERS.find((f) => f.id === adjustments.filter)?.css;
  const presetPart = presetCss && presetCss !== "none" ? `${presetCss} ` : "";
  const warmthPart = adjustments.warmth > 0
    ? `sepia(${(adjustments.warmth * 0.35).toFixed(3)}) hue-rotate(${(-adjustments.warmth * 6).toFixed(2)}deg) `
    : adjustments.warmth < 0
      ? `hue-rotate(${(-adjustments.warmth * 18).toFixed(2)}deg) saturate(${(1 + Math.abs(adjustments.warmth) * 0.1).toFixed(3)}) `
      : "";
  const tintPart = adjustments.tint !== 0 ? `hue-rotate(${(adjustments.tint * 22).toFixed(2)}deg) ` : "";
  const brightnessPart = clampNumber(
    adjustments.brightness + adjustments.shadows * 0.08 + adjustments.highlights * 0.05 + adjustments.whitePoint * 0.06 - adjustments.blackPoint * 0.06,
    0.1,
    3,
  );
  const contrastPart = clampNumber(adjustments.contrast * (1 - (adjustments.brightness - 1) * 0.12), 0.1, 3);
  return `${presetPart}${warmthPart}${tintPart}brightness(${brightnessPart.toFixed(4)}) contrast(${contrastPart.toFixed(4)}) saturate(${clampNumber(adjustments.saturation, 0, 3).toFixed(4)})`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function createCroppedVideoFile(file: File, crop: CropRect, trimStart = 0, trimEnd = 0, adjustments: VisualAdjustments = DEFAULT_VISUAL_ADJUSTMENTS): Promise<File> {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder unavailable");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  attachHiddenVideo(video);

  try {
    await waitForVideoReady(video);
    const totalDur = video.duration || 0;
    const startAt = Math.max(0, Math.min(trimStart || 0, Math.max(totalDur - 0.05, 0)));
    const endAt = trimEnd && trimEnd > startAt ? Math.min(trimEnd, totalDur) : totalDur;

    return await recordCanvasVideo(file, video, crop, startAt, endAt, "edited", true, adjustments);
  } finally {
    video.pause();
    video.remove();
    URL.revokeObjectURL(url);
  }
}

async function createTrimmedVideoFile(file: File, trimStart = 0, trimEnd = 0): Promise<File> {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder unavailable");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  attachHiddenVideo(video);

  try {
    await waitForVideoReady(video);
    const totalDur = video.duration || 0;
    const startAt = Math.max(0, Math.min(trimStart || 0, Math.max(totalDur - 0.05, 0)));
    const endAt = trimEnd && trimEnd > startAt ? Math.min(trimEnd, totalDur) : totalDur;
    const errors: unknown[] = [];

    try {
      return await recordCapturedVideo(file, video, startAt, endAt, "trimmed");
    } catch (error) {
      errors.push(error);
      console.warn("Direct trim recording failed; retrying with safe canvas export", error);
    }

    try {
      return await recordCanvasVideo(file, video, FULL_CROP, startAt, endAt, "trimmed", false);
    } catch (error) {
      errors.push(error);
      throw errors[errors.length - 1] ?? error;
    }
  } finally {
    video.pause();
    video.remove();
    URL.revokeObjectURL(url);
  }
}

async function recordCapturedVideo(file: File, video: HTMLVideoElement, startAt: number, endAt: number, suffix: string): Promise<File> {
  await seekVideo(video, startAt);
  const captureVideo = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
  const stream = captureVideo.captureStream?.() ?? captureVideo.mozCaptureStream?.();
  if (!stream || !stream.getVideoTracks().length) throw new Error("Video capture unavailable");
  const { blob, mimeType } = await recordStreamSegment(stream, video, endAt);
  return fileFromRecordedBlob(file, blob, mimeType || blob.type, suffix, (endAt - startAt) * 1000);
}

async function recordCanvasVideo(
  file: File,
  video: HTMLVideoElement,
  crop: CropRect,
  startAt: number,
  endAt: number,
  suffix: string,
  preferAudio: boolean,
  adjustments: VisualAdjustments = DEFAULT_VISUAL_ADJUSTMENTS,
): Promise<File> {
  const sourceW = video.videoWidth || 1;
  const sourceH = video.videoHeight || 1;
  const sx = Math.max(0, Math.round((crop.x / 100) * sourceW));
  const sy = Math.max(0, Math.round((crop.y / 100) * sourceH));
  const sw = Math.max(2, Math.min(sourceW - sx, Math.round((crop.w / 100) * sourceW)));
  const sh = Math.max(2, Math.min(sourceH - sy, Math.round((crop.h / 100) * sourceH)));
  const scale = Math.min(1, MAX_EXPORT_EDGE / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = makeEven(Math.max(2, Math.round(sw * scale)));
  canvas.height = makeEven(Math.max(2, Math.round(sh * scale)));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");

  const canvasFilter = buildCanvasFilter(adjustments);
  const drawFrame = () => {
    ctx.filter = canvasFilter;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (adjustments.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * (0.25 + (1 - adjustments.vignette) * 0.2),
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.65,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.75, adjustments.vignette * 0.75)})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
  const attempts = preferAudio ? [true, false] : [false];
  let lastError: unknown;

  for (const withAudio of attempts) {
    try {
      await seekVideo(video, startAt);
      drawFrame();
      // Let the browser timestamp the canvas stream at a fixed frame rate.
      // Manual captureStream(0) + requestFrame can create uneven frame timing on
      // some phones, which makes the saved video play in small jumps.
      const canvasStream = canvas.captureStream(EXPORT_FPS);
      const frameVideo = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number;
        cancelVideoFrameCallback?: (handle: number) => void;
      };

      if (withAudio) {
        const captureVideo = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
        const originalStream = captureVideo.captureStream?.() ?? captureVideo.mozCaptureStream?.();
        originalStream?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      }

      let stopped = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;
      let videoFrameCallbackId: number | null = null;
      const frameIntervalMs = 1000 / EXPORT_FPS;
      const pump = () => {
        if (stopped) return;
        if (video.ended || video.currentTime >= endAt) return;
        drawFrame();
      };
      const scheduleVideoFrame = () => {
        if (stopped || !frameVideo.requestVideoFrameCallback) return;
        videoFrameCallbackId = frameVideo.requestVideoFrameCallback(() => {
          pump();
          scheduleVideoFrame();
        });
      };
      const hasVideoFrameCallback = typeof frameVideo.requestVideoFrameCallback === "function";

      const recording = recordStreamSegment(canvasStream, video, endAt, () => {
        stopped = true;
        if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
        if (videoFrameCallbackId !== null) { frameVideo.cancelVideoFrameCallback?.(videoFrameCallbackId); videoFrameCallbackId = null; }
      }, () => {
        pump();
        if (hasVideoFrameCallback) scheduleVideoFrame();
        else intervalId = setInterval(pump, frameIntervalMs);
      });
      const { blob, mimeType } = await recording;
      if (intervalId !== null) clearInterval(intervalId);
      return fileFromRecordedBlob(file, blob, mimeType || blob.type, suffix, (endAt - startAt) * 1000);
    } catch (error) {
      lastError = error;
      video.pause();
      console.warn(`Canvas export ${withAudio ? "with audio" : "without audio"} failed`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Recording failed");
}

async function recordStreamSegment(
  stream: MediaStream,
  video: HTMLVideoElement,
  endAt: number,
  onStop?: () => void,
  onStarted?: () => void,
): Promise<{ blob: Blob; mimeType: string }> {
  const mimeType = getRecorderMimeType();
  const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 3_500_000, audioBitsPerSecond: 96_000 };
  const recorder = new MediaRecorder(stream, mimeType ? { ...recorderOptions, mimeType } : recorderOptions);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

  let stopped = false;
  const stopOnce = () => {
    if (stopped) return;
    stopped = true;
    onStop?.();
    if (recorder.state !== "inactive") recorder.stop();
  };

  const done = new Promise<Blob>((resolve, reject) => {
    let settled = false;
    recorder.onerror = (event) => {
      if (settled) return;
      settled = true;
      stopped = true;
      onStop?.();
      video.pause();
      const err = (event as Event & { error?: DOMException }).error;
      reject(new Error(err?.message || err?.name || "Recording failed"));
    };
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" }));
    };
  });

  try {
    recorder.start(250);
    await video.play();
    onStarted?.();
    const playbackDone = new Promise<void>((resolve) => {
      let intervalId: ReturnType<typeof setInterval> | null = null;
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        if (intervalId !== null) clearInterval(intervalId);
        video.onended = null;
        resolve();
      };
      video.onended = finish;
      intervalId = setInterval(() => {
        if (stopped) { finish(); return; }
        if (video.currentTime >= endAt) { video.pause(); finish(); }
      }, 40);
    });
    await Promise.race([playbackDone, done.then(() => undefined)]);
    stopOnce();
    const blob = await done;
    if (!blob.size) throw new Error("Output video is empty");
    return { blob, mimeType: recorder.mimeType || mimeType || blob.type };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function waitForVideoReady(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 2 && video.videoWidth) { resolve(); return; }
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("Video load failed")); };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function attachHiddenVideo(video: HTMLVideoElement) {
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  document.body.appendChild(video);
}

function makeEven(value: number) {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const target = Math.max(0, time);
    if (Math.abs(video.currentTime - target) < 0.03 && video.readyState >= 2) { resolve(); return; }
    const done = () => { video.removeEventListener("seeked", done); resolve(); };
    video.addEventListener("seeked", done, { once: true });
    video.currentTime = target;
  });
}

function getRecorderMimeType() {
  return ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm", "video/webm;codecs=vp9,opus"]
    .find((type) => MediaRecorder.isTypeSupported(type));
}

async function fileFromRecordedBlob(source: File, blob: Blob, mimeType: string | undefined, suffix: string, durationMs: number) {
  const outputType = (mimeType || blob.type || "video/webm").split(";")[0];
  const outputExt = outputType.includes("mp4") ? "mp4" : "webm";
  const fixedBlob = outputExt === "webm" && durationMs > 0
    ? await fixWebmDuration(blob, durationMs, { logger: false }).catch(() => blob)
    : blob;
  return new File([fixedBlob], `${source.name.replace(/\.[^.]+$/, "")}-${suffix}.${outputExt}`, { type: outputType });
}

function SheetItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
    >
      {icon}{label}
    </button>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[410] bg-black/60 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditTabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-[44px] h-[58px] flex flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 ${active ? "text-white" : "text-white/70"}`}
    >
      {icon}
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}


function AdjustRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="tabular-nums opacity-80">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-white" />
    </div>
  );
}

function TrimStrip({
  src, duration, current, trimStart, trimEnd, onTrimStart, onTrimEnd, onSeek,
}: {
  src: string;
  duration: number;
  current: number;
  trimStart: number;
  trimEnd: number;
  onTrimStart: (t: number) => void;
  onTrimEnd: (t: number) => void;
  onSeek: (t: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const FRAMES = 6;

  useEffect(() => {
    if (!src || !duration) return;
    let cancelled = false;
    (async () => {
      try {
        const v = document.createElement("video");
        v.src = src; v.muted = true; v.playsInline = true; v.preload = "auto";
        await new Promise<void>((res, rej) => {
          v.onloadedmetadata = () => res();
          v.onerror = () => rej(new Error("load"));
        });
        const c = document.createElement("canvas");
        const scale = Math.min(1, 120 / (v.videoHeight || 120));
        c.width = Math.max(1, Math.round((v.videoWidth || 120) * scale));
        c.height = Math.max(1, Math.round((v.videoHeight || 120) * scale));
        const ctx = c.getContext("2d");
        if (!ctx) return;
        const urls: string[] = [];
        for (let i = 0; i < FRAMES; i++) {
          if (cancelled) return;
          const t = duration * (i / (FRAMES - 1 || 1));
          await new Promise<void>((res) => {
            v.onseeked = () => res();
            try { v.currentTime = Math.min(t, Math.max(duration - 0.05, 0)); } catch { res(); }
          });
          ctx.drawImage(v, 0, 0, c.width, c.height);
          urls.push(c.toDataURL("image/jpeg", 0.6));
          if (!cancelled) setThumbs([...urls]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [src, duration]);

  const pctFromClientX = (x: number) => {
    const el = stripRef.current; if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - r.left) / r.width));
  };

  const startDrag = (kind: "start" | "end" | "seek") => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const t = pctFromClientX(ev.clientX) * duration;
      if (kind === "start") onTrimStart(Math.min(t, trimEnd - 0.5));
      else if (kind === "end") onTrimEnd(Math.max(t, trimStart + 0.5));
      else onSeek(Math.max(trimStart, Math.min(trimEnd, t)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // initial
    const t = pctFromClientX(e.clientX) * duration;
    if (kind === "start") onTrimStart(Math.min(t, trimEnd - 0.5));
    else if (kind === "end") onTrimEnd(Math.max(t, trimStart + 0.5));
    else onSeek(Math.max(trimStart, Math.min(trimEnd, t)));
  };

  const startPct = duration ? (trimStart / duration) * 100 : 0;
  const endPct = duration ? (trimEnd / duration) * 100 : 100;
  const curPct = duration ? Math.max(startPct, Math.min(endPct, (current / duration) * 100)) : 0;

  return (
    <div className="relative h-12 select-none px-1">
      {/* Thumbnails strip */}
      <div
        ref={stripRef}
        className="absolute inset-x-1 inset-y-0 flex gap-[2px] touch-none overflow-hidden rounded-full bg-slate-800"
        onPointerDown={startDrag("seek")}
      >
        {Array.from({ length: FRAMES }).map((_, i) => (
          <div key={i} className="flex-1 h-full overflow-hidden bg-slate-300">
            {thumbs[i] && <img src={thumbs[i]} alt="" className="w-full h-full object-cover" draggable={false} />}
          </div>
        ))}
        {/* Dim outside trim region */}
        <div className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none" style={{ width: `${startPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-black/55 pointer-events-none" style={{ width: `${100 - endPct}%` }} />
        {/* Trim border */}
        <div
          className="absolute inset-y-0 border-y-2 border-white pointer-events-none"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{ left: `${curPct}%` }}
        />
      </div>
      {/* Left handle — follows trimStart */}
      <div
        onPointerDown={startDrag("start")}
        className="absolute top-0 bottom-0 w-7 flex items-center justify-center cursor-ew-resize z-20 touch-none"
        style={{ left: `calc(${startPct}% - 10px + 4px)` }}
      >
        <div className="h-full w-5 rounded-l-full bg-white flex items-center justify-center shadow">
          <div className="h-4 w-[3px] bg-slate-500 rounded-full" />
        </div>
      </div>
      {/* Right handle — follows trimEnd */}
      <div
        onPointerDown={startDrag("end")}
        className="absolute top-0 bottom-0 w-7 flex items-center justify-center cursor-ew-resize z-20 touch-none"
        style={{ right: `calc(${100 - endPct}% - 10px + 4px)` }}
      >
        <div className="h-full w-5 rounded-r-full bg-white flex items-center justify-center shadow">
          <div className="h-4 w-[3px] bg-slate-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Crop overlay aligned to the video's actual rendered rectangle (object-contain aware).
// Does NOT mutate video size/position/zoom — only renders interactive handles on top.
function CropOverlay({ videoRef, crop, onCropChange }: { videoRef: React.RefObject<HTMLVideoElement | null>; crop: CropRect; onCropChange: (crop: CropRect) => void }) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Track the video's actual rendered rect within its container
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const parent = v.parentElement;
    if (!parent) return;

    const measure = () => {
      const pr = parent.getBoundingClientRect();
      const vw = v.videoWidth || 0;
      const vh = v.videoHeight || 0;
      if (!vw || !vh || !pr.width || !pr.height) {
        // fallback: use the video element's own rect
        const r = v.getBoundingClientRect();
        setBox({ left: r.left - pr.left, top: r.top - pr.top, width: r.width, height: r.height });
        return;
      }
      const scale = Math.min(pr.width / vw, pr.height / vh);
      const w = vw * scale;
      const h = vh * scale;
      setBox({ left: (pr.width - w) / 2, top: (pr.height - h) / 2, width: w, height: h });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    ro.observe(v);
    v.addEventListener("loadedmetadata", measure);
    return () => { ro.disconnect(); v.removeEventListener("loadedmetadata", measure); };
  }, [videoRef]);

  // Apply the crop visually to the video via clip-path (inset relative to the video element box).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !box) return;
    const parent = v.parentElement;
    if (!parent) return;
    const vr = v.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    const vOffLeft = vr.left - pr.left;
    const vOffTop = vr.top - pr.top;
    const cLeft = box.left - vOffLeft + (crop.x / 100) * box.width;
    const cTop = box.top - vOffTop + (crop.y / 100) * box.height;
    const cW = (crop.w / 100) * box.width;
    const cH = (crop.h / 100) * box.height;
    const right = Math.max(0, vr.width - cLeft - cW);
    const bottom = Math.max(0, vr.height - cTop - cH);
    v.style.clipPath = `inset(${Math.max(0, cTop)}px ${right}px ${bottom}px ${Math.max(0, cLeft)}px)`;
    return () => { v.style.clipPath = ""; };
  }, [crop, box, videoRef]);

  if (!box) return null;

  const startDrag = (kind: "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | "move") => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const start = { ...crop };
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / box.width) * 100;
      const dy = ((ev.clientY - startY) / box.height) * 100;
      const MIN = 2;
      let { x, y, w, h } = start;
      if (kind === "move") {
        x = Math.max(0, Math.min(100 - w, start.x + dx));
        y = Math.max(0, Math.min(100 - h, start.y + dy));
      } else {
        if (kind.includes("l")) { const nx = Math.max(0, Math.min(start.x + start.w - MIN, start.x + dx)); w = start.w + (start.x - nx); x = nx; }
        if (kind.includes("r")) { w = Math.max(MIN, Math.min(100 - start.x, start.w + dx)); }
        if (kind.includes("t")) { const ny = Math.max(0, Math.min(start.y + start.h - MIN, start.y + dy)); h = start.h + (start.y - ny); y = ny; }
        if (kind.includes("b")) { h = Math.max(MIN, Math.min(100 - start.y, start.h + dy)); }
      }
      onCropChange({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const HANDLE = "absolute w-4 h-4 bg-white rounded-full shadow border border-black/30 touch-none";
  const EDGE = "absolute bg-white/80 touch-none";

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    >
      <div
        className="absolute pointer-events-auto"
        style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
      >
        {/* Dim outside */}
        <div className="absolute inset-0 ring-2 ring-white/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
        </div>
        {/* Move */}
        <div className="absolute inset-3 cursor-move" onPointerDown={startDrag("move")} />
        {/* Edges */}
        <div className={`${EDGE} left-3 right-3 -top-0.5 h-1 cursor-ns-resize`} onPointerDown={startDrag("t")} />
        <div className={`${EDGE} left-3 right-3 -bottom-0.5 h-1 cursor-ns-resize`} onPointerDown={startDrag("b")} />
        <div className={`${EDGE} top-3 bottom-3 -left-0.5 w-1 cursor-ew-resize`} onPointerDown={startDrag("l")} />
        <div className={`${EDGE} top-3 bottom-3 -right-0.5 w-1 cursor-ew-resize`} onPointerDown={startDrag("r")} />
        {/* Corners */}
        <div className={`${HANDLE} -top-2 -left-2 cursor-nwse-resize`} onPointerDown={startDrag("tl")} />
        <div className={`${HANDLE} -top-2 -right-2 cursor-nesw-resize`} onPointerDown={startDrag("tr")} />
        <div className={`${HANDLE} -bottom-2 -left-2 cursor-nesw-resize`} onPointerDown={startDrag("bl")} />
        <div className={`${HANDLE} -bottom-2 -right-2 cursor-nwse-resize`} onPointerDown={startDrag("br")} />
      </div>
    </div>
  );
}
