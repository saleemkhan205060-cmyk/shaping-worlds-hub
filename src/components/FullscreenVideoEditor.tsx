import { useEffect, useRef, useState } from "react";
import { MoreVertical, Upload, Play, Pause, X, Sparkles, Music, Scissors, Volume2, VolumeX } from "lucide-react";

type Props = {
  file: File;
  onClose: () => void;
  onConfirm: () => void;
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

export function FullscreenVideoEditor({ file, onClose, onConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string>("");
  const [musicSrc, setMusicSrc] = useState<string>("");
  const [musicName, setMusicName] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<null | "filter" | "sound" | "trim">(null);
  const [filter, setFilter] = useState<string>("none");
  const [origVol, setOrigVol] = useState(1);
  const [musicVol, setMusicVol] = useState(0.8);
  const [origMuted, setOrigMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

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

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      musicRef.current?.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      musicRef.current?.pause();
      setPlaying(false);
    }
  };

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (trimEnd > 0 && v.currentTime >= trimEnd) {
      v.pause();
      v.currentTime = trimStart;
      musicRef.current && (musicRef.current.currentTime = 0);
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
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
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

  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col">
      {/* Video */}
      <div className="relative flex-1 overflow-hidden" onClick={togglePlay}>
        {src && (
          <video
            ref={videoRef}
            src={src}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: FILTERS.find((f) => f.id === filter)?.css ?? "none" }}
            onTimeUpdate={onTime}
            onLoadedMetadata={onLoaded}
            playsInline
          />
        )}
        {musicSrc && <audio ref={musicRef} src={musicSrc} loop />}

        {/* Top-right menu */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Center play button — clean (no blur) */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-20 w-20 rounded-full border-2 border-white/90 flex items-center justify-center">
              <Play className="h-9 w-9 text-white fill-white ml-1" />
            </div>
          </div>
        )}
        {playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
            <Pause className="h-9 w-9 text-white" />
          </div>
        )}

        {/* Bottom-right upload */}
        <div className="absolute bottom-16 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onConfirm}
            className="h-14 w-14 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg active:scale-95"
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
            <SheetItem icon={<Sparkles className="h-5 w-5" />} label="Filters" onClick={() => { setMenuOpen(false); setSheet("filter"); }} />
            <SheetItem icon={<Music className="h-5 w-5" />} label="Sound settings" onClick={() => { setMenuOpen(false); setSheet("sound"); }} />
            <SheetItem icon={<Scissors className="h-5 w-5" />} label="Trim video" onClick={() => { setMenuOpen(false); setSheet("trim"); }} />
            <button onClick={() => setMenuOpen(false)} className="w-full py-3 text-sm font-semibold text-slate-600 border-t border-slate-100">Cancel</button>
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
