import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Heart, MessageCircle, Share2, CheckCircle2, UploadCloud, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  category: string | null;
  created_at: string;
};

export const Route = createFileRoute("/videos")({ component: Videos });

const TABS = ["For You", "Trending", "Music", "Food", "Travel"];

function Videos() {
  const [tab, setTab] = useState("For You");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [unmuted, setUnmuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPosts((data as Post[]) ?? []);
        setLoadingPosts(false);
      });
  }, []);

  const filteredPosts = tab === "For You" ? posts : posts.filter((p) => p.category === tab);

  const toggleLike = (key: string) => setLiked((p) => ({ ...p, [key]: !p[key] }));

  const share = async (title: string) => {
    const data = { title, text: `Check out ${title}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        alert("Link copied to clipboard");
      }
    } catch {}
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">Video Feed</h1>
          <p className="text-sm text-slate-500 truncate">Trending content from creators around the world</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shrink-0"
        >
          <UploadCloud className="h-4 w-4" /> <span className="hidden sm:inline">Upload</span>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              tab === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loadingPosts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="aspect-[4/5] bg-slate-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center mb-8">
          <p className="text-slate-500 mb-4">No posts yet in this category.</p>
          <Link to="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            <UploadCloud className="h-4 w-4" /> Upload the first one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredPosts.map((p) => {
            const key = `p-${p.id}`;
            const isLiked = liked[key];
            const isUnmuted = unmuted[p.id];

            return (
              <article key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                <div className="relative aspect-[4/5] bg-slate-900">
                  {p.media_type === "video" ? (
                    <>
                      <video
                        src={p.media_url}
                        autoPlay
                        loop
                        muted={!isUnmuted}
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setUnmuted((u) => ({ ...u, [p.id]: !u[p.id] }))}
                        className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                        aria-label={isUnmuted ? "Mute" : "Unmute"}
                      >
                        {isUnmuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </button>
                    </>
                  ) : (
                    <img src={p.media_url} alt={p.caption ?? "Post"} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="p-3">
                  {p.caption && <p className="text-sm line-clamp-2 mb-2">{p.caption}</p>}
                  <div className="flex items-center gap-4 text-slate-500 text-sm">
                    <button
                      onClick={() => toggleLike(key)}
                      className={`flex items-center gap-1 transition ${isLiked ? "text-rose-500" : "hover:text-rose-500"}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} /> Like
                    </button>
                    <button className="flex items-center gap-1 hover:text-indigo-600">
                      <MessageCircle className="h-4 w-4" /> Comment
                    </button>
                    <button
                      onClick={() => share(p.caption ?? "Post")}
                      className="flex items-center gap-1 hover:text-indigo-600 ml-auto"
                      aria-label="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-sky-500" />
                    <span className="truncate">Posted {new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
