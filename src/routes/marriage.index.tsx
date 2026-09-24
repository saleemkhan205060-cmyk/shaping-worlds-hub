import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  Heart,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { AvatarImg } from "@/components/AvatarImg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadToStorage } from "@/lib/resumable-upload";
import { MarriageAlbum } from "@/components/MarriageAlbum";
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
  marriage_avatar_url: string | null;
  age: number | null;
  gender: string | null;
  looking_for: string | null;
  country: string | null;
  profession: string | null;
  marital_status: string | null;
  religion: string | null;
    about: string | null;
  date_of_birth: string | null;
  height: string | null;
  mother_tongue: string | null;
  city: string | null;
  living_in: string | null;
  nationality: string | null;
  education: string | null;
  company: string | null;
  income: string | null;
  family_type: string | null;
  family_values: string | null;
  siblings: string | null;
  family_location: string | null;
  smoking: string | null;
  drinking: string | null;
  diet: string | null;
  hobbies: string | null;
  pref_age: string | null;
  pref_location: string | null;
  pref_education: string | null;
  pref_profession: string | null;
  other_expectations: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Card = MarriageRow & { profile: Profile | null };

function MarriagePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [bioError, setBioError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState<Profile[]>([]);
  useEffect(() => {
  if (!user) {
    setInterestCount(0);
    return;
  }

  const loadInterestCount = async () => {
  const table = supabase.from("marriage_interests" as never) as any;

  const { count, error } = await table
    .select("id", { count: "exact", head: true })
    .eq("target_user_id", user.id);

  if (!error) {
    setInterestCount(count ?? 0);
  }

  const { data: interests, error: interestsError } = await table
    .select("user_id")
    .eq("target_user_id", user.id)
    .order("created_at", { ascending: false });

  if (interestsError) {
    console.error("Failed to load interested users:", interestsError);
    return;
  }

  const userIds: string[] = (interests ?? []).map((item: { user_id: string }) => item.user_id);

  if (userIds.length === 0) {
    setInterestedUsers([]);
    return;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Failed to load interested profiles:", profilesError);
    return;
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  setInterestedUsers(
    userIds
      .map((id: string) => profileMap.get(id))
      .filter((profile: Profile | undefined): profile is Profile => !!profile)
  );
};

  void loadInterestCount();
}, [user]);

useEffect(() => {
  if (authLoading) return;

  let alive = true;
  void (async () => {
      setLoading(true);
      const { data: mp } = await supabase
        .from("marriage_profiles")
        .select("user_id, marriage_avatar_url, age, gender, looking_for, country, profession, marital_status, religion, about")
        .order("updated_at", { ascending: false })
        .limit(100);
      const rows = (mp ?? []) as MarriageRow[];
     const sortedRows = user
  ? [
      ...rows.filter((row) => row.user_id === user.id),
      ...rows.filter((row) => row.user_id !== user.id),
    ]
  : rows;
      const ids = sortedRows.map((row) => row.user_id);
      const profileMap: Record<string, Profile> = {};

      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", ids);
        for (const profile of profiles ?? []) profileMap[profile.id] = profile;
      }

      if (!alive) return;
      setCards(
     sortedRows.map((row) => ({
    ...row,
    profile: profileMap[row.user_id] ?? null,
     }))
   );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, user?.id]);

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
        <div className="mx-auto w-full max-w-[410px] px-3 pb-8 pt-3">
          {interestOpen ? (
  <div className="mb-4 rounded-3xl border border-[#19D66B] bg-[#005A35] p-4">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold">Interested</h2>
      <button
        type="button"
        onClick={() => setInterestOpen(false)}
        className="rounded-full bg-white/10 px-3 py-1 text-sm"
      >
        Close
      </button>
    </div>

    <div className="space-y-3">
  {interestedUsers.length > 0 ? (
    interestedUsers.map((person) => (
      <button
        key={person.id}
        type="button"
        onClick={() => {
          setInterestOpen(false);
          setSelectedId(person.id);
        }}
        className="flex w-full items-center gap-3 rounded-2xl bg-[#00643C] p-3 text-left hover:bg-[#007A49]"
      >
        <AvatarImg
          src={person.avatar_url}
          alt={person.display_name ?? person.username ?? "User"}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {person.display_name ?? person.username ?? "User"}
          </p>
          {person.username && (
            <p className="truncate text-xs text-white/60">
              @{person.username}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-white/60" />
      </button>
    ))
  ) : (
    <p className="text-sm text-white/70">
      No one has shown interest yet.
    </p>
  )}
</div>
  </div>
) : null}

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
              <MarriageAlbum
             ownerId={selected.user_id}
          isSelf={user?.id === selected.user_id}
         />

      <div className="-mx-2 mt-0 rounded-[20px] border border-[#19D66B] bg-[#005A35] px-4 py-3 text-white">
         <h3 className="mb-1 text-sm font-bold">About</h3>
        <textarea
         value={bio}
         onChange={(e) => {
       const value = e.target.value;
      const words = value.trim() ? value.trim().split(/\s+/) : [];

    if (words.length > 100) {
    setBioError("Maximum 100 words allowed.");
    return;
  }

  setBioError("");
  e.target.style.height = "auto";
  e.target.style.height = `${e.target.scrollHeight}px`;
  setBio(value);
}}
    className="w-full min-h-[40px] bg-transparent text-sm text-white outline-none resize-none overflow-hidden"
     placeholder="Write about yourself..."
      />
        {bioError && (
    <p className="mt-1 text-xs font-medium text-red-400">
    {bioError}
  </p>
     )}
       <p className="mt-1 text-xs text-white/70">
       {bio.length}/100 characters
     </p>
      </div>
              
     <div className="-mx-2 rounded-[20px] border border-[#19D66B] bg-[#005A35] px-4 py-4 text-white">
  <h3 className="mb-4 text-base font-bold">Personal Information</h3>

  <div className="flex flex-col gap-3">
    <div>
      <p className="text-xs text-white/60">Age</p>
      <p className="text-sm font-medium">{selected.age ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Gender</p>
      <p className="text-sm font-medium">{selected.gender ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Country</p>
      <p className="text-sm font-medium">{selected.country ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Profession</p>
      <p className="text-sm font-medium">{selected.profession ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Marital Status</p>
      <p className="text-sm font-medium">{selected.marital_status ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Religion</p>
      <p className="text-sm font-medium">{selected.religion ?? "Not added"}</p>
    </div>

    <div>
      <p className="text-xs text-white/60">Looking For</p>
      <p className="text-sm font-medium">{selected.looking_for ?? "Not added"}</p>
    </div>
     </div>
       </div>
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
                <div className="absolute right-0 top-0">
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label="Marriage menu"
    onClick={() => setMenuOpen((open) => !open)}
    className="h-[46px] w-[50px] rounded-full bg-[#00643C] text-white hover:bg-[#00643C] hover:text-white"
  >
    <SlidersHorizontal className="h-5 w-5" strokeWidth={2.25} />
  </Button>

  {menuOpen && (
    <div className="absolute right-0 top-[50px] z-50 w-[170px] overflow-hidden rounded-2xl border border-[#19D66B] bg-[#005A35] shadow-xl">
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          navigate({ to: "/marriage/edit" });
        }}
        className="w-full px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#00643C]"
      >
        Create Profile
      </button>
      <button
  type="button"
  onClick={() => {
    setMenuOpen(false);
    setInterestOpen(true);
    setInterestCount(0);
  }}
  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white hover:bg-[#00643C]"
>
  <span>Interested</span>
  {interestCount > 0 && (
    <span className="rounded-full bg-[#00C853] px-2 py-0.5 text-xs">
      {interestCount}
    </span>
  )}
</button>
    </div>
        )}
        </div>
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
                  <ProfileCard
                   key={card.user_id}
                    card={card}
                    onOpen={() => {
                    setSelectedId(card.user_id);
                     setBio(card.about ?? "");
                    }}
                    interestCount={interestCount}
                    onInterestClick={() => setInterestOpen(true)}
                   />
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

function ProfileCard({
   card,
     onOpen,
     interestCount,
   onInterestClick,
}: {
  card: Card;
    onOpen: () => void;
    interestCount: number;
  onInterestClick: () => void;
}) {
  const { user } = useAuth();
   const name = card.profile?.display_name ?? card.profile?.username ?? "User";
    return (
    <article className="relative z-10 rounded-[16px] border border-[#086B43] bg-[#005A35] p-2 shadow-sm">
      <div className="relative aspect-[1.38/1] overflow-hidden rounded-[12px] bg-[#007A49]">
        <AvatarImg
          src={card.marriage_avatar_url || card.profile?.avatar_url}
          alt={name}
          fallback={name}
          className="h-full w-full object-cover text-2xl"
        />
      </div>

      {user?.id === card.user_id && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInterestClick();
          }}
          className="absolute top-[46%] -right-2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-white"
          aria-label="View interested users"
        >
          <Heart className="h-5 w-5 fill-[#FF2D55] text-[#FF2D55]" />
          {interestCount > 0 && (
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
              {interestCount}
            </span>
          )}
        </button>
      )}

      <div className="px-0.5 pb-0.5 pt-2">
        <h3 className="truncate text-[15px] font-bold leading-tight text-white">
          {name}
        </h3>

        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-white/80">
          <UserRound className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">
          {card.age ? `${card.age} years` : "—"} &nbsp;•&nbsp; {card.gender ?? "—"}
          </span>
        </p>

        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-white/80">
          <MapPin className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">
            {card.country ?? "—"} &nbsp;•&nbsp; {card.profession ?? "—"}
          </span>
        </p>

        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-white/80">
          <Heart className="h-3 w-3 shrink-0 fill-white text-white" />
          <span className="truncate">
            Looking for {card.looking_for ?? "—"}
          </span>
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
  const [marriagePhoto, setMarriagePhoto] = useState(card.marriage_avatar_url);
  const handleMarriagePhotoChange = async (
  event: React.ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0];
  if (!file || !isSelf) return;

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${card.user_id}/marriage/marriage-${Date.now()}.${ext}`;

  try {
    await uploadToStorage({
      bucket: "media",
      path,
      file,
    });

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    const marriageAvatarUrl = data.publicUrl;

    const { error } = await supabase
      .from("marriage_profiles")
      .update({ marriage_avatar_url: marriageAvatarUrl })
      .eq("user_id", card.user_id);

    if (error) throw error;

    setMarriagePhoto(marriageAvatarUrl);
  } catch (error) {
    console.error("Marriage photo upload failed:", error);
  }

  event.target.value = "";
};
  return (
    <div className="relative -mx-2 flex flex-col overflow-hidden rounded-[28px] border border-[#19D66B] bg-[#005A35] shadow-sm">
      {isSelf && (
      <Link
      to="/marriage/edit"
     className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
    aria-label="Edit marriage profile"
  >
    <Pencil className="h-4 w-4" />
    </Link>
   )}
      <div className="flex gap-4 p-5">
        <div className="relative h-32 w-28 shrink-0">
         <AvatarImg
         src={marriagePhoto || card.profile?.avatar_url}
         alt={name}
         fallback={name}
       className="h-32 w-28 rounded-2xl bg-[#00C853] object-cover text-2xl"
    />
    {isSelf && (
      <label className="absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-md backdrop-blur-xl">
        <Pencil className="h-3.5 w-3.5" />
        <input
          type="file"
          accept="image/*"
          onChange={handleMarriagePhotoChange}
          className="hidden"
        />
      </label>
    )}
  </div>

  <div className="min-w-0 flex-1">
    <p className="truncate text-lg font-bold text-white">
      {name}
    </p>

    {card.age && (
  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/80">
    <UserRound className="h-3.5 w-3.5 shrink-0" />
    <span>{card.age} years • {card.gender ?? "—"}</span>
  </p>
)}

{card.country && (
  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/80">
    <MapPin className="h-3.5 w-3.5 shrink-0" />
    <span>{card.country}</span>
  </p>
)}

{card.profession && (
  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/80">
    <Briefcase className="h-3.5 w-3.5 shrink-0" />
    <span>{card.profession}</span>
  </p>
)}

{card.marital_status && (
  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/80">
    <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
    <span>{card.marital_status}</span>
  </p>
)}

{card.religion && (
  <p className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-white/80">
    <Heart className="h-3.5 w-3.5 shrink-0" />
    <span>{card.religion}</span>
  </p>
)}
  </div>
</div>
      <div className="flex items-center gap-2 px-5 pb-3 text-xs">
  {card.looking_for && (
    <Tag>Looking for {card.looking_for}</Tag>
  )}

  {!isSelf && <InterestedButton targetId={card.user_id} />}
</div>
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

function InterestedButton({ targetId }: { targetId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interested, setInterested] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const table = supabase.from("marriage_interests" as never) as any;
    void table
      .select("id")
      .eq("user_id", user.id)
      .eq("target_user_id", targetId)
      .maybeSingle()
      .then(({ data }: { data: unknown }) => {
        if (alive) setInterested(!!data);
      });
    return () => {
      alive = false;
    };
  }, [user, targetId]);

  const toggle = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (busy) return;
    setBusy(true);
    const table = supabase.from("marriage_interests" as never) as any;
    const { error } = interested
      ? await table.delete().eq("user_id", user.id).eq("target_user_id", targetId)
      : await table.insert({ user_id: user.id, target_user_id: targetId });
    if (!error) setInterested(!interested);
    else console.error("Interest update failed:", error);
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#00C853] px-3 py-1.5 font-semibold text-white hover:bg-[#19D66B]"
    >
      <Heart className={interested ? "h-3.5 w-3.5 fill-white" : "h-3.5 w-3.5"} />
      {interested ? "Interested ✓" : "Interested"}
    </button>
  );
}
