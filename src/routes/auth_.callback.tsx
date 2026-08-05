import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { completeGoogleOAuthCallback, describeGoogleAuthError } from "@/lib/google-auth";

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

function safeDestination() {
  const saved = window.sessionStorage.getItem("vip-life-auth-return-to");
  window.sessionStorage.removeItem("vip-life-auth-return-to");
  return saved?.startsWith("/") && !saved.startsWith("//") ? saved : "/";
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void completeGoogleOAuthCallback(window.location.href)
      .then(() => {
        if (!active) return;
        const destination = safeDestination();
        void navigate({ to: destination, replace: true });
      })
      .catch((error) => {
        console.error(
          "[google-auth] callback failed:",
          describeGoogleAuthError(error),
          (error as { stack?: string } | null)?.stack ?? "",
          error,
        );
        if (active) setErrorMessage(describeGoogleAuthError(error));
      });

    return () => {
      active = false;
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