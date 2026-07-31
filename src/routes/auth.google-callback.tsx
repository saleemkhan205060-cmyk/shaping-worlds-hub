import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/google-callback")({
  head: () => ({
    meta: [
      { title: "Google Sign-In | VIP Life" },
      { name: "description", content: "Complete your secure Google sign-in to VIP Life." },
      { property: "og:title", content: "Google Sign-In | VIP Life" },
      { property: "og:description", content: "Complete your secure Google sign-in to VIP Life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing Google sign-in…");

  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      const callbackUrl = new URL(window.location.href);
      const values = new URLSearchParams(
        callbackUrl.hash.replace(/^#/, "") || callbackUrl.search,
      );
      const expectedState = window.sessionStorage.getItem("vip-google-oauth-state");
      const returnedState = values.get("state");
      const providerError = values.get("error_description") ?? values.get("error");
      const accessToken = values.get("access_token");
      const refreshToken = values.get("refresh_token");

      window.sessionStorage.removeItem("vip-google-oauth-state");

      if (providerError) throw new Error(providerError);
      if (!expectedState || returnedState !== expectedState) {
        throw new Error("Google sign-in verification failed");
      }
      if (!accessToken || !refreshToken) {
        throw new Error("Google sign-in did not return a session");
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (active) navigate({ to: "/", replace: true });
    };

    void finishSignIn().catch((error) => {
      console.error("Google callback error:", error);
      if (active) setMessage("Google sign-in could not be completed. Please return and try again.");
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">{message}</h1>
        {message.startsWith("Google sign-in could") && (
          <a className="mt-4 inline-block text-sm font-medium text-primary underline" href="/auth">
            Return to sign in
          </a>
        )}
      </div>
    </main>
  );
}