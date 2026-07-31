import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { publishAuthenticatedSession } from "@/hooks/use-auth";
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
let nativeCallbackInFlight: Promise<boolean> | null = null;
let completedNativeCallbackUrl: string | null = null;

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

async function restoreSessionFromNativeCallbackOnce(url: string, expectedState?: string) {
  if (!url.startsWith(NATIVE_REDIRECT_URI) && !url.startsWith("lovable://oauth-callback")) {
    return false;
  }

  if (url === completedNativeCallbackUrl) return true;
  if (nativeCallbackInFlight) return nativeCallbackInFlight;

  nativeCallbackInFlight = restoreSessionFromNativeCallback(url, expectedState)
    .then((restored) => {
      if (restored) completedNativeCallbackUrl = url;
      return restored;
    })
    .finally(() => {
      nativeCallbackInFlight = null;
    });

  return nativeCallbackInFlight;
}

async function restoreSessionFromNativeCallback(url: string, expectedState?: string) {

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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session) throw new Error("Google sign-in did not return a session");
  } else if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (!data.session) throw new Error("Google sign-in did not return a session");
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

  // Publish only after both persisted-session recovery and server identity
  // validation succeed, so the app never observes a half-restored login.
  publishAuthenticatedSession(data.session);
  localStorage.removeItem(NATIVE_OAUTH_STATE_KEY);
  return true;
}

export async function restoreNativeGoogleSession() {
  if (!isInstalledNativeRuntime()) return false;
  const launch = await App.getLaunchUrl();
  if (!launch?.url) return false;
  return restoreSessionFromNativeCallbackOnce(launch.url);
}

export function listenForNativeGoogleSession(
  onRestored: () => void,
  onError: (error: Error) => void,
) {
  if (!isInstalledNativeRuntime()) return () => undefined;

  let active = true;
  let removeListener: (() => Promise<void>) | undefined;

  void App.addListener("appUrlOpen", ({ url }) => {
    void restoreSessionFromNativeCallbackOnce(url)
      .then((restored) => {
        if (active && restored) onRestored();
      })
      .catch((error) => {
        if (!active) return;
        onError(error instanceof Error ? error : new Error(String(error)));
      });
  }).then((listener) => {
    if (!active) {
      void listener.remove();
      return;
    }
    removeListener = () => listener.remove();
  });

  return () => {
    active = false;
    void removeListener?.();
  };
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  if (!isInstalledNativeRuntime()) {
    // Let the managed SDK own the browser flow. It builds the signed broker
    // request (a hand-built /~oauth/initiate URL is rejected with a Google 403)
    // and falls back to a full-page redirect when popups are unavailable.
    const result = await lovable.auth.signInWithOAuth("google", {
      // Preview, published, and custom-domain sessions must return to the
      // exact origin that opened the OAuth flow.
      redirect_uri: window.location.origin,
      extraParams: options.extraParams,
    });

    if (result.error || result.redirected) return result;

    // The generated Lovable auth wrapper has already awaited setSession here.
    // Writing the same tokens a second time races the auth-state listener in
    // mobile WebViews and can leave the UI signed out even though OAuth itself
    // succeeded. Let the single shared onAuthStateChange listener publish the
    // session instead.
    return result;
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

  try {
    await SafeBrowser.open({
      url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}`,
    });

    // Opening the browser is the end of this request. The persistent
    // appUrlOpen listener on the auth page exclusively owns callback parsing,
    // PKCE/token restoration, and navigation. Waiting for that same auth event
    // here left this promise pending behind the UI's 30-second request timeout.
    return { error: null, redirected: true as const };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      redirected: false as const,
    };
  }
}
