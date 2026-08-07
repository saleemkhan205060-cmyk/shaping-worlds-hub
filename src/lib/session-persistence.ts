import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Mirrors the Supabase session into native storage (Android SharedPreferences via
// Capacitor Preferences) so the user stays signed in after the app is closed and
// reopened, even when the WebView drops localStorage. On the web this is a no-op
// mirror — Supabase's own localStorage persistence already handles restore.
const STORAGE_KEY = "vip-life.auth.session";

function isNative(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  try {
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

async function preferences() {
  if (!isNative()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    return Preferences;
  } catch {
    return null;
  }
}

async function writeSession(session: Session | null) {
  const prefs = await preferences();
  if (!prefs) return;
  try {
    if (!session?.refresh_token) {
      await prefs.remove({ key: STORAGE_KEY });
      return;
    }
    await prefs.set({
      key: STORAGE_KEY,
      value: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    });
  } catch {
    // Persistence is best-effort; never break auth because storage failed.
  }
}

async function readSession(): Promise<{ access_token: string; refresh_token: string } | null> {
  const prefs = await preferences();
  if (!prefs) return null;
  try {
    const { value } = await prefs.get({ key: STORAGE_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as { access_token?: string; refresh_token?: string };
    if (!parsed?.refresh_token || !parsed?.access_token) return null;
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
  } catch {
    return null;
  }
}

/**
 * Restores a previously persisted session on startup when Supabase's own
 * storage came back empty. Returns the restored session, or null.
 */
export async function restorePersistedSession(): Promise<Session | null> {
  const stored = await readSession();
  if (!stored) return null;
  try {
    const { data, error } = await supabase.auth.setSession(stored);
    if (error || !data.session) {
      await writeSession(null);
      return null;
    }
    return data.session;
  } catch {
    return null;
  }
}

/** Keeps native storage in sync with the current session. */
export function persistSession(session: Session | null) {
  void writeSession(session);
}
