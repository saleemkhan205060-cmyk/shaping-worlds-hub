import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { ArrowLeft, Gem, MapPin, Briefcase, Heart, MessageCircle, Loader2, Pencil, Search, SlidersHorizontal } from "lucide-react";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selected = selectedId ? cards.find((c) => c.user_id === selectedId) ?? null : null;

  return (
  <Layout>
    <div className="min-h-screen bg-[#003D25]">

      {/* Back button when viewing a profile */}
      {selected && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setSelectedId(null)}
            className="h-10 w-10 rounded-full bg-[#005A35] border border-[#19D66B] text-white flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="text-xl font-bold text-white">
            Marriage Profile
          </h1>
        </div>
      )}

      {!selected && (
        <>
          {/* Marriage Hero Banner */}
          <div className="mb-5 overflow-hidden rounded-3xl border border-[#19D66B] bg-[#005A35] relative min-h-[190px]">
            <div className="absolute inset-0 bg-gradient-to-r from-[#003D25] via-[#005A35] to-[#00C853]/40" />

            <div className="relative z-10 p-6 flex items-center min-h-[190px]">
              <div className="max-w-[65%]">
                <p className="text-white text-2xl font-extrabold leading-tight">
                  Find Your
                </p>

                <p className="text-[#7CFF3B] text-3xl font-extrabold leading-tight whitespace-nowrap">
                  Life Partner
                </p>

                <p className="mt-3 text-white/90 text-sm whitespace-nowrap">
                  Real People • Genuine Profiles
                </p>

                <p className="text-white/90 text-sm">
                  Worldwide
                </p>
              </div>

              <div className="absolute right-0 bottom-0 w-[42%] h-full">
                <div className="absolute inset-0 bg-gradient-to-l from-[#00C853]/50 to-transparent" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/80" />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Search by name, country, age..."
              className="w-full h-14 pl-14 pr-16 rounded-full bg-[#005A35] border border-[#19D66B] text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[#7CFF3B]"
            />

            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-[#00C853] text-white flex items-center justify-center"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </div>

          {/* Featured Profiles heading */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Featured Profiles
            </h2>

            <button
              type="button"
              className="text-[#7CFF3B] text-sm font-semibold"
            >
              View All <span className="ml-1">›</span>
            </button>
          </div>
        </>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-[#7CFF3B]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : selected ? (
        <DetailCard card={selected} isSelf={user?.id === selected.user_id} onMessage={() => openChat(selected.user_id)} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/80">
          <p className="font-semibold">No marriage profiles yet.</p>
          <p className="text-sm mt-1 text-white/70">Be the first — create your profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((c) => {
            const name = c.profile?.display_name ?? c.profile?.username ?? "User";
            return (
              <button
                key={c.user_id}
                onClick={() => setSelectedId(c.user_id)}
                className="bg-[#005A35] rounded-2xl border border-[#19D66B] overflow-hidden shadow-sm hover:shadow-md transition text-left"
              >
                <div className="aspect-square w-full bg-[#005A35]">
                  {c.profile?.avatar_url ? (
                    <img
                      src={c.profile.avatar_url}
                      alt={name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#00C853] flex items-center justify-center text-white text-4xl font-bold">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm truncate text-white">
                    {name}
                    {c.age ? ` • ${c.age}` : ""}
                  </p>
                  {c.country && (
                    <p className="text-xs text-[#7CFF3B] truncate mt-0.5">{c.country}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
     )}
     </div>
    </Layout>
  );
}

function DetailCard({ card: c, isSelf, onMessage }: { card: Card; isSelf: boolean; onMessage: () => void }) {
  const name = c.profile?.display_name ?? c.profile?.username ?? "User";
  return (
    <div className="bg-[#005A35] rounded-2xl border border-[#19D66B] overflow-hidden shadow-sm flex flex-col">
      <div className="p-5 flex items-center gap-4">
        {c.profile?.avatar_url ? (
          <img
            src={c.profile.avatar_url}
            alt={name}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-pink-100"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-lg truncate text-white">
            {name}
            {c.age ? `, ${c.age}` : ""}
          </p>
          {c.country && (
            <p className="text-xs text-white/80 flex items-center gap-1 mt-0.5">
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

      {c.about && <p className="px-5 pb-4 text-sm text-white/90 whitespace-pre-wrap">{c.about}</p>}

      <div className="mt-auto border-t border-slate-100 p-3 flex gap-2">
        <Link
          to="/u/$id"
          params={{ id: c.user_id }}
          className="flex-1 h-10 rounded-full border border-[#19D66B] text-white text-sm font-semibold inline-flex items-center justify-center hover:bg-[#00C853]"
        >
          View Profile
        </Link>
        {!isSelf && (
          <button
            onClick={onMessage}
            className="flex-1 h-10 rounded-full bg-[#00C853] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#19D66B]"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
        )}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-[#00C853] text-white border border-[#19D66B]">
      {children}
    </span>
  );
}
