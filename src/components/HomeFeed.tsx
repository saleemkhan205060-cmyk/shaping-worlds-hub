import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Send,
  X,
  Search,
  Heart,
  MessageCircle,
  Loader2,
  Play,
  Maximize2,
  MoreVertical,
  Film,
  Upload,
} from "lucide-react";
import { VideoThumbnailPicker } from "@/components/VideoThumbnailPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { FullscreenVideoPlayer, type FsItem } from "@/components/FullscreenVideoPlayer";
import { CommentsSheet } from "@/components/CommentsSheet";
import { MediaActions } from "@/components/MediaActions";
import { CameraCapture } from "@/components/CameraCapture";
import { AvatarImg } from "@/components/AvatarImg";
import { Globe2, Lock } from "lucide-react";
import { TextPostCard } from "@/components/TextPostCard";
import {
  BG_PRESETS,
  FONT_PRESETS,
  COLOR_PRESETS,
  SIZE_PRESETS,
  DEFAULT_TEXT_STYLE,
  type TextStyle,
} from "@/components/TextPostStyles";
import { uploadToStorage } from "@/lib/resumable-upload";
import { Progress } from "@/components/ui/progress";
import { FullscreenVideoEditor } from "@/components/FullscreenVideoEditor";
import likeSoundAsset from "@/assets/like.mp3.asset.json";

let likeAudio: HTMLAudioElement | null = null;
const playLikeSound = () => {
  if (typeof window === "undefined") return;
  try {
    if (!likeAudio) {
      likeAudio = new Audio(likeSoundAsset.url);
      likeAudio.preload = "auto";
      likeAudio.volume = 0.9;
    }
    likeAudio.currentTime = 0;
    void likeAudio.play().catch(() => {});
  } catch {
    /* ignore */
  }
};


type Post = {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: "image" | "video" | "text";
  caption: string | null;
  category: string | null;
  created_at: string;
  text_style?: unknown;
  thumbnail_url?: string | null;
  is_private?: boolean | null;
};


type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

const MAX_BYTES = 500 * 1024 * 1024;
const isVideoFile = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name);
const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name);

type SearchTab = "all" | "videos" | "photos" | "users" | "marriage" | "market";
const TABS: { id: SearchTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "videos", label: "Videos" },
  { id: "photos", label: "Photos" },
  { id: "users", label: "Users" },
  { id: "marriage", label: "Marriage" },
  { id: "market", label: "Market" },
];

type MarriageProfile = {
  id: string;
  user_id: string;
  age: number | null;
  looking_for: string | null;
  country: string | null;
  profession: string | null;
  marital_status: string | null;
  religion: string | null;
  about: string | null;
};

export function HomeFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [marriage, setMarriage] = useState<MarriageProfile[]>([]);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [captionMenuFor, setCaptionMenuFor] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [fullscreenPreviewOpen, setFullscreenPreviewOpen] = useState(false);
  const [uploadPrivacyOpen, setUploadPrivacyOpen] = useState(false);
  const captionPressTimer = useRef<number | null>(null);


  // Likes & comments aggregates
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);

  // Fullscreen player
  const [fsOpen, setFsOpen] = useState(false);
  const [fsIndex, setFsIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(false);

  // Inline video refs for autopause
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Load posts
  const loadPosts = useRef(() => {
    setLoading(true);
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setPosts(((data ?? []) as Post[]));
        setLoading(false);
      });
  }).current;

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Listen for global "home:refresh" event (e.g. from bottom nav Home button)
  useEffect(() => {
    const handler = () => loadPosts();
    window.addEventListener("home:refresh", handler);
    return () => window.removeEventListener("home:refresh", handler);
  }, [loadPosts]);

  // Load profiles
  useEffect(() => {
    const ids = Array.from(new Set(posts.map((p) => p.user_id))).filter(
      (id) => !profiles[id]
    );
    if (ids.length === 0) return;
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as Profile[]) next[p.id] = p;
          return next;
        });
      });
  }, [posts, profiles]);

  // Load like/comment counts whenever posts change
  useEffect(() => {
    const ids = posts.map((p) => p.id);
    if (ids.length === 0) return;
    (async () => {
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      const lc: Record<string, number> = {};
      const me: Record<string, boolean> = {};
      (likes ?? []).forEach((l: any) => {
        lc[l.post_id] = (lc[l.post_id] ?? 0) + 1;
        if (user && l.user_id === user.id) me[l.post_id] = true;
      });
      const cc: Record<string, number> = {};
      (comments ?? []).forEach((c: any) => {
        cc[c.post_id] = (cc[c.post_id] ?? 0) + 1;
      });
      setLikeCounts(lc);
      setLikedByMe(me);
      setCommentCounts(cc);
    })();
  }, [posts, user]);

  // Realtime posts
  useEffect(() => {
    const ch = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const np = payload.new as Post;
          setPosts((prev) =>
            prev.some((p) => p.id === np.id) ? prev : [np, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const old = payload.old as Post;
          setPosts((prev) => prev.filter((p) => p.id !== old.id));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // File preview
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);


  useEffect(() => {
    if (!thumbFile) { setThumbPreview(null); return; }
    const url = URL.createObjectURL(thumbFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbFile]);


  // IntersectionObserver: auto play/pause inline videos
  useEffect(() => {
    if (typeof window === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            v.play().catch(() => {});
          } else {
            if (!v.paused) v.pause();
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    Object.values(videoRefs.current).forEach((v) => {
      if (v) io.observe(v);
    });
    return () => io.disconnect();
  }, [posts]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!isImageFile(f) && !isVideoFile(f)) {
      toast.error("Only images and videos are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 500MB");
      return;
    }
    setFile(f);
    setFullscreenPreviewOpen(isVideoFile(f));
  };

  const submit = async (privacyOverride?: boolean) => {
    if (!user) {
      toast.error("Please sign in to post");
      return;
    }
    const shouldBePrivate = privacyOverride ?? isPrivate;
    const text = caption.trim();
    if (!file && !text) {
      toast.error("Write something or attach media");
      return;
    }
    setPosting(true);
    try {
      if (!file) {
        const { error: insErr } = await supabase.from("posts").insert({
          user_id: user.id,
          media_url: null,
          media_type: "text",
          caption: text,
          category: "For You",
          is_private: shouldBePrivate,
          text_style: textStyle as unknown as Record<string, unknown>,
        } as never);
        if (insErr) throw insErr;
      } else {

        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        setUploadPct(0);
        await uploadToStorage({
          bucket: "media",
          path,
          file,
          onProgress: (pct) => setUploadPct(pct),
        });
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        const media_url = pub.publicUrl;
        const media_type: "image" | "video" = isVideoFile(file) ? "video" : "image";

        let thumbnail_url: string | null = null;
        if (thumbFile) {
          const text2 = thumbFile.name.split(".").pop() || "jpg";
          const tpath = `${user.id}/thumbs/${Date.now()}.${text2}`;
          await uploadToStorage({ bucket: "media", path: tpath, file: thumbFile });
          thumbnail_url = supabase.storage.from("media").getPublicUrl(tpath).data.publicUrl;
        }

        const { error: insErr } = await supabase.from("posts").insert({
          user_id: user.id,
          media_url,
          media_type,
          caption: text || null,
          category: "For You",
          is_private: shouldBePrivate,
          thumbnail_url,
        } as any);
        if (insErr) throw insErr;
      }
      setCaption("");
      setFile(null);
      setFullscreenPreviewOpen(false);
      setUploadPrivacyOpen(false);
      setThumbFile(null);
      setIsPrivate(false);
      setTextStyle(DEFAULT_TEXT_STYLE);

      toast.success("Posted!");
    } catch (e) {
      console.error("[HomeFeed.submit] post failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't post: ${msg}`);
    } finally {
      setPosting(false);
      setUploadPct(0);
    }
  };

  // Load marriage profiles when the Marriage tab is selected
  useEffect(() => {
    if (tab !== "marriage" || marriage.length > 0) return;
    supabase
      .from("marriage_profiles")
      .select("*")
      .limit(100)
      .then(({ data }) => setMarriage(((data ?? []) as MarriageProfile[])));
  }, [tab, marriage.length]);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let base = posts;
    if (tab === "photos") base = base.filter((p) => p.media_type === "image");
    else if (tab === "videos") base = base.filter((p) => p.media_type === "video");
    else if (tab === "all") base = base;
    if (!q) return base;
    return base.filter((p) => {
      const prof = profiles[p.user_id];
      const caption = (p.caption ?? "").toLowerCase();
      return (
        caption.includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (prof?.username ?? "").toLowerCase().includes(q) ||
        (prof?.display_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, posts, profiles, tab, q]);

  const matchedProfiles = useMemo(() => {
    if (!q) return [];
    return Object.values(profiles).filter(
      (p) =>
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q)
    );
  }, [q, profiles]);

  const matchedMarriage = useMemo(() => {
    if (!q) return marriage;
    return marriage.filter((m) => {
      const prof = profiles[m.user_id];
      return (
        (prof?.display_name ?? "").toLowerCase().includes(q) ||
        (prof?.username ?? "").toLowerCase().includes(q) ||
        (m.country ?? "").toLowerCase().includes(q) ||
        (m.profession ?? "").toLowerCase().includes(q) ||
        (m.religion ?? "").toLowerCase().includes(q) ||
        (m.about ?? "").toLowerCase().includes(q)
      );
    });
  }, [q, marriage, profiles]);


  // Media posts eligible for fullscreen
  const mediaPosts = useMemo(
    () => filtered.filter((p) => (p.media_type === "image" || p.media_type === "video") && p.media_url),
    [filtered]
  );

  const openFullscreen = (postId: string) => {
    const idx = mediaPosts.findIndex((p) => p.id === postId);
    if (idx < 0) return;
    // pause all inline videos
    Object.values(videoRefs.current).forEach((v) => v?.pause());
    setFsIndex(idx);
    setFsOpen(true);
  };

  const fsItems: FsItem[] = mediaPosts.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    media_url: p.media_url!,
    media_type: p.media_type as "image" | "video",
    caption: p.caption,
    created_at: p.created_at,
    thumbnail_url: p.thumbnail_url ?? null,
  }));

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error("Sign in to like");
      return;
    }
    const isLiked = !!likedByMe[postId];
    if (!isLiked) playLikeSound();
    // optimistic
    setLikedByMe((m) => ({ ...m, [postId]: !isLiked }));
    setLikeCounts((c) => ({ ...c, [postId]: Math.max(0, (c[postId] ?? 0) + (isLiked ? -1 : 1)) }));
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

  const cancelCaptionPress = () => {
    if (captionPressTimer.current) {
      window.clearTimeout(captionPressTimer.current);
      captionPressTimer.current = null;
    }
  };

  const startCaptionPress = (post: Post) => {
    if (!user || user.id !== post.user_id) return;
    cancelCaptionPress();
    captionPressTimer.current = window.setTimeout(() => {
      setCaptionMenuFor(post.id);
      captionPressTimer.current = null;
    }, 550);
  };

  const openCaptionEditor = (post: Post) => {
    setCaptionMenuFor(null);
    setEditCaptionValue(post.caption ?? "");
    setEditingCaptionId(post.id);
  };

  const saveCaptionEdit = async () => {
    if (!editingCaptionId || !user) return;
    const newCaption = editCaptionValue.trim();
    const { error } = await supabase
      .from("posts")
      .update({ caption: newCaption || null })
      .eq("id", editingCaptionId)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't update title");
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === editingCaptionId ? { ...p, caption: newCaption || null } : p)));
    setEditingCaptionId(null);
    setEditCaptionValue("");
    toast.success("Title updated");
  };

  return (
    <section className="mt-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search users, posts, photos, videos, hashtags, marriage, market…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Users tab / People matches */}
      {tab === "users" && matchedProfiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500 px-2 mb-2">People</p>
          <div className="flex gap-3 overflow-x-auto">
            {matchedProfiles.slice(0, 20).map((p) => (
              <Link
                key={p.id}
                to="/u/$id"
                params={{ id: p.id }}
                className="shrink-0 flex flex-col items-center w-16"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  <AvatarImg
                    src={p.avatar_url}
                    alt={p.display_name ?? p.username ?? "?"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-[11px] mt-1 truncate w-full text-center">
                  {p.display_name ?? p.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Marriage tab */}
      {tab === "marriage" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 px-2">Marriage Profiles</p>
          {matchedMarriage.length === 0 ? (
            <p className="text-sm text-slate-500 px-2 py-4 text-center">No marriage profiles found.</p>
          ) : (
            matchedMarriage.slice(0, 30).map((m) => {
              const prof = profiles[m.user_id];
              const name = prof?.display_name ?? prof?.username ?? "Member";
              return (
                <Link
                  key={m.id}
                  to="/marriage"
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                    <AvatarImg src={prof?.avatar_url} alt={name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {[m.age && `${m.age}y`, m.country, m.profession].filter(Boolean).join(" · ") || "Tap to view"}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Market tab */}
      {tab === "market" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600 mb-3">Browse market items by category.</p>
          <Link
            to="/market"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
          >
            Open Market
          </Link>
        </div>
      )}


      {/* Composer */}
      {user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Share something with the world…"
            className="w-full resize-none text-sm focus:outline-none placeholder:text-slate-400"
          />
          {preview && file && (
            <div className="relative mt-2 rounded-xl overflow-hidden bg-slate-100">
              {isVideoFile(file) ? (
                <video
                  src={preview}
                  controls
                  controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full max-h-72 object-contain bg-black"
                />
              ) : (
                <img src={preview} alt="preview" className="w-full max-h-72 object-contain" />
              )}
              <button
                onClick={() => { setFile(null); setFullscreenPreviewOpen(false); }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {isVideoFile(file) && (
                <button
                  onClick={() => setVideoMenuOpen(true)}
                  className="absolute top-2 right-11 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95"
                  aria-label="More options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              )}
              {thumbPreview && isVideoFile(file) && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[11px] px-2 py-1 rounded">
                  <img src={thumbPreview} alt="thumb" className="h-5 w-5 rounded object-cover" />
                  <span>Thumbnail set</span>
                </div>
              )}
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setThumbFile(f);
                  e.currentTarget.value = "";
                }}
              />
              {posting && file && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white">
                    <span>Uploading…</span>
                    <span className="font-semibold tabular-nums">{uploadPct}%</span>
                  </div>
                  <Progress value={uploadPct} className="h-1.5 bg-white/20" />
                </div>
              )}
            </div>
          )}
          {!file && caption.trim().length > 0 && (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200">
                <TextPostCard text={caption} style={textStyle} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Background</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {BG_PRESETS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setTextStyle((s) => ({ ...s, bgId: b.id }))}
                      className={`shrink-0 h-8 w-8 rounded-full border-2 ${b.className} ${
                        textStyle.bgId === b.id ? "border-indigo-600 ring-2 ring-indigo-200" : "border-white"
                      }`}
                      aria-label={b.label}
                      title={b.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Text color</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTextStyle((s) => ({ ...s, colorId: c.id }))}
                      className={`shrink-0 h-7 w-7 rounded-full border-2 ${c.swatch} ${
                        textStyle.colorId === c.id ? "border-indigo-600 ring-2 ring-indigo-200" : "border-slate-200"
                      }`}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Font</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTextStyle((s) => ({ ...s, fontId: f.id }))}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs border ${f.className} ${
                        textStyle.fontId === f.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Size</p>
                  <div className="flex gap-1.5">
                    {SIZE_PRESETS.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setTextStyle((s) => ({ ...s, sizeId: z.id }))}
                        className={`h-7 min-w-7 px-2 rounded-full text-[11px] font-bold border ${
                          textStyle.sizeId === z.id
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Align</p>
                  <div className="flex gap-1.5">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setTextStyle((s) => ({ ...s, align: a }))}
                        className={`px-2.5 h-7 rounded-full text-[11px] font-medium border capitalize ${
                          textStyle.align === a
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (fileRef.current) fileRef.current.accept = "image/*";
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm text-emerald-700 hover:bg-emerald-50 transition"
              >
                <ImageIcon className="h-4 w-4" /> Photo
              </button>
              <button
                onClick={() => setShowCamera(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm text-rose-700 hover:bg-rose-50 transition"
              >
                <VideoIcon className="h-4 w-4" /> Video
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.currentTarget.value = "";
                  if (!f) return;
                  if (isVideoFile(f)) {
                    if (f.size > MAX_BYTES) { toast.error("File must be under 500MB"); return; }
                    pickFile(f);
                    return;
                  }
                  pickFile(f);
                }}
              />
            </div>
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setPrivacyOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={privacyOpen}
              >
                {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />}
                {isPrivate ? "Private" : "Public"}
              </button>
              {privacyOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-40"
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Post
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsPrivate(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${!isPrivate ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <Globe2 className="h-4 w-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsPrivate(true); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ${isPrivate ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <Lock className="h-4 w-4" /> Private
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    onClick={() => { submit(); setPrivacyOpen(false); }}
                    disabled={posting || (!file && !caption.trim())}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Post
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      {!user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-600">
          <Link to="/auth" className="text-indigo-600 font-semibold">Sign in</Link> to post and join the feed.
        </div>
      )}

      {/* Feed */}
      {tab !== "users" && tab !== "marriage" && tab !== "market" && (
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold px-1">Latest Feed</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            {query.trim() ? "No posts match your search." : "No posts yet. Be the first to share!"}
          </div>
        ) : (
          filtered.map((p) => {
            const prof = profiles[p.user_id];
            const name = prof?.display_name ?? prof?.username ?? "User";
            const isLiked = !!likedByMe[p.id];
            const likes = likeCounts[p.id] ?? 0;
            const comments = commentCounts[p.id] ?? 0;
            const hasMedia = (p.media_type === "image" || p.media_type === "video") && p.media_url;
            return (
              <article key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Link
                    to="/u/$id"
                    params={{ id: p.user_id }}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:bg-slate-50 transition rounded-lg -mx-1 px-1 py-1"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                      <AvatarImg src={prof?.avatar_url} alt={name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate hover:text-indigo-600">{name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                  {(p.media_type === "image" || p.media_type === "video") && (
                    user?.id === p.user_id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const next = !p.is_private;
                          setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_private: next } : x));
                          const { error } = await supabase.from("posts").update({ is_private: next } as any).eq("id", p.id);
                          if (error) {
                            setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_private: !next } : x));
                            toast.error("Couldn't update privacy");
                          } else {
                            toast.success(next ? "Set to Private" : "Set to Public");
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${p.is_private ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}
                        aria-label="Toggle privacy"
                      >
                        {p.is_private ? <><Lock className="h-3 w-3" /> Private</> : <><Globe2 className="h-3 w-3" /> Public</>}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${p.is_private ? "bg-slate-900 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                        {p.is_private ? <><Lock className="h-3 w-3" /> Private</> : <><Globe2 className="h-3 w-3" /> Public</>}
                      </span>
                    )
                  )}
                </div>
                {p.caption && p.media_type !== "text" && (
                  <div className="relative px-4 pb-3">
                    <p
                      className="text-sm whitespace-pre-wrap select-none"
                      onPointerDown={() => startCaptionPress(p)}
                      onPointerUp={cancelCaptionPress}
                      onPointerLeave={cancelCaptionPress}
                      onPointerCancel={cancelCaptionPress}
                      onContextMenu={(e) => {
                        if (user?.id !== p.user_id) return;
                        e.preventDefault();
                        setCaptionMenuFor(p.id);
                      }}
                    >
                      {p.caption}
                    </p>
                    {captionMenuFor === p.id && user?.id === p.user_id && (
                      <button
                        type="button"
                        onClick={() => openCaptionEditor(p)}
                        className="absolute right-4 top-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-lg"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {p.media_type === "text" && p.caption && (
                  <TextPostCard text={p.caption} style={p.text_style} />
                )}
                {p.media_type === "image" && p.media_url && (
                  <MediaActions
                    postId={p.id}
                    ownerId={p.user_id}
                    mediaUrl={p.media_url}
                    caption={p.caption}
                    onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  >
                    <button
                      type="button"
                      onClick={() => openFullscreen(p.id)}
                      className="relative w-full block group"
                      aria-label="Open image fullscreen"
                    >
                      <img
                        src={p.media_url}
                        alt={p.caption ?? "Post"}
                        className="w-full max-h-[520px] object-cover bg-slate-100"
                        loading="lazy"
                      />
                      <span className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="h-4 w-4" />
                      </span>
                    </button>
                  </MediaActions>
                )}
                {p.media_type === "video" && p.media_url && (
                  <MediaActions
                    postId={p.id}
                    ownerId={p.user_id}
                    mediaUrl={p.media_url}
                    caption={p.caption}
                    onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  >
                    <div className="relative bg-black">
                      <video
                        ref={(el) => {
                          videoRefs.current[p.id] = el;
                        }}
                        src={p.media_url}
                        poster={p.thumbnail_url ?? undefined}
                        playsInline
                        muted
                        loop
                        preload="metadata"
                        className="w-full max-h-[520px] cursor-pointer"
                        onClick={() => openFullscreen(p.id)}
                      />
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-[11px] font-semibold px-2 py-0.5 backdrop-blur-sm">
                        {p.is_private ? <><Lock className="h-3 w-3" /> Private</> : <><Globe2 className="h-3 w-3" /> Public</>}
                      </span>
                    </div>
                  </MediaActions>
                )}
                <div className="flex items-center gap-5 px-4 py-3 text-sm text-slate-600">
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={`flex items-center gap-1 transition ${isLiked ? "text-rose-500" : "hover:text-rose-500"}`}
                    aria-label={isLiked ? "Unlike" : "Like"}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
                    <span>{likes > 0 ? likes : "Like"}</span>
                  </button>
                  <button
                    onClick={() => setCommentsOpenFor(p.id)}
                    className="flex items-center gap-1 hover:text-indigo-600"
                    aria-label="Open comments"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{comments > 0 ? comments : "Comment"}</span>
                  </button>
                  {hasMedia && (
                    <button
                      onClick={() => openFullscreen(p.id)}
                      className="ml-auto flex items-center gap-1 hover:text-indigo-600"
                      aria-label="Open fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" /> Fullscreen
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
      )}


      {fsOpen && fsItems.length > 0 && (
        <FullscreenVideoPlayer
          items={fsItems}
          startIndex={fsIndex}
          onClose={() => setFsOpen(false)}
        />
      )}

      {commentsOpenFor && (
        <CommentsSheet
          postId={commentsOpenFor}
          onClose={() => setCommentsOpenFor(null)}
          onCountChange={(n) =>
            setCommentCounts((c) => ({ ...c, [commentsOpenFor!]: n }))
          }
        />
      )}

      {editingCaptionId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" onClick={() => setEditingCaptionId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-bold">Edit title</h3>
            <textarea
              value={editCaptionValue}
              onChange={(e) => setEditCaptionValue(e.target.value)}
              maxLength={500}
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCaptionId(null)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCaptionEdit}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onPickGallery={() => {
            setShowCamera(false);
            if (fileRef.current) fileRef.current.accept = "video/*";
            fileRef.current?.click();
          }}
          onCapture={(f) => { setShowCamera(false); pickFile(f); }}
        />
      )}

      {editorFile && (
        <FullscreenVideoEditor
          file={editorFile}
          onClose={() => setEditorFile(null)}
          onConfirm={(editedFile) => { setEditorFile(null); pickFile(editedFile); }}
        />
      )}

      {fullscreenPreviewOpen && file && isVideoFile(file) && preview && (
        <div className="fixed inset-0 z-[250] bg-black flex items-center justify-center">
          <style>{`
            .no-fs-video::-webkit-media-controls-fullscreen-button { display: none !important; }
            .no-fs-video::-webkit-media-controls-fullscreen-container { display: none !important; }
          `}</style>
          <video
            src={preview}
            controls
            playsInline
            controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-contain bg-black no-fs-video"
          />
          <button
            onClick={() => setFullscreenPreviewOpen(false)}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setVideoMenuOpen(true)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full text-white flex items-center justify-center active:scale-95 drop-shadow-lg"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          <div className="absolute top-16 right-4 flex flex-col items-end gap-2">
            <button
              onClick={() => setUploadPrivacyOpen((v) => !v)}
              disabled={posting}
              className="h-10 w-10 rounded-full text-white flex items-center justify-center active:scale-95 disabled:opacity-60 drop-shadow-lg"
              aria-label="Upload video"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </button>
            {uploadPrivacyOpen && (
              <div className="w-36 rounded-xl bg-white p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => { setIsPrivate(false); submit(false); }}
                  disabled={posting}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 active:bg-slate-100 disabled:opacity-50"
                >
                  <Globe2 className="h-4 w-4" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => { setIsPrivate(true); submit(true); }}
                  disabled={posting}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 active:bg-slate-100 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" /> Private
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {file && isVideoFile(file) && preview && (
        <VideoThumbnailPicker
          videoSrc={preview}
          open={framePickerOpen}
          onClose={() => setFramePickerOpen(false)}
          onPick={(f) => setThumbFile(f)}
        />
      )}

      {videoMenuOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setVideoMenuOpen(false)}
        >
          <div
            className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setVideoMenuOpen(false); if (file) setEditorFile(file); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Film className="h-5 w-5" />
              Edit
            </button>
            <button
              onClick={() => { setVideoMenuOpen(false); setFramePickerOpen(true); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Film className="h-5 w-5" />
              Choose thumbnail from video
            </button>
            <button
              onClick={() => { setVideoMenuOpen(false); thumbRef.current?.click(); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-800 border-b border-slate-100 active:bg-slate-100"
            >
              <Upload className="h-5 w-5" />
              Upload thumbnail image
            </button>
            {thumbFile && (
              <button
                onClick={() => { setVideoMenuOpen(false); setThumbFile(null); }}
                className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-rose-600 border-b border-slate-100 active:bg-slate-100"
              >
                <X className="h-5 w-5" />
                Remove thumbnail
              </button>
            )}
            <button
              onClick={() => setVideoMenuOpen(false)}
              className="w-full py-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </section>
  );
}

