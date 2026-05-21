import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { MapPin, Link as LinkIcon, Calendar, Settings, CheckCircle2, Play, Heart, Users, LogOut, Loader2, UploadCloud } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: Profile });

type Post = {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
};

const TABS = ["Posts", "Videos", "Businesses", "About"] as const;
type Tab = (typeof TABS)[number];

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Posts");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data as ProfileRow | null);
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      </Layout>
    );
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "User";
  const handle = profile?.username ?? user.email?.split("@")[0] ?? "user";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";

  return (
    <Layout>
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
        <div className="h-40 sm:h-56 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="px-5 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white object-cover" />
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 ring-4 ring-white flex items-center justify-center text-white text-3xl font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold">{displayName}</h1>
                <CheckCircle2 className="h-5 w-5 text-sky-500 fill-sky-500" />
              </div>
              <p className="text-sm text-slate-500">@{handle} · {user.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
              <button
                onClick={() => toast.info("Settings coming soon")}
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
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Global</span>
            <Link to="/" className="flex items-center gap-1 hover:text-indigo-600">
              <LinkIcon className="h-4 w-4" /> shapingworld.com
            </Link>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined {joined}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 max-w-md">
            <Stat icon={Users} label="Followers" value="0" />
            <Stat icon={Heart} label="Likes" value="0" />
            <Stat icon={Play} label="Videos" value="0" />
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
          <div className="text-center py-12 text-slate-500 text-sm">
            No {tab.toLowerCase()} yet. Share something to get started!
          </div>
        )}
        {tab === "Businesses" && (
          <div className="text-center py-12 text-slate-500 text-sm">No businesses listed yet.</div>
        )}
        {tab === "About" && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-700 space-y-2">
            <p><strong>Name:</strong> {displayName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Joined:</strong> {joined}</p>
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
