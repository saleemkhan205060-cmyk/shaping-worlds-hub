import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { Play, Heart, MessageCircle, Share2, CheckCircle2, UploadCloud, Volume2, VolumeX } from "lucide-react";
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

type Video = {
  title: string;
  who: string;
  views: string;
  likes: string;
  hue: string;
  category: string;
  videoUrl: string;
};

const VIDEOS: Video[] = [
  { title: "Amazing Dance Performance", who: "John Doe", views: "25.4K", likes: "3.2K", hue: "from-fuchsia-500 to-purple-700", category: "Trending" },
  { title: "Beautiful Nature 4K Video", who: "Sara Khan", views: "18.7K", likes: "2.1K", hue: "from-sky-500 to-emerald-500", category: "Travel" },
  { title: "Cover Song – Perfect", who: "Ali Music", views: "32.1K", likes: "5.4K", hue: "from-amber-500 to-rose-500", category: "Music" },
  { title: "Delicious Food Recipe", who: "Foodie Love", views: "21.6K", likes: "1.8K", hue: "from-orange-500 to-red-500", category: "Food" },
  { title: "Travel Vlog – Bali", who: "Wander Maya", views: "44.2K", likes: "6.1K", hue: "from-teal-500 to-cyan-500", category: "Travel" },
  { title: "Tech Review – New Phone", who: "Gadget Pro", views: "12.3K", likes: "980", hue: "from-slate-700 to-slate-900", category: "Trending" },
];

const TABS = ["For You", "Trending", "Music", "Food", "Travel"];

function Videos() {
  const [tab, setTab] = useState("For You");
  const [playing, setPlaying] = useState<string | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [unmuted, setUnmuted] = useState<Record<string, boolean>>({}); 
const [activeIndex, setActiveIndex] = useState(0);
  
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

  const filtered = tab === "For You" ? VIDEOS : VIDEOS.filter((v) => v.category === tab);
  const filteredPosts = tab === "For You" ? posts : posts.filter((p) => p.category === tab);

  const toggleLike = (key: string) => setLiked((p) => ({ ...p, [key]: !p[key] }));

  const share = async (title: string, by: string) => {
    const data = { title, text: `Check out ${title} by ${by}`, url: window.location.href };
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
          <UploadCloud className="h-4 w-4" /> <span className="hidden xs:inline sm:inline">Upload</span>
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

      {filteredPosts.length > 0 && (
        <>
         
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
                      <button
                        onClick={() => share(p.caption ?? "Post", "a creator")}
                        className="flex items-center gap-1 hover:text-indigo-600 ml-auto"
                        aria-label="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {loadingPosts && filteredPosts.length === 0 && (
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
      )}

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Featured</h2>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">No videos in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => {
        const isPlaying = playing === (v?.id ?? v.title);
           const isPlaying = playing === key;
          
            return (
              <article key={v.title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                <div className="relative aspect-video bg-black">
  <video
    src={v.videoUrl}
    className="w-full h-full object-cover"
    autoPlay
    muted
    loop
    playsInline
  />

                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {v.views} views
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{v.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400" />
                    <span className="text-sm text-slate-700 truncate">{v.who}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 fill-sky-500 shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-slate-500 text-sm">
                    <button
                      onClick={() => toggleLike(v.title)}
                      className={`flex items-center gap-1 transition ${isLiked ? "text-rose-500" : "hover:text-rose-500"}`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} /> {v.likes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-indigo-600">
                      <MessageCircle className="h-4 w-4" /> 124
                    </button>
                    <button onClick={() => share(v.title, v.who)} className="flex items-center gap-1 hover:text-indigo-600 ml-auto" aria-label="Share">
                      <Share2 className="h-4 w-4" />
                    </button>
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
