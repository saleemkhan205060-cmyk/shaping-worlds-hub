import { useEffect, useRef, useState } from "react";
import { MoreVertical, Upload, Play, Pause, X, Sparkles, Music, Scissors, Volume2, VolumeX, Crop, SlidersHorizontal, Gauge, Type, Pencil, Camera, Sun, Wand2, Moon, Contrast, Droplet, Thermometer, Palette, CircleDot, Sunrise, Sunset } from "lucide-react";

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

const FULL_CROP: CropRect = { x: 0, y: 0, w: 100, h: 100 };

export function FullscreenVideoEditor({ file, onClose, onConfirm }: Props) {
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

  // Google Photos–style brightness: combine a gentle brightness() with a compensating
  // contrast curve so highlights don't blow out and shadows lift cleanly.
  // b > 1  -> brighten + slightly reduce contrast to protect highlights
  // b < 1  -> darken   + slightly increase contrast to keep punch in shadows
  const bDelta = brightness - 1;
  const effBrightness = 1 + bDelta * 0.85;
  const compContrast = contrast * (1 - bDelta * 0.18);
  const presetCss = FILTERS.find((f) => f.id === filter)?.css;
  const presetPart = presetCss && presetCss !== "none" ? presetCss + " " : "";
  const videoFilter = `${presetPart}brightness(${effBrightness}) contrast(${compContrast}) saturate(${saturation})`;
  const aspectStyle = aspect === "free" ? {} : { aspectRatio: ASPECTS.find((a) => a.id === aspect)?.ratio };

  const handleDone = async () => {
    if (savingCrop) return;
    const cropChanged = Math.abs(crop.x) > 0.05 || Math.abs(crop.y) > 0.05 || Math.abs(crop.w - 100) > 0.05 || Math.abs(crop.h - 100) > 0.05;
    if (!cropChanged) {
      onConfirm(file);
      return;
    }

    setSavingCrop(true);
    try {
      const croppedFile = await createCroppedVideoFile(file, crop);
      onConfirm(croppedFile);
    } catch (error) {
      console.error("Video crop failed", error);
      window.alert("Crop save failed. Please try again.");
    } finally {
      setSavingCrop(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col">

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
            onClick={() => onConfirm(file)}
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
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0">
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <span className="text-white text-sm font-semibold">Edit</span>
            {savingCrop ? (
              <div className="text-white text-xs font-bold px-4 py-1.5 rounded-full bg-white/15 tabular-nums inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                Processing {fmt(savingElapsed)}
              </div>
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
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {([
                    { id: "brightness", label: "Brightness", icon: <Sun className="h-4 w-4" /> },
                    { id: "contrast", label: "Contrast", icon: <SlidersHorizontal className="h-4 w-4" /> },
                    { id: "saturation", label: "Saturation", icon: <Sparkles className="h-4 w-4" /> },
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
              Playback preview only — original file is uploaded at full quality.
            </p>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

async function createCroppedVideoFile(file: File, crop: CropRect): Promise<File> {
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder unavailable");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Video load failed"));
    });

    const sourceW = video.videoWidth || 1;
    const sourceH = video.videoHeight || 1;
    const sx = Math.round((crop.x / 100) * sourceW);
    const sy = Math.round((crop.y / 100) * sourceH);
    const sw = Math.max(2, Math.round((crop.w / 100) * sourceW));
    const sh = Math.max(2, Math.round((crop.h / 100) * sourceH));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas unavailable");

    const stream = canvas.captureStream(30);
    const captureVideo = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const originalStream = captureVideo.captureStream?.() ?? captureVideo.mozCaptureStream?.();
    originalStream?.getAudioTracks().forEach((track) => stream.addTrack(track));

    const playbackProbe = document.createElement("video");
    const mimeType = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm"]
      .find((type) => MediaRecorder.isTypeSupported(type) && playbackProbe.canPlayType(type));
    const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 };
    const recorder = new MediaRecorder(stream, mimeType ? { ...recorderOptions, mimeType } : recorderOptions);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Recording failed"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    });

    const draw = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
    };

    video.currentTime = 0;
    recorder.start(250);
    await video.play();
    draw();
    await new Promise<void>((resolve) => { video.onended = () => resolve(); });
    recorder.stop();
    const blob = await done;
    if (!blob.size) throw new Error("Cropped video is empty");
    const outputType = (recorder.mimeType || blob.type || mimeType || "video/webm").split(";")[0];
    const outputExt = outputType.includes("mp4") ? "mp4" : "webm";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.${outputExt}`, { type: outputType });
  } finally {
    video.pause();
    URL.revokeObjectURL(url);
  }
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
