import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function OnlineUsers() {
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .not("avatar_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setUsers((data as Profile[]) ?? []));
  }, []);

  if (users.length === 0) return null;

  return (
    <section className="mb-4 bg-white/70 rounded-3xl border border-slate-200/60 shadow-sm p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">Online Users</h2>
        </div>
        <Link to="/search" className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-0.5">
          See All <span aria-hidden>›</span>
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {users.map((u) => {
          const name = u.display_name || u.username || "User";
          const first = name.split(" ")[0];
          return (
            <Link
              key={u.id}
              to="/u/$id"
              params={{ id: u.id }}
              className="flex flex-col items-center shrink-0 w-16 sm:w-20 group"
            >
              <div className="relative">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-slate-200 group-active:scale-95 transition">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold">
                      {first[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-slate-700 truncate max-w-full">
                {first}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
