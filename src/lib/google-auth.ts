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
      redirect_uri: brokerOrigin,
      extraParams: options.extraParams,
    });
  }

  // Capacitor serves the bundled app from https://localhost. Start OAuth on
  // the public app origin and let cloud-auth-js use its native deep-link
  // callback (enabled by the LovableApp user-agent marker in capacitor.config).
  const nativeAuth = createLovableAuth({
    oauthBrokerUrl: `${brokerOrigin}/~oauth/initiate`,
  });
  const result = await nativeAuth.signInWithOAuth("google", {
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