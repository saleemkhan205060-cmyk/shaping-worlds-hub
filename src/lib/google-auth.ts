import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNativeCapacitorApp } from "./native-share";
import { getOAuthRedirectOrigin } from "./oauth-origin";

type GoogleSignInOptions = {
  extraParams?: Record<string, string>;
};

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  const brokerOrigin = getOAuthRedirectOrigin();

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

  // Capacitor serves the bundled app from https://localhost. The default
  // relative /~oauth/initiate URL would therefore hit the local TanStack
  // router and render its 404 page. Start OAuth on the public app origin,
  // but return to the WebView origin so the session is stored in the app.
  const nativeAuth = createLovableAuth({
    oauthBrokerUrl: `${brokerOrigin}/~oauth/initiate`,
  });
  const result = await nativeAuth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
    extraParams: options.extraParams,
  });

  if (!result.redirected && !result.error) {
    try {
      await supabase.auth.setSession(result.tokens);
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  return result;
}