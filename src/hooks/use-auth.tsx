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

let authState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

const serverAuthState: AuthState = {
  session: null,
  user: null,
  loading: true,
};

const listeners = new Set<() => void>();
let authInitialized = false;
let authRevision = 0;

const AUTH_REQUEST_TIMEOUT_MS = 3_000;

function withAuthTimeout<T>(
  operation: Promise<T>,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, AUTH_REQUEST_TIMEOUT_MS);

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
  const message = String(
    (error as { message?: unknown })?.message ?? error ?? "",
  );

  const code = String(
    (error as { code?: unknown })?.code ?? "",
  );

  return (
    code === "refresh_token_not_found" ||
    /Invalid Refresh Token|Refresh Token Not Found/i.test(message)
  );
}

async function clearBrokenLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore local sign-out errors.
  }
}

function ensureAuthInitialized() {
  if (authInitialized) return;

  authInitialized = true;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (session) {
        persistSession(session);
      }

      if (!session && event === "INITIAL_SESSION") {
        return;
      }

      publishAuthState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    }, 0);
  });

  const loadingFallbackRevision = authRevision;

  window.setTimeout(() => {
    if (
      authRevision === loadingFallbackRevision &&
      authState.loading
    ) {
      publishAuthState({
        session: null,
        user: null,
        loading: false,
      });
    }
  }, AUTH_REQUEST_TIMEOUT_MS + 2_000);

  const initializationRevision = authRevision;

  withAuthTimeout(
    supabase.auth.getSession(),
    "Auth session initialization timed out",
  )
    .then(({ data, error }) => {
      if (error) throw error;

      if (authRevision !== initializationRevision) {
        return;
      }

      if (data.session) {
        persistSession(data.session);

        publishAuthState({
          session: data.session,
          user: data.session.user,
          loading: false,
        });

        return;
      }

      return withAuthTimeout(
        restorePersistedSessionOnce(),
        "Auth session restore timed out",
      ).then((restored) => {
        if (authRevision !== initializationRevision) {
          return;
        }

        publishAuthState({
          session: restored,
          user: restored?.user ?? null,
          loading: false,
        });
      });
    })
    .catch(async (error) => {
      if (authRevision !== initializationRevision) {
        return;
      }

      if (isInvalidRefreshSession(error)) {
        await clearBrokenLocalSession();

        try {
          const restored = await withAuthTimeout(
            restorePersistedSessionOnce(),
            "Auth session restore timed out",
          );

          if (authRevision !== initializationRevision) {
            return;
          }

          if (restored) {
            publishAuthState({
              session: restored,
              user: restored.user,
              loading: false,
            });

            return;
          }
        } catch (restoreError) {
          console.error(
            "Auth session restore failed:",
            restoreError,
          );
        }
      } else {
        console.error("Auth session load failed:", error);
      }

      publishAuthState({
        session: null,
        user: null,
        loading: false,
      });
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

  publishAuthState({
    session: null,
    user: null,
    loading: false,
  });
}

export async function confirmAuthenticatedUser() {
  const {
    data: sessionData,
    error: sessionError,
  } = await withAuthTimeout(
    supabase.auth.getSession(),
    "Auth session verification timed out",
  );

  if (sessionError) {
    throw sessionError;
  }

  if (!sessionData.session) {
    return null;
  }

  publishAuthState({
    session: sessionData.session,
    user: sessionData.session.user,
    loading: false,
  });

  return sessionData.session.user;
}
