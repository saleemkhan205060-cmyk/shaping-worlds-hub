import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function isInvalidRefreshSession(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  const code = String((error as { code?: unknown })?.code ?? "");
  return code === "refresh_token_not_found" || /Invalid Refresh Token|Refresh Token Not Found/i.test(message);
}

async function clearBrokenSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The session is already unusable; make sure the UI can recover.
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(async (error) => {
        if (isInvalidRefreshSession(error)) {
          await clearBrokenSession();
        } else {
          console.error("Auth session load failed:", error);
        }
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
}
