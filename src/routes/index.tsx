import { createFileRoute, Link } from "@tanstack/react-router";

import { Layout } from "../components/Layout";
import { HomeFeed } from "../components/HomeFeed";
import { OnlineUsers } from "../components/OnlineUsers";
import { useAuth } from "@/hooks/use-auth";

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
  CheckCircle2,
} from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VIP Life — Community Feed" },
      { name: "description", content: "Connect, share, and explore the VIP Life community feed." },
      { property: "og:title", content: "VIP Life — Community Feed" },
      { property: "og:description", content: "Connect, share, and explore the VIP Life community feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (user) {
    return (
      <Layout>
        <OnlineUsers />
        <HomeFeed />
      </Layout>
    );
  }


  

  return (
    <Layout>
      {/* Online users */}
      <OnlineUsers />


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
              One platform for feed, Business and Relationships.
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
          tag="FEED"
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

      {/* Explore CTA */}
      <section className="mt-10 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Videos</h3>
            <Link to="/videos" className="text-sm text-indigo-600 font-medium">
              Browse
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            Watch short videos shared by the community. Sign in to upload your own.
          </p>
          <Link
            to="/videos"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
          >
            Open Videos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-bold mb-2">Marriage</h3>
          <p className="text-sm text-slate-600">
            Create a profile and connect with verified members looking for a life partner.
          </p>
          <Link
            to="/marriage"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold"
          >
            Open Marriage <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>


      {/* Footer */}
      <footer className="mt-8 rounded-2xl bg-slate-950 text-white p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <p className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4 text-sky-400" />
          Feed, Business & Relationships –{" "}
          <span className="bg-gradient-to-r from-sky-400 to-pink-400 bg-clip-text text-transparent font-semibold">
            All in One Place.
          </span>
        </p>
        <div className="flex gap-3 text-white/70" aria-label="VIP Life social channels">
          <span aria-label="Facebook" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">f</span>
          <span aria-label="Instagram" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">ig</span>
          <span aria-label="X" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">x</span>
          <span aria-label="YouTube" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">yt</span>
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



