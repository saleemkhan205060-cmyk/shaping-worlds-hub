import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNativeCapacitorApp } from "./native-share";
import { PUBLISHED_ORIGIN } from "./oauth-origin";

type GoogleSignInOptions = {
  extraParams?: Record<string, string>;
};

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  if (!isNativeCapacitorApp()) {
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
  const redirectUri = "lovable://oauth-callback";
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

    const listener = await App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith(redirectUri)) return;

      await Browser.close().catch(() => undefined);
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
    });

    const timeoutId = window.setTimeout(() => {
      void Browser.close().catch(() => undefined);
      finish({ error: new Error("Google sign-in timed out") });
    }, 120_000);

    try {
      await Browser.open({ url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}` });
    } catch (error) {
      finish({ error: error instanceof Error ? error : new Error(String(error)) });
    }
  });
}