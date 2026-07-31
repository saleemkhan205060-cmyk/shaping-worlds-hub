import { createFileRoute } from "@tanstack/react-router";

/**
 * Landing page for the Android OAuth deep link.
 *
 * Served by an explicit server handler so the URL always answers with HTTP 200
 * (the SSR document route was answering 404 on the published site, which broke
 * the OAuth redirect target). The page forwards the token payload into the
 * installed app through `lovable://oauth-callback`, which the Android manifest
 * registers alongside the verified https App Link.
 */
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Completing sign-in — VIP Life</title>
    <style>
      body { margin:0; min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:14px; text-align:center; padding:24px; background:#020617; color:#e2e8f0;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
      h1 { font-size:1.125rem; margin:0; }
      p { font-size:.875rem; color:#94a3b8; max-width:22rem; margin:0; }
      button { margin-top:8px; padding:10px 22px; border:0; border-radius:999px; background:#6366f1;
        color:#fff; font-weight:600; font-size:.875rem; }
      #open { display:none; }
    </style>
  </head>
  <body>
    <h1>Finishing sign-in…</h1>
    <p>Returning you to the VIP Life app. You can close this tab once the app opens.</p>
    <button id="open" type="button">Open VIP Life</button>
    <script>
      (function () {
        function payload() {
          return window.location.hash.replace(/^#/, "") || window.location.search.replace(/^\\?/, "");
        }
        function forward() {
          window.location.replace("lovable://oauth-callback#" + payload());
        }
        forward();
        var btn = document.getElementById("open");
        btn.addEventListener("click", forward);
        setTimeout(function () { btn.style.display = "inline-block"; }, 2500);
      })();
    </script>
  </body>
</html>`;

export const Route = createFileRoute("/auth_/native-callback")({
  server: {
    handlers: {
      GET: async () =>
        new Response(PAGE, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-robots-tag": "noindex",
          },
        }),
    },
  },
});
