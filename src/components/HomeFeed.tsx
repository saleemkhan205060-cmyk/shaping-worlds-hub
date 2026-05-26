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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Post = {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: "image" | "video" | "text";
  caption: string | null;
  category: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const MAX_BYTES = 50 * 1024 * 1024;

export function HomeFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Load posts
  useEffect(() => {
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setPosts(((data ?? []) as Post[]));
        setLoading(false);
      });
  }, []);

  // Load profiles for visible posts
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

  // Realtime
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

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) {
      toast.error("Only images and videos are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 50MB");
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to post");
      return;
    }
    const text = caption.trim();
    if (!text && !file) {
      toast.error("Write something or attach media");
      return;
    }
    setPosting(true);
    try {
      let media_url: string | null = null;
      let media_type: "image" | "video" | "text" = "text";
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        media_url = pub.publicUrl;
        media_type = file.type.startsWith("video/") ? "video" : "image";
      }
      const { error: insErr } = await supabase.from("posts").insert({
        user_id: user.id,
        media_url,
        media_type,
        caption: text || null,
        category: "For You",
      });
      if (insErr) throw insErr;
      setCaption("");
      setFile(null);
      toast.success("Posted!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  // Search filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const prof = profiles[p.user_id];
      return (
        (p.caption ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (prof?.username ?? "").toLowerCase().includes(q) ||
        (prof?.display_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, posts, profiles]);

  const matchedProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(profiles).filter(
      (p) =>
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q)
    );
  }, [query, profiles]);

  const toggleLike = (id: string) =>
    setLiked((p) => ({ ...p, [id]: !p[id] }));

  return (
    <section className="mt-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search posts, users, hashtags…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
        />
      </div>

      {/* Search profile matches */}
      {query.trim() && matchedProfiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500 px-2 mb-2">People</p>
          <div className="flex gap-3 overflow-x-auto">
            {matchedProfiles.slice(0, 10).map((p) => (
              <div key={p.id} className="shrink-0 flex flex-col items-center w-16">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.display_name ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    (p.display_name ?? p.username ?? "?")[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-[11px] mt-1 truncate w-full text-center">
                  {p.display_name ?? p.username}
                </span>
              </div>
            ))}
          </div>
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
              {file.type.startsWith("video/") ? (
                <video src={preview} controls className="w-full max-h-72 object-contain bg-black" />
              ) : (
                <img src={preview} alt="preview" className="w-full max-h-72 object-contain" />
              )}
              <button
                onClick={() => setFile(null)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (fileRef.current) fileRef.current.accept = "image/*";
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-emerald-700 hover:bg-emerald-50 transition"
              >
                <ImageIcon className="h-4 w-4" /> Photo
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) fileRef.current.accept = "video/*";
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-rose-700 hover:bg-rose-50 transition"
              >
                <VideoIcon className="h-4 w-4" /> Video
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button
              onClick={submit}
              disabled={posting || (!caption.trim() && !file)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </button>
          </div>
        </div>
      )}
      {!user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-600">
          <Link to="/auth" className="text-indigo-600 font-semibold">Sign in</Link> to post and join the feed.
        </div>
      )}

      {/* Feed */}
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
            return (
              <article key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                    {prof?.avatar_url ? (
                      <img src={prof.avatar_url} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {p.caption && (
                  <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{p.caption}</p>
                )}
                {p.media_type === "image" && p.media_url && (
                  <img src={p.media_url} alt={p.caption ?? "Post"} className="w-full max-h-[520px] object-cover bg-slate-100" loading="lazy" />
                )}
                {p.media_type === "video" && p.media_url && (
                  <div className="relative bg-black">
                    <video src={p.media_url} controls playsInline preload="metadata" className="w-full max-h-[520px]" />
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                      <Play className="h-3 w-3 fill-white" /> Video
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-5 px-4 py-3 text-sm text-slate-600">
                  <button
                    onClick={() => toggleLike(p.id)}
                    className={`flex items-center gap-1 transition ${liked[p.id] ? "text-rose-500" : "hover:text-rose-500"}`}
                  >
                    <Heart className={`h-4 w-4 ${liked[p.id] ? "fill-rose-500" : ""}`} /> Like
                  </button>
                  <button className="flex items-center gap-1 hover:text-indigo-600">
                    <MessageCircle className="h-4 w-4" /> Comment
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
