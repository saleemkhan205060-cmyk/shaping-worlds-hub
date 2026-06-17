import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type Status = "online" | "busy" | "dnd";

const STATUS_META: Record<Status, { dot: string; ring: string; label: string; emoji: string }> = {
  online: { dot: "bg-emerald-500", ring: "ring-emerald-200", label: "Green Indicator - Online", emoji: "🟢" },
  busy: { dot: "bg-amber-400", ring: "ring-amber-200", label: "Yellow Indicator - Busy", emoji: "🟡" },
  dnd: { dot: "bg-red-500", ring: "ring-red-200", label: "Red Indicator - Do Not Disturb Me", emoji: "🔴" },
};

const STORAGE_KEY = "vip:my-status";

export function OnlineUsers() {
  const [me, setMe] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<Status>(() => {
    if (typeof window === "undefined") return "online";
    return (localStorage.getItem(STORAGE_KEY) as Status) || "online";
  });
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Presence channel
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid || cancelled) return;
      setMe(uid);

      channel = supabase.channel("online-users", {
        config: { presence: { key: uid } },
      });
      channelRef.current = channel;

      const syncStatuses = () => {
        const state = channel!.presenceState() as Record<string, Array<{ status?: Status }>>;
        const next: Record<string, Status> = {};
        for (const [id, metas] of Object.entries(state)) {
          const s = metas[0]?.status;
          next[id] = s === "busy" || s === "dnd" ? s : "online";
        }
        setStatuses(next);
      };

      channel
        .on("presence", { event: "sync" }, syncStatuses)
        .on("presence", { event: "join" }, syncStatuses)
        .on("presence", { event: "leave" }, syncStatuses)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const initial = (localStorage.getItem(STORAGE_KEY) as Status) || "online";
            await channel!.track({ status: initial, online_at: new Date().toISOString() });
          }
        });
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) {
        ch.untrack().finally(() => supabase.removeChannel(ch));
      }
    };
  }, []);

  // Load profiles for currently online users
  const onlineIds = useMemo(() => Object.keys(statuses), [statuses]);
  useEffect(() => {
    const missing = onlineIds.filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", missing)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as Profile[]) next[p.id] = p;
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [onlineIds, profiles]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const changeStatus = async (s: Status) => {
    setMyStatus(s);
    localStorage.setItem(STORAGE_KEY, s);
    setMenuOpen(false);
    const ch = channelRef.current;
    if (ch) await ch.track({ status: s, online_at: new Date().toISOString() });
  };

  // Sort: me first, then others
  const orderedIds = useMemo(() => {
    if (!me) return onlineIds;
    return [me, ...onlineIds.filter((id) => id !== me)];
  }, [onlineIds, me]);

  if (orderedIds.length === 0 || (!me && onlineIds.length === 0)) return null;

  return (
    <section className="mb-4 bg-white/70 rounded-3xl border border-slate-200/60 shadow-sm p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[myStatus].dot} shadow-[0_0_0_3px_rgba(16,185,129,0.18)]`} />
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">Online Users</h2>
        </div>
        <Link to="/search" search={{ q: "", tab: "people" }} className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-0.5">
          See All <span aria-hidden>›</span>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {orderedIds.map((id) => {
          const u = profiles[id];
          const isMe = id === me;
          const status: Status = isMe ? myStatus : statuses[id] ?? "online";
          const meta = STATUS_META[status];
          const name = u?.display_name || u?.username || (isMe ? "You" : "User");
          const first = name.split(" ")[0];

          const avatar = (
            <div className="relative">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-slate-200 group-active:scale-95 transition">
                {u?.avatar_url ? (
                  <img src={u.avatar_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold">
                    {first[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {isMe ? (
                <button
                  type="button"
                  aria-label={`Set status (current: ${meta.label})`}
                  title={`Status: ${meta.label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  className={`absolute bottom-0.5 right-0.5 h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full ${meta.dot} border-2 border-white ring-2 ${meta.ring} cursor-pointer`}
                />
              ) : (
                <span
                  title={`Status: ${meta.label}`}
                  className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full ${meta.dot} border-2 border-white`}
                />
              )}

              {isMe && menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-left"
                >
                  {(Object.keys(STATUS_META) as Status[]).map((s) => {
                    const sm = STATUS_META[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          changeStatus(s);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                          myStatus === s ? "font-semibold text-slate-900" : "text-slate-700"
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${sm.dot}`} />
                        <span>{sm.label}</span>
                        {myStatus === s && <span className="ml-auto text-emerald-600">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );

          const label = (
            <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 truncate max-w-full">
              {isMe ? "You" : first}
            </span>
          );

          if (isMe) {
            return (
              <div key={id} className="flex flex-col items-center shrink-0 w-16 sm:w-20 group relative">
                {avatar}
                {label}
              </div>
            );
          }

          return (
            <Link
              key={id}
              to="/u/$id"
              params={{ id }}
              className="flex flex-col items-center shrink-0 w-16 sm:w-20 group"
            >
              {avatar}
              {label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
