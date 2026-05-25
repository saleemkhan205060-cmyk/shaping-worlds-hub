import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Gem, Heart, Users, ShieldCheck, Search, MapPin, Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/marriage")({
  component: MarriagePage,
  head: () => ({
    meta: [
      { title: "Marriage — VIP Style" },
      { name: "description", content: "Find your perfect life partner with trusted matchmaking." },
    ],
  }),
});

const FEATURES = [
  { icon: Search, label: "Browse Profiles", desc: "Discover verified members", tint: "from-pink-500 to-rose-600" },
  { icon: Sparkles, label: "Smart Matches", desc: "AI-powered suggestions", tint: "from-fuchsia-500 to-pink-500" },
  { icon: ShieldCheck, label: "Verified Profiles", desc: "100% authentic users", tint: "from-emerald-500 to-teal-500" },
  { icon: Heart, label: "Favorites", desc: "Save profiles you like", tint: "from-rose-500 to-red-500" },
  { icon: Users, label: "Community", desc: "Join discussion groups", tint: "from-indigo-500 to-purple-500" },
  { icon: MapPin, label: "Nearby Matches", desc: "Find people near you", tint: "from-amber-500 to-orange-500" },
];

const PROFILES = [
  { name: "Ayesha, 26", city: "Mumbai", c: "from-pink-400 to-rose-500" },
  { name: "Rahul, 29", city: "Delhi", c: "from-sky-400 to-indigo-500" },
  { name: "Sana, 24", city: "Lahore", c: "from-fuchsia-400 to-purple-500" },
  { name: "Imran, 31", city: "Karachi", c: "from-emerald-400 to-teal-500" },
];

function MarriagePage() {
  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow">
            <Gem className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Marriage</h1>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search profiles by name, city, profession…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {FEATURES.map(({ icon: Icon, label, desc, tint }) => (
          <button key={label} className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition">
            <span className={`inline-flex h-10 w-10 rounded-xl bg-gradient-to-br ${tint} text-white items-center justify-center shadow`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-bold text-sm">{label}</p>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </section>

      <h2 className="font-bold mb-3">Featured Profiles</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PROFILES.map((p) => (
          <div key={p.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`aspect-square bg-gradient-to-br ${p.c}`} />
            <div className="p-3">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
