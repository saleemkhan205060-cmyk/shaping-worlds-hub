import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { isNativeCapacitorApp } from "./native-share";
import { getOAuthRedirectOrigin } from "./oauth-origin";

type GoogleSignInOptions = {
  extraParams?: Record<string, string>;
};

export async function signInWithGoogle(options: GoogleSignInOptions = {}) {
  const redirectOrigin = getOAuthRedirectOrigin();

  if (!isNativeCapacitorApp()) {
    return lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectOrigin,
      extraParams: options.extraParams,
    });
  }

  // Capacitor serves the bundled app from https://localhost. The default
  // relative /~oauth/initiate URL would therefore hit the local TanStack
  // router and render its 404 page. Start OAuth on the public app origin.
  const nativeAuth = createLovableAuth({
    oauthBrokerUrl: `${redirectOrigin}/~oauth/initiate`,
  });
  const result = await nativeAuth.signInWithOAuth("google", {
    redirect_uri: redirectOrigin,
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