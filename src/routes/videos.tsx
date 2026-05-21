import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Play, Heart, MessageCircle, Share2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/videos")({ component: Videos });

const VIDEOS = [
  { title: "Amazing Dance Performance", who: "John Doe", views: "25.4K", likes: "3.2K", hue: "from-fuchsia-500 to-purple-700" },
  { title: "Beautiful Nature 4K Video", who: "Sara Khan", views: "18.7K", likes: "2.1K", hue: "from-sky-500 to-emerald-500" },
  { title: "Cover Song – Perfect", who: "Ali Music", views: "32.1K", likes: "5.4K", hue: "from-amber-500 to-rose-500" },
  { title: "Delicious Food Recipe", who: "Foodie Love", views: "21.6K", likes: "1.8K", hue: "from-orange-500 to-red-500" },
  { title: "Travel Vlog – Bali", who: "Wander Maya", views: "44.2K", likes: "6.1K", hue: "from-teal-500 to-cyan-500" },
  { title: "Tech Review – New Phone", who: "Gadget Pro", views: "12.3K", likes: "980", hue: "from-slate-700 to-slate-900" },
];

function Videos() {
  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold">Video Feed</h1>
          <p className="text-sm text-slate-500">Trending content from creators around the world</p>
        </div>
        <div className="hidden sm:flex gap-2">
          {["For You", "Trending", "Music", "Food", "Travel"].map((t, i) => (
            <button
              key={t}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                i === 0 ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VIDEOS.map((v) => (
          <article key={v.title} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
            <div className={`relative aspect-video bg-gradient-to-br ${v.hue}`}>
              <button className="absolute inset-0 flex items-center justify-center">
                <span className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="h-6 w-6 fill-slate-900 text-slate-900 ml-0.5" />
                </span>
              </button>
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {v.views} views
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold line-clamp-2">{v.title}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400" />
                <span className="text-sm text-slate-700">{v.who}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 fill-sky-500" />
              </div>
              <div className="mt-3 flex items-center gap-4 text-slate-500 text-sm">
                <button className="flex items-center gap-1 hover:text-rose-500">
                  <Heart className="h-4 w-4" /> {v.likes}
                </button>
                <button className="flex items-center gap-1 hover:text-indigo-600">
                  <MessageCircle className="h-4 w-4" /> 124
                </button>
                <button className="flex items-center gap-1 hover:text-indigo-600 ml-auto">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}
