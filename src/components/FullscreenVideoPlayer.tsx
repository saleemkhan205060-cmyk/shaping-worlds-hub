import { useEffect, useRef, useState } from "react";
import { X, Heart, MessageCircle, Share2, Play, Volume2, VolumeX } from "lucide-react";

export type FsItem = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
};

type Props = {
  items: FsItem[];
  startIndex: number;
  onClose: () => void;
};

export function FullscreenVideoPlayer({ items, startIndex, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeId, setActiveId] = useState(items[startIndex]?.id ?? "");
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Scroll to start index & lock body scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.children[startIndex] as HTMLElement | undefined;
    if (target) el.scrollTo({ top: target.offsetTop, behavior: "instant" as ScrollBehavior });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [startIndex]);

  // Observe which video is in view -> autoplay it, pause the rest
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).dataset.id!;
          const v = videoRefs.current[id];
          if (!v) return;
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActiveId(id);
            setPaused(false);
            v.currentTime = 0;
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { root, threshold: [0, 0.6, 1] }
    );
    Array.from(root.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length]);

  // Keyboard: Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePlay = (id: string) => {
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    setShowControls(true);
    setTimeout(() => setShowControls(false), 900);
  };

  const share = async (caption: string | null) => {
    const data = { title: caption ?? "Video", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {/* Mute toggle */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it, i) => {
          const isActive = it.id === activeId;
          return (
            <div
              key={it.id}
              data-id={it.id}
              className={`relative h-full w-full snap-start snap-always flex items-center justify-center bg-black ${i > 0 ? "border-t-[6px] border-white/10" : ""}`}
              style={{ height: "100dvh" }}
            >
              {it.media_type === "video" ? (
                <video
                  ref={(el) => {
                    videoRefs.current[it.id] = el;
                  }}
                  src={it.media_url}
                  className="h-full w-full object-cover"
                  loop
                  playsInline
                  muted={muted}
                  preload="metadata"
                  onClick={() => togglePlay(it.id)}
                />
              ) : (
                <img src={it.media_url} alt={it.caption ?? ""} className="h-full w-full object-cover" />
              )}

              {/* Play overlay when paused */}
              {isActive && paused && it.media_type === "video" && (
                <button
                  onClick={() => togglePlay(it.id)}
                  className="absolute inset-0 flex items-center justify-center z-10"
                  aria-label="Play"
                >
                  <span className="h-20 w-20 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="h-10 w-10 text-white fill-white" />
                  </span>
                </button>
              )}

              {/* Brief play/pause feedback */}
              {isActive && showControls && !paused && it.media_type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="h-16 w-16 rounded-full bg-black/40 flex items-center justify-center animate-in fade-in zoom-in">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </span>
                </div>
              )}

              {/* Bottom caption gradient */}
              <div className="absolute inset-x-0 bottom-0 p-5 pb-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white pointer-events-none">
                {it.caption && <p className="text-sm leading-relaxed line-clamp-3 max-w-[80%]">{it.caption}</p>}
                <p className="text-xs text-white/60 mt-1">
                  {new Date(it.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Right rail actions */}
              <div className="absolute right-3 bottom-24 flex flex-col gap-5 z-10">
                <ActionBtn icon={<Heart className="h-6 w-6" />} label="Like" />
                <ActionBtn icon={<MessageCircle className="h-6 w-6" />} label="Chat" />
                <ActionBtn
                  icon={<Share2 className="h-6 w-6" />}
                  label="Share"
                  onClick={() => share(it.caption)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
    >
      <span className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-95 transition">
        {icon}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
