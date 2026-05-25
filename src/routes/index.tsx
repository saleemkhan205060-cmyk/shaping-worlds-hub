import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Layout } from "../components/Layout";
import {
  Play,
  TrendingUp,
  Heart,
  Users,
  Briefcase,
  Megaphone,
  Handshake,
  BarChart3,
  ShieldCheck,
  Globe,
  Lock,
  Rocket,
  ArrowRight,
  Star,
  CheckCircle2,
  Play as PlayIcon,
  Gem,
  Store,
  Bell,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const QUICK_NAV = [
  {
    label: "Entertainment",
    icon: PlayIcon,
    to: "/videos" as const,
    tint: "from-fuchsia-500 via-pink-500 to-rose-500",
    iconFill: true,
  },
  {
    label: "Marriage",
    icon: Gem,
    to: "/" as const,
    tint: "from-pink-500 to-rose-600",
  },
  {
    label: "Market",
    icon: Store,
    to: "/" as const,
    tint: "from-amber-400 to-orange-500",
  },
  {
    label: "Notification",
    icon: Bell,
    to: "/" as const,
    tint: "from-emerald-400 to-green-500",
  },
];

function Index() {
  return (
    <Layout>
      {/* Quick nav icons */}
      <section className="mb-6 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {QUICK_NAV.map(({ label, icon: Icon, to, tint, iconFill }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-2 group"
            >
              <span
                className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br ${tint} text-white flex items-center justify-center shadow-lg group-active:scale-95 transition`}
              >
                <Icon
                  className={`h-7 w-7 sm:h-9 sm:w-9 ${iconFill ? "fill-white" : ""}`}
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-[11px] sm:text-sm font-semibold text-slate-700 text-center">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 md:p-14">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-purple-500 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
        </div>
        <div className="relative grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              SHAPING
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">
                WORLD
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base font-semibold tracking-wide uppercase text-white/80">
              Shape your life, shape the world
            </p>
            <p className="mt-3 text-sm sm:text-base text-white/70 max-w-md">
              One platform for Entertainment, Business and Relationships.
              Explore endless possibilities and connect with the world.
            </p>
            <Link to="/auth" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition font-semibold shadow-lg shadow-indigo-500/30">
              Join Now
              <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
          <div className="relative flex justify-center">
            <div className="relative h-56 w-56 sm:h-72 sm:w-72">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 blur-2xl opacity-60" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-700 to-purple-900 border-4 border-white/10 flex items-center justify-center">
                <Globe className="h-28 w-28 text-sky-300/90" strokeWidth={1.2} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative -mt-5 flex justify-center px-2">
        <div className="rounded-full bg-white shadow-md border border-slate-200 px-4 py-2 text-[11px] sm:text-sm font-bold text-center max-w-full">
          ONE <span className="text-indigo-600">WORLD</span>, MANY <span className="text-pink-600">POSSIBILITIES</span>
        </div>
      </div>

      {/* Feature cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <FeatureCard
          tone="pink"
          icon={<Play className="h-8 w-8 text-white fill-white" />}
          iconBg="from-pink-500 to-orange-500"
          title="SHAPE"
          accent="VIDEOS"
          accentClass="text-pink-500"
          tag="ENTERTAINMENT"
          tagClass="bg-gradient-to-r from-pink-500 to-purple-500"
          items={[
            { icon: Play, text: "Short Videos" },
            { icon: TrendingUp, text: "Trending Content" },
            { icon: Users, text: "Creators Community" },
            { icon: Heart, text: "Fun, Learn & Inspire" },
          ]}
          footer="WATCH. ENJOY. INSPIRE."
          footerClass="text-pink-600"
        />
        <FeatureCard
          tone="blue"
          icon={<BarChart3 className="h-8 w-8 text-white" />}
          iconBg="from-sky-500 to-indigo-600"
          title="SHAPE"
          accent="BUSINESS"
          accentClass="text-sky-600"
          tag="MARKETING / BUSINESS"
          tagClass="bg-gradient-to-r from-sky-500 to-indigo-600"
          items={[
            { icon: Briefcase, text: "Business Growth" },
            { icon: Megaphone, text: "Promote & Advertise" },
            { icon: Handshake, text: "Connect & Collaborate" },
            { icon: BarChart3, text: "Grow Your Brand" },
          ]}
          footer="CONNECT. PROMOTE. GROW."
          footerClass="text-sky-600"
        />
        <FeatureCard
          tone="rose"
          icon={<Heart className="h-8 w-8 text-white fill-white" />}
          iconBg="from-rose-500 to-pink-600"
          title="WED"
          accent="MATCH"
          accentClass="text-rose-500"
          tag="MATCHMAKING / RELATIONSHIPS"
          tagClass="bg-gradient-to-r from-rose-500 to-pink-600"
          items={[
            { icon: Users, text: "Smart Matches" },
            { icon: Heart, text: "Trusted Profiles" },
            { icon: ShieldCheck, text: "Privacy & Safety" },
            { icon: CheckCircle2, text: "Find Your Life Partner" },
          ]}
          footer="FIND LOVE. BUILD FOREVER."
          footerClass="text-rose-600"
        />
      </section>

      {/* Our Apps */}
      <section className="mt-10">
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px flex-1 bg-slate-200 max-w-[120px]" />
          <h2 className="font-extrabold tracking-wide">OUR APPS</h2>
          <div className="h-px flex-1 bg-slate-200 max-w-[120px]" />
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-6 items-center">
          <div className="grid grid-cols-4 gap-3">
            <AppTile gradient="from-slate-900 to-indigo-900" label="SHAPING" sub="WORLD">
              <Globe className="h-8 w-8 text-sky-400" />
            </AppTile>
            <AppTile gradient="from-pink-500 to-orange-500" label="SHAPEVIDEOS">
              <Play className="h-8 w-8 text-white fill-white" />
            </AppTile>
            <AppTile gradient="from-sky-500 to-indigo-600" label="SHAPEBUSINESS">
              <BarChart3 className="h-8 w-8 text-white" />
            </AppTile>
            <AppTile gradient="from-rose-500 to-pink-600" label="WEDMATCH">
              <Heart className="h-8 w-8 text-white fill-white" />
            </AppTile>
          </div>
          <ul className="space-y-3 md:pl-6 md:border-l border-slate-200">
            <Pill icon={ShieldCheck} text="ONE PLATFORM" />
            <Pill icon={Globe} text="GLOBAL COMMUNITY" />
            <Pill icon={Lock} text="SAFE & SECURE" />
            <Pill icon={Rocket} text="ENDLESS POSSIBILITIES" />
          </ul>
        </div>
      </section>

      {/* Popular videos + top businesses */}
      <section className="mt-10 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Popular Videos</h3>
            <Link to="/videos" className="text-sm text-indigo-600 font-medium">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { title: "Amazing Dance Performance", views: "25.4K", who: "John Doe", hue: "from-fuchsia-500 to-purple-700" },
              { title: "Beautiful Nature 4K", views: "18.7K", who: "Sara Khan", hue: "from-sky-500 to-emerald-500" },
              { title: "Cover Song – Perfect", views: "32.1K", who: "Ali Music", hue: "from-amber-500 to-rose-500" },
              { title: "Delicious Food Recipe", views: "21.6K", who: "Foodie Love", hue: "from-orange-500 to-red-500" },
            ].map((v) => (
              <Link key={v.title} to="/videos" className="group block text-left">
                <div className={`aspect-[4/5] rounded-xl bg-gradient-to-br ${v.hue} relative overflow-hidden group-hover:opacity-90 transition`}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow">
                      <Play className="h-5 w-5 text-slate-900 fill-slate-900 ml-0.5" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Play className="h-3 w-3 fill-white" />
                    {v.views}
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold line-clamp-2">{v.title}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-slate-200" />
                  <span className="text-xs text-slate-600">{v.who}</span>
                  <CheckCircle2 className="h-3 w-3 text-sky-500 fill-sky-500" />
                </div>
              </Link>
            ))}

          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Top Businesses</h3>
          </div>
          <ul className="space-y-3">
            {[
              { name: "Smart Digital Agency", rating: "4.8", n: "256", c: "from-indigo-500 to-purple-600" },
              { name: "Creative Designers", rating: "4.7", n: "198", c: "from-pink-500 to-rose-600" },
              { name: "BuildTech Solutions", rating: "4.9", n: "312", c: "from-sky-500 to-cyan-600" },
              { name: "Growth Marketing", rating: "4.6", n: "178", c: "from-emerald-500 to-teal-600" },
            ].map((b) => (
              <li key={b.name} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${b.c} flex items-center justify-center text-white font-bold`}>
                  {b.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {b.rating} ({b.n})
                  </p>
                </div>
                <FollowButton name={b.name} />

              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Match CTA */}
      <section className="mt-6 rounded-2xl bg-gradient-to-r from-rose-100 to-pink-100 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shrink-0">
          <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold text-rose-600">Find Your Perfect Match</p>
          <p className="text-sm text-slate-600">
            Join thousands of people who found their special someone.
          </p>
        </div>
        <div className="flex -space-x-2">
          {["from-amber-400 to-rose-400","from-pink-400 to-purple-400","from-sky-400 to-indigo-400","from-emerald-400 to-teal-400"].map((g, i) => (
            <div key={i} className={`h-9 w-9 rounded-full bg-gradient-to-br ${g} border-2 border-white`} />
          ))}
        </div>
        <Link to="/auth" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white font-semibold text-sm shadow hover:shadow-md">
          Get Started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-8 rounded-2xl bg-slate-950 text-white p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <p className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-sky-400" />
          Entertainment, Business & Relationships –{" "}
          <span className="bg-gradient-to-r from-sky-400 to-pink-400 bg-clip-text text-transparent font-semibold">
            All in One Place.
          </span>
        </p>
        <div className="flex gap-3 text-white/70">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">f</a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">ig</a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">x</a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">yt</a>
        </div>

      </footer>
    </Layout>
  );
}

function FeatureCard({
  icon, iconBg, title, accent, accentClass, tag, tagClass, items, footer, footerClass,
}: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
      <div className={`mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-extrabold tracking-tight">
        {title}<span className={accentClass}>{accent}</span>
      </h3>
      <div className={`inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-bold text-white ${tagClass}`}>
        {tag}
      </div>
      <ul className="mt-4 space-y-2 text-left">
        {items.map(({ icon: Icon, text }: any) => (
          <li key={text} className="flex items-center gap-2 text-sm">
            <Icon className={`h-4 w-4 ${accentClass}`} />
            <span className="text-slate-700">{text}</span>
          </li>
        ))}
      </ul>
      <p className={`mt-4 text-xs font-bold tracking-wide ${footerClass}`}>{footer}</p>
    </div>
  );
}

function AppTile({ gradient, label, sub, children }: any) {
  return (
    <div className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white shadow-md`}>
      {children}
      <div className="mt-1 text-[9px] font-bold tracking-wide">{label}</div>
      {sub && <div className="text-[8px] opacity-80">{sub}</div>}
    </div>
  );
}

function Pill({ icon: Icon, text }: any) {
  return (
    <li className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center">
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <span className="font-semibold text-sm">{text}</span>
    </li>
  );
}

function FollowButton({ name }: { name: string }) {
  const [following, setFollowing] = useState(false);
  return (
    <button
      onClick={() => setFollowing((f) => !f)}
      aria-label={`${following ? "Unfollow" : "Follow"} ${name}`}
      className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
        following
          ? "bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700"
          : "border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

