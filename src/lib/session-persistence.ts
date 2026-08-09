import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Mirrors the Supabase session into native storage (Android SharedPreferences via
// Capacitor Preferences) so the user stays signed in after the app is closed and
// reopened, even when the WebView drops localStorage. On the web this is a no-op
// mirror — Supabase's own localStorage persistence already handles restore.
const STORAGE_KEY = "vip-life.auth.session";

type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

function isNative(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

type PreferencesPlugin = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
};

// IMPORTANT: never return the Capacitor plugin proxy directly from an async
// function. The proxy responds to *every* property lookup, so the JS runtime
// finds a `then` on it, treats it as a thenable and calls `Preferences.then()`
// — which fails with "not implemented on android" and leaves startup hanging.
// Wrapping it in a plain object keeps the plugin out of promise resolution.
async function preferences(): Promise<{ plugin: PreferencesPlugin } | null> {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor/preferences");
    const plugin = mod.Preferences as unknown as PreferencesPlugin;
    return plugin ? { plugin } : null;
  } catch {
    return null;
  }
}


async function writeSession(session: Session) {
  const prefs = await preferences();
  if (!prefs || !session.refresh_token) return;
  try {
    await prefs.plugin.set({
      key: STORAGE_KEY,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      } satisfies StoredSession),
    });
  } catch {
    // Persistence is best-effort; never break auth because storage failed.
  }
}

async function readSession(): Promise<StoredSession | null> {
  const prefs = await preferences();
  if (!prefs) return null;
  try {
    const { value } = await prefs.plugin.get({ key: STORAGE_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<StoredSession>;
    if (!parsed?.refresh_token || !parsed?.access_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: typeof parsed.expires_at === "number" ? parsed.expires_at : undefined,
    };
  } catch {
    return null;
  }
}

function isDefinitivelyInvalid(error: unknown) {
  const message = String((error as { message?: unknown })?.message ?? error ?? "");
  const code = String((error as { code?: unknown })?.code ?? "");
  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    /Invalid Refresh Token|Refresh Token Not Found|Already Used/i.test(message)
  );
}

/**
 * Restores a previously persisted session on startup when Supabase's own
 * storage came back empty. Returns the restored session, or null.
 *
 * Important: a failed restore is only treated as "signed out" when Supabase
 * says the refresh token itself is invalid. Transient failures (offline
 * launch, a 400 caused by a concurrent refresh racing token rotation) must
 * keep the backup so the next launch can retry — otherwise a single flaky
 * refresh permanently logs the user out.
 */
export async function restorePersistedSession(): Promise<Session | null> {
  const stored = await readSession();
  if (!stored) return null;

  const attempt = async () => {
    const { data, error } = await supabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    if (error) throw error;
    return data.session ?? null;
  };

  try {
    const session = await attempt();
    if (session) {
      void writeSession(session);
      return session;
    }
    return null;
  } catch (error) {
    if (isDefinitivelyInvalid(error)) {
      await clearPersistedSession();
      return null;
    }
    // Retry once after the rotation reuse window settles.
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const session = await attempt();
      if (session) void writeSession(session);
      return session;
    } catch (retryError) {
      if (isDefinitivelyInvalid(retryError)) await clearPersistedSession();
      return null;
    }
  }
}

/** Keeps native storage in sync with the current session. Never erases on null. */
export function persistSession(session: Session | null) {
  if (!session?.refresh_token) return;
  void writeSession(session);
}

/** Explicit teardown — only for sign-out or a proven-invalid refresh token. */
export async function clearPersistedSession() {
  const prefs = await preferences();
  if (!prefs) return;
  try {
    await prefs.plugin.remove({ key: STORAGE_KEY });
  } catch {
    // ignore
  }
}
