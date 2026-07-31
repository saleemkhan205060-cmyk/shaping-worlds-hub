import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/native-callback")({
  head: () => ({
    meta: [
      { title: "Completing sign-in — VIP Life" },
      { name: "description", content: "Finishing your Google sign-in and returning you to the VIP Life app." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Completing sign-in — VIP Life" },
      { property: "og:description", content: "Finishing your Google sign-in and returning you to the VIP Life app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NativeCallbackPage,
});

/**
 * Landing page for the Android OAuth deep link.
 *
 * The managed broker redirects the SYSTEM BROWSER to
 * `https://viplifes.com/auth/native-callback#access_token=...`. When the
 * Android App Link is verified the OS opens the installed app directly and
 * this page never renders (`appUrlOpen` in google-auth.ts finishes the flow).
 * When verification has not happened yet, the browser renders this page, so we
 * forward the exact same payload into the app through the custom scheme
 * `lovable://oauth-callback`, which the manifest also registers.
 */
function NativeCallbackPage() {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const payload = window.location.hash.replace(/^#/, "") || window.location.search.replace(/^\?/, "");
    const deepLink = `lovable://oauth-callback#${payload}`;

    // Hand the tokens to the installed app.
    window.location.replace(deepLink);

    const timeoutId = window.setTimeout(() => setStalled(true), 2500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-slate-950 text-slate-100">
      <h1 className="text-lg font-semibold">Finishing sign-in…</h1>
      <p className="text-sm text-slate-400 max-w-sm">
        Returning you to the VIP Life app. You can close this tab once the app opens.
      </p>
      {stalled && (
        <button
          type="button"
          onClick={() => {
            const payload = window.location.hash.replace(/^#/, "") || window.location.search.replace(/^\?/, "");
            window.location.replace(`lovable://oauth-callback#${payload}`);
          }}
          className="mt-2 px-5 py-2.5 rounded-full bg-indigo-500 text-sm font-semibold"
        >
          Open VIP Life
        </button>
      )}
    </div>
  );
}
