import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared cache of public profile rows keyed by user id.
 *
 * WHY THIS EXISTS: the previous per-component pattern was
 *
 *   useEffect(() => { fetch(ids.filter(id => !profiles[id])) }, [ids, profiles])
 *
 * combined with `setProfiles(prev => ({ ...prev }))`. Whenever one of the
 * requested ids had no readable row (deleted account, RLS-hidden profile,
 * blocked user), that id never landed in the map while the state object
 * identity still changed on every response — so the effect re-ran, refetched,
 * and re-rendered forever. On Android that endless fetch/render loop is what
 * froze scrolling and made taps unresponsive.
 *
 * `ensureProfiles` is a stable callback and remembers which ids were already
 * requested, so each id is fetched at most once and state only changes when
 * genuinely new rows arrive.
 */
export type DirectoryProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function useProfileDirectory() {
  const [profiles, setProfiles] = useState<Record<string, DirectoryProfile>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const ensureProfiles = useCallback((ids: Array<string | null | undefined>) => {
    const missing = Array.from(
      new Set(ids.filter((id): id is string => Boolean(id))),
    ).filter((id) => !requestedRef.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requestedRef.current.add(id));

    void supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", missing)
      .then(({ data, error }) => {
        if (error) {
          // Allow a later retry, but never retry automatically in a loop.
          missing.forEach((id) => requestedRef.current.delete(id));
          return;
        }
        if (!data || data.length === 0) return;
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as DirectoryProfile[]) next[p.id] = p;
          return next;
        });
      });
  }, []);

  const cacheProfile = useCallback((profile: DirectoryProfile) => {
    requestedRef.current.add(profile.id);
    setProfiles((prev) => (prev[profile.id] ? prev : { ...prev, [profile.id]: profile }));
  }, []);

  return { profiles, setProfiles, ensureProfiles, cacheProfile };
}
