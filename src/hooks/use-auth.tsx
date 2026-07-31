import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let authState: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<(state: AuthState) => void>();
let authInitialized = false;
let authRevision = 0;

function publishAuthState(next: AuthState) {
  authRevision += 1;
  authState = next;
  listeners.forEach((listener) => listener(authState));
}

function isInvalidRefreshSession(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  const code = String((error as { code?: unknown })?.code ?? "");
  return (
    code === "refresh_token_not_found" ||
    /Invalid Refresh Token|Refresh Token Not Found/i.test(message)
  );
}

async function clearBrokenSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The session is already unusable; make sure the UI can recover.
  }
}

function ensureAuthInitialized() {
  if (authInitialized) return;
  authInitialized = true;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, s) => {
    publishAuthState({ session: s, user: s?.user ?? null, loading: false });
  });

  const initializationRevision = authRevision;
  supabase.auth
    .getSession()
    .then(async ({ data, error }) => {
      if (error) throw error;

      // An auth event may complete while this initial storage read is pending.
      // Never let the older result overwrite a newer SIGNED_IN/USER_UPDATED event.
      if (authRevision !== initializationRevision) return;

      if (data.session) {
        const { data: identity, error: identityError } = await supabase.auth.getUser();
        if (identityError) throw identityError;
        if (authRevision !== initializationRevision) return;
        publishAuthState({
          session: data.session,
          user: identity.user,
          loading: false,
        });
        return;
      }

      publishAuthState({
        session: null,
        user: null,
        loading: false,
      });
    })
    .catch(async (error) => {
      if (isInvalidRefreshSession(error)) {
        await clearBrokenSession();
      } else {
        console.error("Auth session load failed:", error);
      }
      publishAuthState({ session: null, user: null, loading: false });
    });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      subscription.unsubscribe();
      listeners.clear();
      authInitialized = false;
    });
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    ensureAuthInitialized();
    setState(authState);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
  publishAuthState({ session: null, user: null, loading: false });
}

export async function confirmAuthenticatedUser() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  publishAuthState({
    session: sessionData.session,
    user: userData.user,
    loading: false,
  });
  return userData.user;
}
