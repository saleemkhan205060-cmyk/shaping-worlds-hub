import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNativeCapacitorApp } from "./native-share";
import { PUBLISHED_ORIGIN } from "./oauth-origin";

type GoogleSignInOptions = {
  extraParams?: Record<string, string>;
};

type SafeBrowserPlugin = {
  open(options: { url: string }): Promise<{ opened: boolean }>;
};

const SafeBrowser = registerPlugin<SafeBrowserPlugin>("SafeBrowser");
// Use an allow-listed HTTPS App Link rather than a custom scheme. The managed
// OAuth broker only accepts the project's trusted HTTPS redirect origins.
const NATIVE_REDIRECT_URI = `${PUBLISHED_ORIGIN}/auth/native-callback`;
const NATIVE_OAUTH_STATE_KEY = "vip-life-google-oauth-state";

function isInstalledNativeRuntime() {
  if (!isNativeCapacitorApp() || typeof window === "undefined") return false;

  // The mobile preview exposes a Capacitor bridge but reports the web
  // platform. Only the packaged Play Store app may use the native callback.
  return Capacitor.getPlatform() === "android";
}

function callbackValues(url: string) {
  const callback = new URL(url);
  const values = new URLSearchParams(callback.search);
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
  fragment.forEach((value, key) => values.set(key, value));
  return values;
}

async function restoreSessionFromNativeCallback(url: string, expectedState?: string) {
  if (!url.startsWith(NATIVE_REDIRECT_URI) && !url.startsWith("lovable://oauth-callback")) {
    return false;
  }

  const values = callbackValues(url);
  const storedState = localStorage.getItem(NATIVE_OAUTH_STATE_KEY);
  const requiredState = expectedState ?? storedState;
  const returnedState = values.get("state");
  const callbackError = values.get("error_description") ?? values.get("error");

  if (callbackError) throw new Error(callbackError);
  if (!requiredState || returnedState !== requiredState) {
    throw new Error("Google sign-in verification failed");
  }

  const code = values.get("code");
  const accessToken = values.get("access_token");
  const refreshToken = values.get("refresh_token");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else {
    throw new Error("Google sign-in did not return a session");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Google session could not be restored");

  // Revalidate the restored JWT with Auth before telling the UI that login is
  // complete. This also guarantees the shared auth listener receives a usable
  // identity rather than a storage-only session.
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError) throw identityError;
  if (!identity.user) throw new Error("Google user could not be verified");

  localStorage.removeItem(NATIVE_OAUTH_STATE_KEY);
  return true;
}

export async function restoreNativeGoogleSession() {
  if (!isInstalledNativeRuntime()) return false;
  const launch = await App.getLaunchUrl();
  if (!launch?.url) return false;
  return restoreSessionFromNativeCallback(launch.url);
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  if (!isInstalledNativeRuntime()) {
    // Let the managed SDK own the browser flow. It builds the signed broker
    // request (a hand-built /~oauth/initiate URL is rejected with a Google 403)
    // and falls back to a full-page redirect when popups are unavailable.
    return lovable.auth.signInWithOAuth("google", {
      // Preview, published, and custom-domain sessions must return to the
      // exact origin that opened the OAuth flow.
      redirect_uri: window.location.origin,
      extraParams: options.extraParams,
    });
  }


  // cloud-auth-js treats a top-level Capacitor WebView as a normal browser and
  // navigates the whole app away. Keep the WebView alive, complete OAuth in the
  // system browser, and receive the session through an Android deep link.
  const state = crypto.randomUUID();
  localStorage.setItem(NATIVE_OAUTH_STATE_KEY, state);
  const redirectUri = NATIVE_REDIRECT_URI;
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri,
    state,
    ...options.extraParams,
  });

  return new Promise<
    | { tokens: { access_token: string; refresh_token: string }; error: null; redirected?: false }
    | { tokens?: undefined; error: Error; redirected?: false }
  >(async (resolve) => {
    let settled = false;
    let timeoutId: number | undefined;
    let listener: Awaited<ReturnType<typeof App.addListener>> | undefined;
    const finish = (result: Parameters<typeof resolve>[0]) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      void listener?.remove();
      resolve(result);
    };

    const handleCallback = async (url: string) => {
      try {
        const restored = await restoreSessionFromNativeCallback(url, state);
        if (!restored) return;
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) throw new Error("Google session could not be restored");
        finish({
          tokens: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          },
          error: null,
        });
      } catch (error) {
        finish({ error: error instanceof Error ? error : new Error(String(error)) });
      }
    };

    listener = await App.addListener("appUrlOpen", ({ url }) => {
      void handleCallback(url);
    });

    timeoutId = window.setTimeout(() => {
      finish({ error: new Error("Google sign-in timed out") });
    }, 120_000);

    try {
      await SafeBrowser.open({ url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}` });
    } catch (error) {
      finish({ error: error instanceof Error ? error : new Error(String(error)) });
    }
  });
}