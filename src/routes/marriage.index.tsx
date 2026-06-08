import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { ArrowLeft, Gem, MapPin, Briefcase, Heart, MessageCircle, Loader2, Pencil, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/marriage/")({
  component: MarriagePage,
  head: () => ({
    meta: [
      { title: "Marriage — VIP Style" },
      { name: "description", content: "Find your perfect life partner with trusted matchmaking." },
    ],
  }),
});

type MarriageRow = {
  user_id: string;
  age: number | null;
  looking_for: string | null;
  country: string | null;
  profession: string | null;
  marital_status: string | null;
  religion: string | null;
  about: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Card = MarriageRow & { profile: Profile | null };

function MarriagePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [hasOwn, setHasOwn] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: mp } = await supabase
        .from("marriage_profiles")
        .select("user_id, age, looking_for, country, profession, marital_status, religion, about")
        .order("updated_at", { ascending: false })
        .limit(100);
      const rows = (mp ?? []) as MarriageRow[];
      const ids = rows.map((r) => r.user_id);
      let profMap: Record<string, Profile> = {};
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", ids);
        (ps ?? []).forEach((p: any) => (profMap[p.id] = p));
      }
      if (!alive) return;
      setCards(rows.map((r) => ({ ...r, profile: profMap[r.user_id] ?? null })));
      if (user) setHasOwn(rows.some((r) => r.user_id === user.id));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const filtered = cards.filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (c.profile?.display_name ?? "").toLowerCase().includes(s) ||
      (c.profile?.username ?? "").toLowerCase().includes(s) ||
      (c.country ?? "").toLowerCase().includes(s) ||
      (c.profession ?? "").toLowerCase().includes(s)
    );
  });

  const openChat = (peerId: string) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/messages", search: { to: peerId } });
  };

  return (
    <Layout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <span className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow">
            <Gem className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold">Marriage</h1>
        </div>
        <Link
          to="/marriage/edit"
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-pink-600 text-white text-sm font-semibold hover:bg-pink-700"
        >
          <Pencil className="h-4 w-4" />
          {hasOwn ? "Edit" : "Create"}
        </Link>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search by name, country, profession…"
          className="w-full h-12 pl-11 pr-4 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="font-semibold">No marriage profiles yet.</p>
          <p className="text-sm mt-1">Be the first — create your profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const name = c.profile?.display_name ?? c.profile?.username ?? "User";
            const isSelf = user?.id === c.user_id;
            return (
              <div
                key={c.user_id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                <div className="p-5 flex items-center gap-4">
                  {c.profile?.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt={name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-pink-100"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xl font-bold">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">
                      {name}
                      {c.age ? `, ${c.age}` : ""}
                    </p>
                    {c.country && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {c.country}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-3 flex flex-wrap gap-1.5 text-[11px]">
                  {c.looking_for && <Tag>Looking for {c.looking_for}</Tag>}
                  {c.marital_status && <Tag>{c.marital_status}</Tag>}
                  {c.religion && <Tag>{c.religion}</Tag>}
                  {c.profession && (
                    <Tag>
                      <Briefcase className="h-3 w-3 inline mr-1" />
                      {c.profession}
                    </Tag>
                  )}
                </div>

                {c.about && (
                  <p className="px-5 pb-4 text-sm text-slate-600 line-clamp-3">{c.about}</p>
                )}

                <div className="mt-auto border-t border-slate-100 p-3 flex gap-2">
                  <Link
                    to="/u/$id"
                    params={{ id: c.user_id }}
                    className="flex-1 h-10 rounded-full border border-slate-200 text-sm font-semibold inline-flex items-center justify-center hover:bg-slate-50"
                  >
                    View Profile
                  </Link>
                  {!isSelf && (
                    <button
                      onClick={() => openChat(c.user_id)}
                      className="flex-1 h-10 rounded-full bg-pink-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-pink-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
      {children}
    </span>
  );
}
