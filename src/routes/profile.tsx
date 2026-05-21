import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { MapPin, Link as LinkIcon, Calendar, Settings, CheckCircle2, Play, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  return (
    <Layout>
      {/* Cover */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
        <div className="h-40 sm:h-56 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="px-5 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 ring-4 ring-white" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold">Alex Carter</h1>
                <CheckCircle2 className="h-5 w-5 text-sky-500 fill-sky-500" />
              </div>
              <p className="text-sm text-slate-500">@alexcarter · Creator & Founder</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Follow
              </button>
              <button className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-700 max-w-2xl">
            Building communities at the intersection of entertainment, business and meaningful
            relationships. Shaping the world one connection at a time.
          </p>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> San Francisco, CA</span>
            <span className="flex items-center gap-1"><LinkIcon className="h-4 w-4" /> shapingworld.com</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined March 2024</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-md">
            <Stat icon={Users} label="Followers" value="12.4K" />
            <Stat icon={Heart} label="Likes" value="48.2K" />
            <Stat icon={Play} label="Videos" value="86" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {["Posts", "Videos", "Businesses", "About"].map((t, i) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              i === 0 ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          "from-fuchsia-500 to-purple-700",
          "from-sky-500 to-emerald-500",
          "from-amber-500 to-rose-500",
          "from-orange-500 to-red-500",
          "from-teal-500 to-cyan-500",
          "from-indigo-500 to-pink-500",
        ].map((hue, i) => (
          <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${hue} relative overflow-hidden`}>
            <div className="absolute bottom-2 left-2 text-white text-xs font-semibold flex items-center gap-1">
              <Play className="h-3 w-3 fill-white" /> {(Math.random() * 30 + 5).toFixed(1)}K
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
      <Icon className="h-4 w-4 text-indigo-600 mx-auto" />
      <div className="mt-1 font-bold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
