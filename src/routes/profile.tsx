import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { MapPin, Link as LinkIcon, Calendar, Settings, CheckCircle2, Play, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

const TABS = ["Posts", "Videos", "Businesses", "About"] as const;
type Tab = (typeof TABS)[number];

function Profile() {
  const [tab, setTab] = useState<Tab>("Posts");
  const [following, setFollowing] = useState(false);

  return (
    <Layout>
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
              <button
                onClick={() => setFollowing((f) => !f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  following
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
              <button
                onClick={() => alert("Settings coming soon")}
                className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                aria-label="Settings"
              >
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
            <a href="https://shapingworld.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600">
              <LinkIcon className="h-4 w-4" /> shapingworld.com
            </a>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined March 2024</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-md">
            <Stat icon={Users} label="Followers" value="12.4K" />
            <Stat icon={Heart} label="Likes" value="48.2K" />
            <Stat icon={Play} label="Videos" value="86" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {(tab === "Posts" || tab === "Videos") && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "from-fuchsia-500 to-purple-700",
              "from-sky-500 to-emerald-500",
              "from-amber-500 to-rose-500",
              "from-orange-500 to-red-500",
              "from-teal-500 to-cyan-500",
              "from-indigo-500 to-pink-500",
            ].map((hue, i) => (
              <button key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${hue} relative overflow-hidden hover:opacity-90 transition`}>
                <div className="absolute bottom-2 left-2 text-white text-xs font-semibold flex items-center gap-1">
                  <Play className="h-3 w-3 fill-white" /> {(i + 1) * 4}.{i}K
                </div>
              </button>
            ))}
          </div>
        )}
        {tab === "Businesses" && (
          <div className="text-center py-12 text-slate-500 text-sm">No businesses listed yet.</div>
        )}
        {tab === "About" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-700 space-y-2">
            <p><strong>Name:</strong> Alex Carter</p>
            <p><strong>Location:</strong> San Francisco, CA</p>
            <p><strong>Joined:</strong> March 2024</p>
            <p><strong>Bio:</strong> Creator & founder building at the intersection of entertainment, business, and relationships.</p>
          </div>
        )}
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
