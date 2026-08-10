import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { completeGoogleOAuthCallback, describeGoogleAuthError } from "@/lib/google-auth";
import { supabase } from "@/integrations/supabase/client";
import { publishAuthenticatedSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth_/callback")({
  head: () => ({
    meta: [
      { title: "Completing sign-in — VIP Life" },
      { name: "description", content: "Completing your secure VIP Life sign-in." },
      { property: "og:title", content: "Completing sign-in — VIP Life" },
      { property: "og:description", content: "Completing your secure VIP Life sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.sessionStorage.removeItem("vip-life-auth-return-to");
      void navigate({ to: "/", replace: true });
    };

    // Safety net: the Supabase client's detectSessionInUrl may auto-exchange
    // the PKCE code and fire SIGNED_IN before the manual exchangeCodeForSession
    // call in completeGoogleOAuthCallback finishes. Listen for it so the user
    // is redirected immediately instead of waiting for the poll.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "SIGNED_IN" && session) {
        publishAuthenticatedSession(session);
        finish();
      }
    });

    void completeGoogleOAuthCallback(window.location.href)
      .then(() => {
        if (!active) return;
        finish();
      })
      .catch((error) => {
        console.error(
          "[google-auth] callback failed:",
          describeGoogleAuthError(error),
          (error as { stack?: string } | null)?.stack ?? "",
          error,
        );
        if (active && !settled) setErrorMessage(describeGoogleAuthError(error));
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">Sign-in could not be completed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", replace: true })}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Return to sign in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">Completing sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we securely sign you in.</p>
          </>
        )}
      </div>
    </main>
  );
}