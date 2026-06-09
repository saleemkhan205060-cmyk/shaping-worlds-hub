import { useCallback, useEffect, useRef, useState } from "react";
import { X, Heart, MessageCircle, Share2, Play, Volume2, VolumeX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CommentsSheet } from "@/components/CommentsSheet";
import { MediaActions } from "@/components/MediaActions";
import { AvatarImg } from "@/components/AvatarImg";

type UploaderProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PostLikeRow = { post_id: string; user_id: string | null };
type PostCommentRow = { post_id: string };

export type FsItem = {
  id: string;
  user_id?: string | null;
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
  const { user } = useAuth();
  const initialActiveId = items[startIndex]?.id ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const activeIdRef = useRef(initialActiveId);
  const userMutedRef = useRef(false);
  const ignoreNextVideoClickRef = useRef(false);
  const [activeId, setActiveId] = useState(initialActiveId);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Social state
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, UploaderProfile>>({});

  const playWithCurrentSoundPreference = useCallback(
    (id: string, reset = false) => {
      const v = videoRefs.current[id];
      if (!v) return;
      if (reset) v.currentTime = 0;
      v.volume = 1;
      v.muted = userMutedRef.current;
      v.play().catch(() => {
        if (!userMutedRef.current) {
          // Browser blocked sound autoplay. Keep the speaker preference ON,
          // but allow muted autoplay until the next user touch unlocks sound.
          v.muted = true;
          v.play().catch(() => {});
        }
      });
    },
    [],
  );

  const setSoundMuted = useCallback(
    (nextMuted: boolean) => {
      userMutedRef.current = nextMuted;
      setMuted(nextMuted);
      Object.values(videoRefs.current).forEach((v) => {
        if (!v) return;
        v.muted = nextMuted;
        v.volume = 1;
      });
      if (!nextMuted) playWithCurrentSoundPreference(activeIdRef.current);
    },
    [playWithCurrentSoundPreference],
  );

  // Lock body scroll & scroll to start index
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const targetId = items[startIndex]?.id ?? "";
    activeIdRef.current = targetId;
    setActiveId(targetId);
    const target = el.children[startIndex] as HTMLElement | undefined;
    if (target) el.scrollTo({ top: target.offsetTop, behavior: "instant" as ScrollBehavior });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [items, startIndex]);

  // Load likes & comment counts
  useEffect(() => {
    const ids = items.map((i) => i.id);
    if (ids.length === 0) return;
    (async () => {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      const lc: Record<string, number> = {};
      const me: Record<string, boolean> = {};
      ((likes ?? []) as PostLikeRow[]).forEach((l) => {
        lc[l.post_id] = (lc[l.post_id] ?? 0) + 1;
        if (user && l.user_id === user.id) me[l.post_id] = true;
      });
      const cc: Record<string, number> = {};
      ((comments ?? []) as PostCommentRow[]).forEach((c) => {
        cc[c.post_id] = (cc[c.post_id] ?? 0) + 1;
      });
      setLikeCounts(lc);
      setLikedByMe(me);
      setCommentCounts(cc);
    })();
  }, [items, user]);

  // Load uploader profiles
  useEffect(() => {
    const ids = Array.from(
      new Set(items.map((i) => i.user_id).filter((x): x is string => !!x))
    ).filter((id) => !profiles[id]);
    if (ids.length === 0) return;
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as UploaderProfile[]) next[p.id] = p;
          return next;
        });
      });
  }, [items, profiles]);


  // Observe which video is in view -> autoplay it, pause the rest
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const id = (e.target as HTMLElement).dataset.id!;
          const v = videoRefs.current[id];
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActiveId(id);
            activeIdRef.current = id;
            setPaused(false);
            playWithCurrentSoundPreference(id, true);
          } else {
            v?.pause();
          }
        });
      },
      { root, threshold: [0, 0.6, 1] }
    );
    Array.from(root.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length, playWithCurrentSoundPreference]);

  // On the first real touch/click in the player, unlock sound without changing the user's ON preference.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const removeUnlockListeners = () => {
      root.removeEventListener("pointerdown", handler, true);
      root.removeEventListener("click", handler, true);
      root.removeEventListener("touchstart", handler, true);
    };
    const handler = () => {
      removeUnlockListeners();
      if (userMutedRef.current) return;
      ignoreNextVideoClickRef.current = true;
      setSoundMuted(false);
      window.setTimeout(() => {
        ignoreNextVideoClickRef.current = false;
      }, 350);
    };
    root.addEventListener("pointerdown", handler, { capture: true });
    root.addEventListener("click", handler, { capture: true });
    root.addEventListener("touchstart", handler, { capture: true, passive: true });
    return removeUnlockListeners;
  }, [setSoundMuted]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePlay = (id: string) => {
    if (ignoreNextVideoClickRef.current) {
      ignoreNextVideoClickRef.current = false;
      return;
    }
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) {
      playWithCurrentSoundPreference(id);
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    setShowControls(true);
    setTimeout(() => setShowControls(false), 900);
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error("Sign in to like");
      return;
    }
    const isLiked = !!likedByMe[postId];
    setLikedByMe((m) => ({ ...m, [postId]: !isLiked }));
    setLikeCounts((c) => ({
      ...c,
      [postId]: Math.max(0, (c[postId] ?? 0) + (isLiked ? -1 : 1)),
    }));
    if (isLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) {
        setLikedByMe((m) => ({ ...m, [postId]: true }));
        setLikeCounts((c) => ({ ...c, [postId]: (c[postId] ?? 0) + 1 }));
        toast.error("Couldn't unlike");
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: user.id });
      if (error) {
        setLikedByMe((m) => ({ ...m, [postId]: false }));
        setLikeCounts((c) => ({ ...c, [postId]: Math.max(0, (c[postId] ?? 1) - 1) }));
        toast.error("Couldn't like");
      }
    }
  };

  const share = async (caption: string | null) => {
    const data = { title: caption ?? "Video", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(data.url);
    } catch {
      // Ignore share cancellations and clipboard permission denials.
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">


      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it, i) => {
          const isActive = it.id === activeId;
          const isLiked = !!likedByMe[it.id];
          const likes = likeCounts[it.id] ?? 0;
          const comments = commentCounts[it.id] ?? 0;
          return (
            <div
              key={it.id}
              data-id={it.id}
              className={`relative h-full w-full snap-start snap-always flex items-center justify-center bg-black ${i > 0 ? "border-t-[6px] border-white/10" : ""}`}
              style={{ height: "100dvh" }}
            >
              <MediaActions
                postId={it.id}
                ownerId={it.user_id ?? null}
                mediaUrl={it.media_url}
                caption={it.caption}
                onDeleted={() => onClose()}
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
              </MediaActions>

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

              {isActive && showControls && !paused && it.media_type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="h-16 w-16 rounded-full bg-black/40 flex items-center justify-center animate-in fade-in zoom-in">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 pb-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white pointer-events-none">
                {it.caption && <p className="text-sm leading-relaxed line-clamp-3 max-w-[80%]">{it.caption}</p>}
              </div>

              <div className="absolute right-3 bottom-24 flex flex-col gap-5 z-10">
                <ActionBtn
                  icon={<Heart className={`h-6 w-6 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />}
                  label={likes > 0 ? String(likes) : "Like"}
                  onClick={() => toggleLike(it.id)}
                  active={isLiked}
                />
                <ActionBtn
                  icon={<MessageCircle className="h-6 w-6" />}
                  label={comments > 0 ? String(comments) : "Chat"}
                  onClick={() => setCommentsOpenFor(it.id)}
                />
                <ActionBtn
                  icon={<Share2 className="h-6 w-6" />}
                  label="Share"
                  onClick={() => share(it.caption)}
                />
                {it.media_type === "video" && (
                  <ActionBtn
                    icon={muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                    label={muted ? "Muted" : "Sound"}
                    onClick={() => setSoundMuted(!userMutedRef.current)}
                  />
                )}
                {it.user_id && (
                  <Link
                    to="/u/$id"
                    params={{ id: it.user_id }}
                    className="flex items-center justify-center mt-1"
                    aria-label="View profile"
                  >
                    <span className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-white bg-white/10 flex items-center justify-center">
                      <AvatarImg
                        src={profiles[it.user_id]?.avatar_url}
                        alt={profiles[it.user_id]?.display_name ?? profiles[it.user_id]?.username ?? "User"}
                        fallback={profiles[it.user_id]?.display_name ?? profiles[it.user_id]?.username ?? "U"}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  </Link>
                )}
              </div>
            </div>


          );
        })}
      </div>

      {commentsOpenFor && (
        <CommentsSheet
          postId={commentsOpenFor}
          onClose={() => setCommentsOpenFor(null)}
          onCountChange={(n) =>
            setCommentCounts((c) => ({ ...c, [commentsOpenFor!]: n }))
          }
        />
      )}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-white drop-shadow-lg"
    >
      <span
        className={`h-11 w-11 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition ${
          active ? "bg-white/20" : "bg-white/10"
        }`}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
