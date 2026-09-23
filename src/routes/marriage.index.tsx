import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { AvatarImg } from "@/components/AvatarImg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/marriage/")({
  component: MarriagePage,
  head: () => ({
    meta: [
      { title: "Marriage — VIP Style" },
      { name: "description", content: "Find your perfect life partner with trusted matchmaking." },
      { property: "og:title", content: "Marriage — VIP Style" },
      { property: "og:description", content: "Find your perfect life partner with trusted matchmaking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const { data: mp } = await supabase
        .from("marriage_profiles")
        .select("user_id, age, looking_for, country, profession, marital_status, religion, about")
        .order("updated_at", { ascending: false })
        .limit(100);
      const rows = (mp ?? []) as MarriageRow[];
      const ids = rows.map((row) => row.user_id);
      const profileMap: Record<string, Profile> = {};

      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", ids);
        for (const profile of profiles ?? []) profileMap[profile.id] = profile;
      }

      if (!alive) return;
      setCards(rows.map((row) => ({ ...row, profile: profileMap[row.user_id] ?? null })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = cards.filter((card) => {
    if (!q.trim()) return true;
    const search = q.toLowerCase();
    return (
      (card.profile?.display_name ?? "").toLowerCase().includes(search) ||
      (card.profile?.username ?? "").toLowerCase().includes(search) ||
      (card.country ?? "").toLowerCase().includes(search) ||
      (card.profession ?? "").toLowerCase().includes(search) ||
      String(card.age ?? "").includes(search)
    );
  });

  const openChat = (peerId: string) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/messages", search: { to: peerId } });
  };

  const selected = selectedId ? cards.find((card) => card.user_id === selectedId) ?? null : null;

  return (
    <Layout>
      <section className="min-h-screen bg-[#003D25] text-white">
        <div className="mx-auto w-full max-w-[390px] px-3 pb-8 pt-3">
          {selected ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Back"
                  onClick={() => setSelectedId(null)}
                  className="h-10 w-10 rounded-full border border-[#19D66B] bg-[#005A35] text-white hover:bg-[#005A35] hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">Marriage Profile</h1>
              </div>
              <DetailCard
                card={selected}
                isSelf={user?.id === selected.user_id}
                onMessage={() => openChat(selected.user_id)}
              />
            </>
          ) : (
            <>
              <div className="relative mb-3 aspect-[3.26/1] w-full overflow-hidden rounded-[16px] border border-[#19D66B]">
                <img src="/kkk23.jpg" alt="Marriage Banner" className="h-full w-full object-cover" />
              </div>

              <div className="relative mb-3 h-[46px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-6 w-6 -translate-y-1/2 text-white" strokeWidth={2} />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  type="search"
                  placeholder="Search by name, country, age..."
                  className="h-full w-full rounded-full border border-[#19D66B] bg-[#005A35] pl-12 pr-14 text-sm text-white outline-none placeholder:text-white/90 focus:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Filter profiles"
                  className="absolute right-0 top-0 h-full w-[50px] rounded-full bg-[#00643C] text-white hover:bg-[#00643C] hover:text-white"
                >
                  <SlidersHorizontal className="h-5 w-5" strokeWidth={2.25} />
                </Button>
              </div>

              <div className="mb-2 flex items-center justify-between px-0.5">
                <h2 className="text-[18px] font-bold leading-none">Featured Profiles</h2>
                <Button type="button" variant="ghost" className="h-7 gap-0.5 px-0 text-sm font-semibold text-[#7CFF3B] hover:bg-transparent hover:text-[#7CFF3B]">
                  View All <ChevronRight className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16 text-[#7CFF3B]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-white/80">
                  <p className="font-semibold">No marriage profiles yet.</p>
                  <p className="mt-1 text-sm text-white/70">Be the first — create your profile.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((card) => (
                    <ProfileCard key={card.user_id} card={card} onOpen={() => setSelectedId(card.user_id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}

function ProfileCard({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const name = card.profile?.display_name ?? card.profile?.username ?? "User";
  return (
    <article className="overflow-hidden rounded-[16px] border border-[#086B43] bg-[#005A35] p-2 shadow-sm">
      <div className="relative aspect-[1.38/1] overflow-hidden rounded-[12px] bg-[#007A49]">
        <AvatarImg src={card.profile?.avatar_url} alt={name} fallback={name} className="h-full w-full object-cover text-2xl" />
      </div>

      <div className="px-0.5 pb-0.5 pt-2">
        <h3 className="truncate text-[15px] font-bold leading-tight text-white">{name}</h3>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[9px] text-white/80">
          <UserRound className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">{card.age ? `${card.age} years` : "—"} &nbsp;•&nbsp; Female</span>
        </p>
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[9px] text-white/80">
          <MapPin className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">{card.country ?? "—"} &nbsp;•&nbsp; {card.profession ?? "—"}</span>
        </p>
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[9px] text-white/80">
          <Heart className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">Looking for {card.looking_for ?? "—"}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onOpen}
          className="mt-2.5 h-8 w-full rounded-full border border-[#7CFF3B] bg-transparent text-xs font-semibold text-white hover:bg-transparent hover:text-white"
        >
          <span className="flex-1 text-center">View Profile</span>
          <ChevronRight className="h-4 w-4 text-[#7CFF3B]" strokeWidth={2.5} />
        </Button>
      </div>
    </article>
  );
}

function DetailCard({ card, isSelf, onMessage }: { card: Card; isSelf: boolean; onMessage: () => void }) {
  const name = card.profile?.display_name ?? card.profile?.username ?? "User";
  return (
    <div className="flex flex-col overflow-hidden rounded-[28px] border border-[#19D66B] bg-[#005A35] shadow-sm">
      <div className="flex items-center gap-4 p-5">
        <AvatarImg src={card.profile?.avatar_url} alt={name} fallback={name} className="h-20 w-20 rounded-full bg-[#00C853] object-cover text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-white">{name}{card.age ? `, ${card.age}` : ""}</p>
          {card.country && <p className="mt-1 flex items-center gap-1 text-xs text-white/80"><MapPin className="h-3 w-3" />{card.country}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-3 text-xs">
        {card.looking_for && <Tag>Looking for {card.looking_for}</Tag>}
        {card.marital_status && <Tag>{card.marital_status}</Tag>}
        {card.religion && <Tag>{card.religion}</Tag>}
        {card.profession && <Tag><Briefcase className="mr-1 inline h-3 w-3" />{card.profession}</Tag>}
      </div>
      {card.about && <p className="whitespace-pre-wrap px-5 pb-4 text-sm text-white/90">{card.about}</p>}
      <div className="mt-auto flex gap-2 border-t border-[#19D66B] p-3">
        <Button asChild variant="outline" className="h-10 flex-1 rounded-full border-[#19D66B] bg-transparent text-white hover:bg-[#00C853] hover:text-white">
          <Link to="/u/$id" params={{ id: card.user_id }}>View Profile</Link>
        </Button>
        {!isSelf && <Button type="button" onClick={onMessage} className="h-10 flex-1 rounded-full bg-[#00C853] text-white hover:bg-[#19D66B]"><MessageCircle className="h-4 w-4" />Message</Button>}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-[#19D66B] bg-[#00C853] px-2.5 py-1 text-white">{children}</span>;
}
