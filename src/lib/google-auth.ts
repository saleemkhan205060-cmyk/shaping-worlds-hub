import { App } from "@capacitor/app";
import { registerPlugin } from "@capacitor/core";
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

function isInstalledNativeRuntime() {
  if (!isNativeCapacitorApp() || typeof window === "undefined") return false;

  // Lovable's mobile preview exposes a Capacitor bridge so native APIs can be
  // previewed, but it still runs on an HTTPS project origin. Only packaged
  // Android builds use Capacitor's local WebView origin.
  return window.location.hostname === "localhost";
}

function shouldUseSameTabWebFlow() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
}

function startSameTabWebFlow(options: GoogleSignInOptions) {
  const state = crypto.randomUUID();
  const redirectUri = `${window.location.origin}/auth/google-callback`;
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri,
    state,
    ...options.extraParams,
  });

  window.sessionStorage.setItem("vip-google-oauth-state", state);
  window.location.assign(`${window.location.origin}/~oauth/initiate?${params.toString()}`);
  return { redirected: true as const, error: null };
}

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  if (!isInstalledNativeRuntime()) {
    // Mobile preview/browser popups can complete in an isolated browser tab,
    // leaving the initiating tab without the returned session. A same-tab
    // redirect keeps the OAuth callback and session storage in one context.
    if (shouldUseSameTabWebFlow()) return startSameTabWebFlow(options);

    return lovable.auth.signInWithOAuth("google", {
      // Preview, published, and custom-domain sessions must return to the
      // exact origin that opened the OAuth popup. Sending preview users to a
      // different published origin closes the popup before its web_message
      // can deliver the session to this page.
      redirect_uri: window.location.origin,
      extraParams: options.extraParams,
    });
  }

  // cloud-auth-js treats a top-level Capacitor WebView as a normal browser and
  // navigates the whole app away. Keep the WebView alive, complete OAuth in the
  // system browser, and receive the session through an Android deep link.
  const state = crypto.randomUUID();
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
    const finish = (result: Parameters<typeof resolve>[0]) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      void listener.remove();
      resolve(result);
    };

    const handleCallback = async (url: string) => {
      if (!url.startsWith(redirectUri)) return;

      const callback = new URL(url);
      const values = new URLSearchParams(callback.hash.replace(/^#/, "") || callback.search);
      const returnedState = values.get("state");
      const error = values.get("error_description") ?? values.get("error");
      const accessToken = values.get("access_token");
      const refreshToken = values.get("refresh_token");

      if (returnedState !== state) {
        finish({ error: new Error("Google sign-in verification failed") });
        return;
      }
      if (error) {
        finish({ error: new Error(error) });
        return;
      }
      if (!accessToken || !refreshToken) {
        finish({ error: new Error("Google sign-in did not return a session") });
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        finish({ error: sessionError });
        return;
      }
      finish({ tokens: { access_token: accessToken, refresh_token: refreshToken }, error: null });
    };

    const listener = await App.addListener("appUrlOpen", ({ url }) => {
      void handleCallback(url);
    });

    // Android can recreate the activity while the system browser is open. In
    // that case appUrlOpen may fire before the WebView listener is restored,
    // so also consume the launch URL after registering the listener.
    const launch = await App.getLaunchUrl();
    if (launch?.url) void handleCallback(launch.url);

    const timeoutId = window.setTimeout(() => {
      finish({ error: new Error("Google sign-in timed out") });
    }, 120_000);

    try {
      await SafeBrowser.open({ url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}` });
    } catch (error) {
      finish({ error: error instanceof Error ? error : new Error(String(error)) });
    }
  });
}