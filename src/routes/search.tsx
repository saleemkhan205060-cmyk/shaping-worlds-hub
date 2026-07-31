import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search as SearchIcon, X, BadgeCheck, Play, Image as ImageIcon } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

type SearchTab = "all" | "reels" | "photos" | "people";

const SEARCH_TABS = ["all", "reels", "photos", "people"] as const;

function parseSearch(search: Record<string, unknown>): { q: string; tab: SearchTab } {
  const rawTab = typeof search.tab === "string" ? search.tab : "all";

  return {
    q: typeof search.q === "string" ? search.q : "",
    tab: SEARCH_TABS.includes(rawTab as SearchTab) ? (rawTab as SearchTab) : "all",
  };
}

export const Route = createFileRoute("/search")({
  validateSearch: parseSearch,
  component: SearchPage,
});

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Post = {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: "image" | "video" | "text";
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

const TABS = [
  { key: "all", label: "All", color: "from-indigo-500 to-purple-500" },
  { key: "reels", label: "Reels", color: "from-pink-500 to-rose-500" },
  { key: "photos", label: "Photos", color: "from-amber-500 to-orange-500" },
  { key: "people", label: "People", color: "from-sky-500 to-cyan-500" },
] as const;

function SearchPage() {
  const { q, tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(q);
  const [people, setPeople] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced URL sync
  useEffect(() => {
    const t = setTimeout(() => {
      if (input !== q) {
        navigate({ to: ".", search: { q: input, tab }, replace: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [input, q, tab, navigate]);

  // Fetch results
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setPeople([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    // Sanitize: strip PostgREST filter grammar chars (comma, parens, backslash, quotes, wildcards)
    // to prevent .or() filter injection. Users typing these get plain-text search anyway.
    const safeTerm = term.replace(/[,()\\*%"]/g, "").slice(0, 100);
    if (!safeTerm) {
      setPeople([]);
      setPosts([]);
      setLoading(false);
      return;
    }
    // PostgREST .or() filter uses `*` as the ILIKE wildcard (not `%`).
    const orLike = `*${safeTerm}*`;
    Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .or(`username.ilike.${orLike},display_name.ilike.${orLike}`)
        .limit(30),
      supabase
        .from("posts")
        .select("id,user_id,media_url,media_type,title,caption,thumbnail_url,created_at")
        .or(`title.ilike.${orLike},caption.ilike.${orLike}`)
        .order("created_at", { ascending: false })
        .limit(60),
    ]).then(([p, po]) => {
      setPeople((p.data as Profile[]) ?? []);
      setPosts((po.data as Post[]) ?? []);
      setLoading(false);
    });
  }, [q]);

  const reels = useMemo(() => posts.filter((p) => p.media_type === "video"), [posts]);
  const photos = useMemo(() => posts.filter((p) => p.media_type === "image"), [posts]);

  const setTab = (key: typeof TABS[number]["key"]) =>
    navigate({ to: ".", search: { q, tab: key }, replace: true });

  return (
    <Layout hideMobileNav fullScreenMobile>
      <div className="fixed inset-0 z-40 flex flex-col bg-white md:static md:z-auto">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
          <Link
            to="/"
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search VIP Life…"
              className="w-full h-11 pl-10 pr-10 rounded-full bg-slate-100 border border-transparent text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white focus:border-indigo-200"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center text-white"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto border-b border-slate-100 bg-white">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? `text-white bg-gradient-to-r ${t.color} shadow-md`
                    : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!q.trim() ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 text-slate-500">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <SearchIcon className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm">Search for people, reels, photos and more.</p>
            </div>
          ) : loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Searching…</div>
          ) : (
            <>
              {(tab === "all" || tab === "people") && (
                <PeopleList items={people} />
              )}
              {(tab === "all" || tab === "reels") && (
                <MediaGrid items={reels} kind="video" />
              )}
              {(tab === "all" || tab === "photos") && (
                <MediaGrid items={photos} kind="image" />
              )}
              {people.length === 0 &&
                posts.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-500">
                    No results for "{q}"
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function PeopleList({ items }: { items: Profile[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <SectionTitle icon={<BadgeCheck className="h-4 w-4" />} label="People" />
      <ul className="divide-y divide-slate-100">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              to="/u/$id"
              params={{ id: p.id }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="h-14 w-14 rounded-full ring-2 ring-indigo-200 overflow-hidden bg-slate-200 shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                    {(p.display_name || p.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                  {p.display_name || p.username || "User"}
                  <BadgeCheck className="h-4 w-4 text-sky-500" />
                </div>
                <div className="text-sm text-slate-500 truncate">
                  {p.bio || (p.username ? `@${p.username}` : "VIP Life member")}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MediaGrid({ items, kind }: { items: Post[]; kind: "video" | "image" }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <SectionTitle
        icon={kind === "video" ? <Play className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        label={kind === "video" ? "Reels" : "Photos"}
      />
      <div className="grid grid-cols-3 gap-0.5">
        {items.map((p) => (
          <div key={p.id} className="relative aspect-square bg-slate-100 overflow-hidden">
            {kind === "video" ? (
              p.thumbnail_url ? (
                <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={p.media_url ?? undefined} className="h-full w-full object-cover" muted />
              )
            ) : (
              <img src={p.media_url ?? ""} alt={p.title ?? ""} className="h-full w-full object-cover" />
            )}
            {kind === "video" && (
              <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
                <Play className="h-3 w-3 text-white fill-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="px-4 py-2 text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5 bg-slate-50">
      {icon} {label}
    </div>
  );
}
