import { createFileRoute } from "@tanstack/react-router";

/**
 * HTTP moderation endpoint for the Capacitor Android shell.
 *
 * The native app bundles a static SPA with no server runtime, so it cannot call
 * TanStack server functions. Without this endpoint the mobile upload path would
 * bypass NSFW screening entirely. The caller is authenticated here with their
 * Supabase bearer token — this route is only "public" in the sense that the
 * site-level auth gate does not apply to it.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/moderate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
        const token = authHeader.slice(7).trim();
        if (!token) return json({ error: "Unauthorized" }, 401);

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return json({ error: "Not configured" }, 500);

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
        const userId = claimsData?.claims?.sub;
        if (claimsErr || !userId) return json({ error: "Unauthorized" }, 401);

        let body: any;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const core = await import("@/lib/moderation-core.server");

        try {
          if (body?.action === "publish") {
            if (typeof body.mediaPath !== "string" || !body.mediaPath) return json({ error: "Missing mediaPath" }, 400);
            if (body.mediaType !== "image" && body.mediaType !== "video") return json({ error: "Invalid mediaType" }, 400);
            if (!/^https?:\/\//i.test(String(body.moderationImageUrl ?? ""))) return json({ error: "Invalid moderationImageUrl" }, 400);
            const result = await core.runPublishPost(supabase as any, userId, {
              mediaPath: String(body.mediaPath).slice(0, 500),
              mediaType: body.mediaType,
              moderationImageUrl: String(body.moderationImageUrl).slice(0, 2000),
              title: (body.title ?? "") ? String(body.title).slice(0, 200) : null,
              caption: (body.caption ?? "") ? String(body.caption).slice(0, 2000) : null,
              category: (body.category ?? "") ? String(body.category).slice(0, 60) : null,
              isPrivate: !!body.isPrivate,
              thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
              thumbnailTitle: (body.thumbnailTitle ?? "") ? String(body.thumbnailTitle).slice(0, 200) : null,
            });
            return json(result);
          }

          if (body?.action === "media") {
            if (body.bucket !== "media" && body.bucket !== "message-media") return json({ error: "Invalid bucket" }, 400);
            if (typeof body.path !== "string" || !body.path) return json({ error: "Missing path" }, 400);
            if (body.mediaType !== "image" && body.mediaType !== "video") return json({ error: "Invalid mediaType" }, 400);
            const result = await core.runModerateUploadedMedia(supabase as any, userId, {
              bucket: body.bucket,
              path: String(body.path).slice(0, 500),
              mediaType: body.mediaType,
              surface: body.surface ?? "other",
              framePath: body.framePath ? String(body.framePath).slice(0, 500) : null,
            });
            return json(result);
          }

          return json({ error: "Unknown action" }, 400);
        } catch (e: any) {
          return json({ error: e?.message ?? "Moderation failed" }, 400);
        }
      },
    },
  },
});
