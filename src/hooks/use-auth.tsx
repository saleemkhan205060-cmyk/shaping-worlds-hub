import { useEffect, useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPersistedSession,
  persistSession,
  restorePersistedSession,
} from "@/lib/session-persistence";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let authState: AuthState = { session: null, user: null, loading: true };
const serverAuthState: AuthState = { session: null, user: null, loading: true };
const listeners = new Set<() => void>();
let authInitialized = false;
let authRevision = 0;
const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function withAuthTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), AUTH_REQUEST_TIMEOUT_MS);
    operation.then(
      (result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

// The native session backup can be requested from several places at once
// (startup read, refresh failure, OAuth callback). Two concurrent restores race
// each other through the Supabase auth lock and stall the Android WebView, so
// every caller shares a single in-flight restore.
let restoreInFlight: Promise<Session | null> | null = null;

function restorePersistedSessionOnce(): Promise<Session | null> {
  restoreInFlight ??= restorePersistedSession().finally(() => {
    restoreInFlight = null;
  });
  return restoreInFlight;
}

function publishAuthState(next: AuthState) {
  if (
    authState.loading === next.loading &&
    authState.user?.id === next.user?.id &&
    authState.session?.access_token === next.session?.access_token
  ) {
    return;
  }
  authRevision += 1;
  authState = next;
  listeners.forEach((listener) => listener());
}

export function publishAuthenticatedSession(session: Session) {
  publishAuthState({
    session,
    user: session.user,
    loading: false,
  });
}

function isInvalidRefreshSession(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  const code = String((error as { code?: unknown })?.code ?? "");
  return (
    code === "refresh_token_not_found" ||
    /Invalid Refresh Token|Refresh Token Not Found/i.test(message)
  );
}

// Clears ONLY the Supabase (localStorage) copy of a broken session. The native
// backup is deliberately kept: on Android the WebView copy is the one that goes
// stale between launches, and wiping the backup here is what forced users to
// sign in again after reopening the app.
async function clearBrokenLocalSession() {
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
  } = supabase.auth.onAuthStateChange((event, s) => {
    // NEVER do work synchronously inside this callback. Supabase runs auth
    // listeners while holding its internal auth lock; any React render started
    // here can fire effects that call supabase.auth.getUser()/getSession() or
    // PostgREST queries, which then wait on the very lock that is waiting on
    // this callback. That deadlock is what left the post-login Home screen
    // stuck on "Loading…" with an unresponsive UI and a dead Share button.
    setTimeout(() => {
      if (s) {
        // Also covers TOKEN_REFRESHED, so the native backup always holds the
        // latest rotated refresh token.
        persistSession(s);
      }
      // NOTE: SIGNED_OUT is NOT allowed to wipe the native backup. Supabase
      // also emits it after a transient refresh failure (offline launch, token
      // rotation race), which used to log Android users out permanently.
      // Explicit sign-out clears the backup in signOut() below.

      // A null INITIAL_SESSION means Supabase storage is empty (the WebView
      // dropped localStorage between launches) — never treat that as a
      // sign-out or the native backup gets wiped before it can be restored.
      if (!s && event === "INITIAL_SESSION") return;
      publishAuthState({ session: s, user: s?.user ?? null, loading: false });
    }, 0);
  });

  // Absolute safety net: whatever happens to storage or the network, the app
  // must stop showing the startup spinner and become interactive.
  const loadingFallbackRevision = authRevision;
  window.setTimeout(() => {
    if (authRevision === loadingFallbackRevision && authState.loading) {
      publishAuthState({ session: null, user: null, loading: false });
    }
  }, AUTH_REQUEST_TIMEOUT_MS + 2_000);

  const initializationRevision = authRevision;
  withAuthTimeout(supabase.auth.getSession(), "Auth session initialization timed out")
    .then(({ data, error }) => {
      if (error) throw error;

      // An auth event may complete while this initial storage read is pending.
      // Never let the older result overwrite a newer SIGNED_IN/USER_UPDATED event.
      if (authRevision !== initializationRevision) return;

      if (data.session) {
        persistSession(data.session);
        publishAuthState({
          session: data.session,
          user: data.session.user,
          loading: false,
        });
        return;
      }

      // Nothing in Supabase storage: the WebView may have dropped localStorage
      // between app launches. Try the natively persisted session before
      // sending the user back to the sign-in screen. This network call must be
      // bounded — an unanswered restore used to leave the app stuck on the
      // startup spinner with every tap looking frozen.
      return withAuthTimeout(
        restorePersistedSession(),
        "Auth session restore timed out",
      ).then((restored) => {
        if (authRevision !== initializationRevision) return;
        publishAuthState({
          session: restored,
          user: restored?.user ?? null,
          loading: false,
        });
      });
    })
    .catch(async (error) => {
      // A SIGNED_IN event may arrive while the initial storage read is still
      // pending. Its session is newer and must never be erased by a stale
      // initialization timeout or verification failure.
      if (authRevision !== initializationRevision) return;
      if (isInvalidRefreshSession(error)) {
        // Only the WebView copy is broken — try the native backup before
        // sending the user back to the sign-in screen.
        await clearBrokenLocalSession();
        try {
          const restored = await withAuthTimeout(
            restorePersistedSession(),
            "Auth session restore timed out",
          );
          if (authRevision !== initializationRevision) return;
          if (restored) {
            publishAuthState({ session: restored, user: restored.user, loading: false });
            return;
          }
        } catch (restoreError) {
          console.error("Auth session restore failed:", restoreError);
        }
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
  useEffect(() => {
    ensureAuthInitialized();
  }, []);

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => authState,
    () => serverAuthState,
  );
}

export async function signOut() {
  await clearPersistedSession();
  await supabase.auth.signOut();
  publishAuthState({ session: null, user: null, loading: false });
}

export async function confirmAuthenticatedUser() {
  const { data: sessionData, error: sessionError } = await withAuthTimeout(
    supabase.auth.getSession(),
    "Auth session verification timed out",
  );
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  publishAuthState({
    session: sessionData.session,
    user: sessionData.session.user,
    loading: false,
  });
  return sessionData.session.user;
}
