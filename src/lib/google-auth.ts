import type { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import type { Session } from "@supabase/supabase-js";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { publishAuthenticatedSession } from "@/hooks/use-auth";
import { isNativeCapacitorApp } from "./native-share";
import { hasNativePlugin } from "./native-plugins";
import { ANDROID_OAUTH_BROKER_URL, getOAuthCallbackUrl, PUBLISHED_ORIGIN } from "./oauth-origin";

type GoogleSignInOptions = {
  extraParams?: Record<string, string>;
};

type SafeBrowserPlugin = {
  open(options: { url: string }): Promise<{ opened: boolean }>;
};

const SafeBrowser = registerPlugin<SafeBrowserPlugin>("SafeBrowser");
// Google Credential Manager requires the Web OAuth client as the ID-token
// audience. The Android OAuth client is selected automatically by Google from
// this app's package name and Play signing SHA-1; it must not be passed here.
const GOOGLE_WEB_CLIENT_ID =
  "393519087227-386njhjn53uprbj4evc7q758bhv5g6si.apps.googleusercontent.com";
// The managed SDK defaults to the relative path `/~oauth/initiate`. In a
// packaged Capacitor app that resolves to https://localhost/~oauth/initiate,
// which is the WebView origin and has no OAuth broker route. Use the public
// app origin explicitly for the Android browser fallback.
const nativeBrowserAuth = createLovableAuth({
  oauthBrokerUrl: ANDROID_OAUTH_BROKER_URL,
});
// Use an allow-listed HTTPS App Link rather than a custom scheme. The managed
// OAuth broker only accepts the project's trusted HTTPS redirect origins.
const NATIVE_REDIRECT_URI = `${PUBLISHED_ORIGIN}/auth/callback`;
const NATIVE_OAUTH_STATE_KEY = "vip-life-google-oauth-state";
// One shared guard for EVERY entry point into the OAuth callback (the
// /auth/callback route, the native launch URL, and the appUrlOpen listener).
// Two concurrent exchanges of the same PKCE code re-enter the Supabase auth
// lock and used to hang the Android WebView.
let callbackInFlight: { url: string; promise: Promise<boolean> } | null = null;
let completedCallbackUrl: string | null = null;
let nativeGoogleInitialization: Promise<void> | null = null;

function isInstalledNativeRuntime() {
  if (!isNativeCapacitorApp() || typeof window === "undefined") return false;

  // The mobile preview exposes a Capacitor bridge but reports the web
  // platform. Only the packaged Play Store app may use the native callback.
  return Capacitor.getPlatform() === "android";
}

// The @capacitor/app plugin is optional at runtime: an older installed shell
// (or a build without the native plugin) throws "App plugin is not implemented
// on android" and used to break startup. Load it lazily, and never return the
// plugin proxy directly from an async function — the proxy answers every
// property lookup, so the runtime would treat it as a thenable and call
// App.then(), which also fails on Android.
async function appPlugin(): Promise<{ plugin: typeof CapacitorApp } | null> {
  if (!isInstalledNativeRuntime()) return null;
  // Must check the native plugin list, not Capacitor.isPluginAvailable():
  // the latter is true for the JS web fallback too, and calling that fallback
  // on Android throws `"App" plugin is not implemented on android`.
  if (!hasNativePlugin("App")) return null;
  try {
    const mod = await import("@capacitor/app");
    return mod.App ? { plugin: mod.App } : null;
  } catch {
    return null;
  }
}


function callbackValues(url: string) {
  const callback = new URL(url);
  const values = new URLSearchParams(callback.search);
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
  fragment.forEach((value, key) => values.set(key, value));
  return values;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signInWithNativeGoogle() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  nativeGoogleInitialization ??= SocialLogin.initialize({
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      mode: "online",
    },
  });
  await nativeGoogleInitialization;

  const rawNonce = crypto.randomUUID();
  const nonceDigest = await sha256Hex(rawNonce);
  const login = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile"],
      nonce: nonceDigest,
      filterByAuthorizedAccounts: false,
      autoSelectEnabled: false,
    },
  });

  if (login.result.responseType !== "online" || !login.result.idToken) {
    throw new Error("Google sign-in did not return an ID token");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: login.result.idToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.session) throw new Error("Google sign-in did not create a session");

  publishAuthenticatedSession(data.session);
  return { error: null, redirected: false as const };
}

async function restoreSessionFromNativeCallbackOnce(url: string, expectedState?: string) {
  if (
    !url.startsWith(NATIVE_REDIRECT_URI) &&
    !url.startsWith("https://www.viplifes.com/auth/callback") &&
    !url.startsWith("https://vip-life.lovable.app/auth/callback") &&
    !url.startsWith("lovable://oauth-callback")
  ) {
    return false;
  }

  return completeGoogleOAuthCallback(url, expectedState);
}

/**
 * Deduplicated entry point: the same callback URL is never exchanged twice, and
 * concurrent callers share a single in-flight promise.
 */
export async function completeGoogleOAuthCallback(url: string, expectedState?: string) {
  if (url === completedCallbackUrl) return true;
  if (callbackInFlight && callbackInFlight.url === url) return callbackInFlight.promise;

  const promise = runGoogleOAuthCallback(url, expectedState)
    .then((restored) => {
      if (restored) completedCallbackUrl = url;
      return restored;
    })
    .finally(() => {
      if (callbackInFlight?.url === url) callbackInFlight = null;
    });

  callbackInFlight = { url, promise };
  return promise;
}

async function runGoogleOAuthCallback(url: string, expectedState?: string) {
  const values = callbackValues(url);
  const storedState = localStorage.getItem(NATIVE_OAUTH_STATE_KEY);
  const requiredState = expectedState ?? storedState;
  const returnedState = values.get("state");
  const callbackError = values.get("error_description") ?? values.get("error");

  if (callbackError) throw new Error(callbackError);
  // The managed OAuth broker validates its own signed state. Only compare a
  // locally stored state when this app explicitly created one.
  if (requiredState && returnedState !== requiredState) {
    throw new Error("Google sign-in verification failed");
  }

  const code = values.get("code");
  const accessToken = values.get("access_token");
  const refreshToken = values.get("refresh_token");
  let restoredSession: Session;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      restoredSession = data.session;
    } else if (error) {
      // The Supabase client's detectSessionInUrl feature may have already
      // exchanged the PKCE code during initialization (it runs automatically
      // when the page loads with ?code= in the URL). If so, the manual
      // exchangeCodeForSession call fails with a "code already used" error.
      // Poll for the already-persisted session before surfacing a failure.
      const existing = await waitForAuthSession(10_000);
      if (!existing) throw error;
      restoredSession = existing;
    } else {
      throw new Error("Google sign-in did not return a session");
    }
  } else if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (!data.session) throw new Error("Google sign-in did not return a session");
    restoredSession = data.session;
  } else {
    throw new Error("Google sign-in did not return a session");
  }

  // exchangeCodeForSession/setSession has already validated and persisted this
  // server-issued session. Calling getSession() and getUser() again here can
  // wait behind the auth-state listener's internal lock in Android WebView,
  // leaving the callback and every loading-gated screen stuck indefinitely.
  publishAuthenticatedSession(restoredSession);
  localStorage.removeItem(NATIVE_OAUTH_STATE_KEY);
  return true;
}


export async function restoreNativeGoogleSession() {
  const app = await appPlugin();
  if (!app) return false;
  try {
    const launch = await app.plugin.getLaunchUrl();
    if (!launch?.url) return false;
    return await restoreSessionFromNativeCallbackOnce(launch.url);
  } catch (error) {
    console.warn("Native launch URL unavailable:", error);
    return false;
  }
}

export function listenForNativeGoogleSession(
  onRestored: () => void,
  onError: (error: Error) => void,
) {
  let active = true;
  let removeListener: (() => Promise<void>) | undefined;

  void appPlugin()
    .then((app) => {
      if (!app || !active) return;
      // Even after the PluginHeaders check, calling into the bridge can throw
      // synchronously (`"App" plugin is not implemented on android`) on shells
      // where the native plugin is missing. Never let that escape.
      try {
        return app.plugin
          .addListener("appUrlOpen", ({ url }) => {
            void restoreSessionFromNativeCallbackOnce(url)
              .then((restored) => {
                if (active && restored) onRestored();
              })
              .catch((error) => {
                if (!active) return;
                onError(error instanceof Error ? error : new Error(String(error)));
              });
          })
          .then((listener) => {
            if (!active) {
              void listener.remove();
              return;
            }
            removeListener = () => listener.remove();
          });
      } catch (error) {
        console.warn("Native app URL listener unavailable:", error);
        return;
      }
    })
    .catch((error) => {
      console.warn("Native app URL listener unavailable:", error);
    });


  return () => {
    active = false;
    try { void removeListener?.(); } catch { /* plugin unavailable */ }
  };
}


async function signInWithBrowserGoogle(options: GoogleSignInOptions) {
  // Let the managed SDK own the browser flow. It builds the signed broker
  // request (a hand-built /~oauth/initiate URL is rejected with a Google 403)
  // and falls back to a full-page redirect when popups are unavailable.
  const native = isInstalledNativeRuntime();
  const auth = native ? nativeBrowserAuth : lovable.auth;
  const result = await auth.signInWithOAuth("google", {
    // Android needs the stable published App Link so the external browser can
    // hand the callback back to the app. On the web the redirect target must
    // stay on the CURRENT origin: pointing it at another origin (or a route the
    // SDK does not own) breaks the popup's web_message handoff and surfaces as
    // "Authentication was cancelled" in the editor preview.
    redirect_uri: native ? getOAuthCallbackUrl() : window.location.origin,
    extraParams: options.extraParams,
  });
  // `lovable.auth` persists the returned tokens before resolving. Setting the
  // same session a second time here re-enters the auth lock and can delay the
  // SIGNED_IN event until after the popup-close grace period, incorrectly
  // surfacing a successful mobile sign-in as "Authentication was cancelled".
  // `nativeBrowserAuth` is only used by the installed app's fallback, whose
  // successful callback is restored by NativeGoogleAuthBridge.
  return result;
}

/**
 * The OAuth popup / App-Link handoff can report "cancelled" while the session is
 * still being persisted by the callback route or the native bridge. Poll the
 * already-persisted auth state (never re-entering the auth lock from inside a
 * listener) before treating that result as a real failure.
 */
export async function waitForAuthSession(timeoutMs = 20_000): Promise<Session | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
    } catch {
      // transient auth lock contention — retry until the deadline
    }
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

function looksCancelled(error: unknown) {
  return /cancel|closed|popup|no tokens|timed out/i.test(describeGoogleAuthError(error));
}








/**
 * Flattens whatever the native plugin / Supabase / the broker threw into a
 * single readable string, keeping Google's own status codes (Credential
 * Manager `errorCode`, `statusCode`, HTTP `status`) that are the only way to
 * tell "no Google account on device" from "SHA-1 not registered".
 */
export function describeGoogleAuthError(error: unknown): string {
  if (!error) return "Unknown error";
  const e = error as Record<string, unknown> & { message?: string; name?: string };
  const parts: string[] = [];
  if (e.name && e.name !== "Error") parts.push(String(e.name));
  const message =
    typeof e.message === "string" && e.message ? e.message : typeof error === "string" ? error : "";
  if (message) parts.push(message);
  for (const key of ["code", "errorCode", "statusCode", "status", "error", "error_description"]) {
    const value = e[key];
    if (value !== undefined && value !== null && value !== "") parts.push(`${key}=${String(value)}`);
  }
  if (parts.length === 0) {
    try {
      parts.push(JSON.stringify(error));
    } catch {
      parts.push(String(error));
    }
  }
  return parts.join(" | ");
}

function logGoogleAuthError(stage: string, error: unknown) {
  const detail = describeGoogleAuthError(error);
  const stack = (error as { stack?: string } | null)?.stack;
  // Logged as separate lines so Android logcat / remote console keeps the
  // full stack instead of collapsing the object into "[object Object]".
  console.error(`[google-auth] ${stage} failed: ${detail}`);
  if (stack) console.error(`[google-auth] ${stage} stack:\n${stack}`);
  try {
    console.error(`[google-auth] ${stage} raw:`, JSON.stringify(error, Object.getOwnPropertyNames(Object(error))));
  } catch {
    console.error(`[google-auth] ${stage} raw:`, error);
  }
}

function toDetailedError(stage: string, error: unknown) {
  const detailed = new Error(`${stage}: ${describeGoogleAuthError(error)}`);
  const stack = (error as { stack?: string } | null)?.stack;
  if (stack) detailed.stack = stack;
  (detailed as Error & { cause?: unknown }).cause = error;
  return detailed;
}

type GoogleSignInResult = { error?: Error | null; redirected?: boolean };

/**
 * Treats a "cancelled"-looking failure as success when the callback route or the
 * native bridge has already persisted a session. Only that transient family is
 * retried, so genuine configuration errors still surface immediately.
 */
async function resolveWithPersistedSession(
  result: GoogleSignInResult,
  timeoutMs: number,
): Promise<GoogleSignInResult> {
  if (!result.error || !looksCancelled(result.error)) return result;
  const session = await waitForAuthSession(timeoutMs);
  if (!session) return result;
  publishAuthenticatedSession(session);
  return { error: null, redirected: false };
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  if (!isInstalledNativeRuntime()) {
    try {
      return await resolveWithPersistedSession(
        await signInWithBrowserGoogle(options),
        15_000,
      );
    } catch (error) {
      logGoogleAuthError("browser sign-in", error);
      return await resolveWithPersistedSession(
        {
          error: toDetailedError("Browser Google sign-in", error),
          redirected: false,
        },
        15_000,
      );
    }
  }

  try {
  return await signInWithNativeGoogle();
} catch (error) {
  logGoogleAuthError("native Credential Manager sign-in", error);

  const detail = describeGoogleAuthError(error);

  if (/USER_CANCELLED|cancelled by user/i.test(detail)) {
    return {
      error: new Error("Google sign-in cancelled by user"),
      redirected: false,
    };
  }

  try {
    return await resolveWithPersistedSession(
      await signInWithBrowserGoogle(options),
      45_000,
    );
  } catch (fallbackError) {
    logGoogleAuthError("browser fallback sign-in", fallbackError);
    const detailed = toDetailedError("Google sign-in", fallbackError);
    detailed.message = `${detailed.message} (native: ${detail})`;

    return await resolveWithPersistedSession(
      { error: detailed, redirected: false },
      45_000,
     );
  }
}
}
