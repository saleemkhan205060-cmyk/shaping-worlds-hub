import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_SYSTEM_PROMPT =
  "You are a strict content-safety classifier for a public social app. " +
  "Given ONE image (which may be a still frame from a video), decide if it is SAFE to publish. " +
  "Block if it clearly contains any of: nudity or sexual content, sexual activity, exposed genitals/breasts, " +
  "graphic violence or gore, real weapons aimed at people, hate symbols, illegal drugs, self-harm, " +
  "or content sexualizing minors. Do NOT block ordinary photos: selfies, food, scenery, art, sports, " +
  "clothed people, memes, cartoons, screenshots. Reply ONLY as compact JSON: " +
  `{"safe":true} OR {"safe":false,"reason":"<one of: nudity|sexual|violence|gore|weapons|hate|drugs|self_harm|minors|other>"}. No prose.`;

async function classifyImage(
  imageUrl: string,
  kind: "image" | "video",
  extraRules: string[],
): Promise<{ safe: boolean; reason: string | null; raw: unknown; skipped: boolean }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { safe: true, reason: null, raw: null, skipped: true };

  const rulesText = extraRules.length
    ? "\nAdditional custom rules (block if any apply):\n- " + extraRules.join("\n- ")
    : "";
  const system = BASE_SYSTEM_PROMPT + rulesText;

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: kind === "video" ? "Frame from a user video. Is it safe to publish?" : "User-uploaded image. Is it safe to publish?" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return { safe: true, reason: null, raw: { error: String(e) }, skipped: true };
  }

  if (!res.ok) {
    // 402/429/5xx: fail-closed for user safety, but tag as gateway_error so admin can review.
    return { safe: false, reason: `gateway_error_${res.status}`, raw: null, skipped: false };
  }

  const json = await res.json().catch(() => null);
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.safe === "boolean") {
      return {
        safe: parsed.safe,
        reason: parsed.safe ? null : (typeof parsed.reason === "string" ? parsed.reason : "unsafe"),
        raw: json,
        skipped: false,
      };
    }
  } catch {
    // parse failure — treat as unsafe/pending-review
  }
  return { safe: false, reason: "unparseable_ai_response", raw: json, skipped: false };
}

/**
 * The single, atomic publish path. Moderates the media, then either inserts a post
 * or logs a blocked entry for admin review. All uploads MUST go through this — the
 * client cannot bypass moderation because it does not insert into `posts` directly.
 */
export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    mediaPath: string;
    mediaType: "image" | "video";
    moderationImageUrl: string; // image URL, or captured frame URL for videos
    title?: string | null;
    caption?: string | null;
    category?: string | null;
    isPrivate?: boolean;
    thumbnailUrl?: string | null;
    thumbnailTitle?: string | null;
  }) => {
    if (!input || typeof input.mediaPath !== "string") throw new Error("Missing mediaPath");
    if (input.mediaType !== "image" && input.mediaType !== "video") throw new Error("Invalid mediaType");
    if (!/^https?:\/\//i.test(input.moderationImageUrl)) throw new Error("Invalid moderationImageUrl");
    return {
      mediaPath: input.mediaPath.slice(0, 500),
      mediaType: input.mediaType,
      moderationImageUrl: input.moderationImageUrl.slice(0, 2000),
      title: (input.title ?? "").slice(0, 200) || null,
      caption: (input.caption ?? "").slice(0, 2000) || null,
      category: (input.category ?? "").slice(0, 60) || null,
      isPrivate: !!input.isPrivate,
      thumbnailUrl: (input.thumbnailUrl ?? "") || null,
      thumbnailTitle: (input.thumbnailTitle ?? "").slice(0, 200) || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure the caller actually owns this storage path (prefix must start with their id)
    if (!data.mediaPath.startsWith(`${userId}/`)) {
      throw new Error("Forbidden: media path does not belong to caller");
    }

    // Public URL for the uploaded media
    const { data: pub } = supabase.storage.from("media").getPublicUrl(data.mediaPath);
    const mediaUrl = pub.publicUrl;

    // Load enabled moderation rules
    const { data: rules } = await supabase
      .from("moderation_rules")
      .select("rule")
      .eq("enabled", true)
      .limit(50);
    const extraRules = (rules ?? []).map((r: any) => String(r.rule)).filter(Boolean);

    const verdict = await classifyImage(data.moderationImageUrl, data.mediaType, extraRules);

    if (!verdict.safe) {
      // Log for admin review using service role (bypasses RLS write-restrictions)
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: logRow } = await supabaseAdmin
        .from("moderation_logs")
        .insert({
          user_id: userId,
          media_url: mediaUrl,
          media_path: data.mediaPath,
          media_type: data.mediaType,
          reason: verdict.reason,
          ai_raw: verdict.raw as any,
          status: "blocked",
          caption: data.caption,
          title: data.title,
          category: data.category,
          is_private: data.isPrivate,
          thumbnail_url: data.thumbnailUrl,
        })
        .select("id")
        .single();

      return {
        published: false as const,
        safe: false,
        reason: verdict.reason ?? "unsafe",
        logId: logRow?.id ?? null,
      };
    }

    // Safe — insert the post as the user (RLS applies)
    const { data: post, error: insErr } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: data.mediaType,
        title: data.title,
        thumbnail_url: data.thumbnailUrl,
        thumbnail_title: data.thumbnailTitle,
        caption: data.caption,
        category: data.category,
        is_private: data.isPrivate,
      } as any)
      .select("id")
      .single();

    if (insErr) throw new Error(insErr.message);

    return { published: true as const, safe: true, postId: post?.id, moderationSkipped: verdict.skipped };
  });

/**
 * Moderate an image that a user just uploaded to a storage bucket for a surface
 * OTHER than a feed post (avatar, cover photo, chat attachment, etc.).
 *
 * - For public buckets (e.g. "media"), the AI classifier is called with the
 *   public URL. For private buckets ("message-media"), a short-lived signed
 *   URL is minted server-side so the AI gateway can fetch the file.
 * - On unsafe verdict: the file is deleted from storage and an entry is
 *   written to `moderation_logs` with `category = surface`. The client then
 *   surfaces a rejection message; the object never becomes visible.
 * - Callers MUST NOT persist the URL/path anywhere user-facing until this
 *   returns `{ safe: true }`.
 */
export const moderateUploadedMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    bucket: "media" | "message-media";
    path: string;
    mediaType: "image" | "video";
    surface: "avatar" | "cover" | "chat_image" | "chat_video" | "comment_image" | "other";
    /** For videos in private buckets, callers upload a captured frame to the
     *  same bucket and pass its path here so we can moderate the frame. */
    framePath?: string | null;
  }) => {
    if (!input || typeof input.path !== "string" || !input.path) throw new Error("Missing path");
    if (input.bucket !== "media" && input.bucket !== "message-media") throw new Error("Invalid bucket");
    if (input.mediaType !== "image" && input.mediaType !== "video") throw new Error("Invalid mediaType");
    const surfaces = ["avatar", "cover", "chat_image", "chat_video", "comment_image", "other"] as const;
    if (!surfaces.includes(input.surface as any)) throw new Error("Invalid surface");
    return {
      bucket: input.bucket,
      path: input.path.slice(0, 500),
      mediaType: input.mediaType,
      surface: input.surface,
      framePath: input.framePath ? input.framePath.slice(0, 500) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) {
      throw new Error("Forbidden: media path does not belong to caller");
    }
    if (data.framePath && !data.framePath.startsWith(`${userId}/`)) {
      throw new Error("Forbidden: frame path does not belong to caller");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Path to classify: the frame for private videos, else the media itself.
    const classifyPath = data.framePath ?? data.path;

    // Build a URL the AI gateway can fetch.
    let imageUrl: string;
    if (data.bucket === "media") {
      imageUrl = supabase.storage.from("media").getPublicUrl(classifyPath).data.publicUrl;
    } else {
      const { data: signed, error: sErr } = await supabaseAdmin
        .storage.from(data.bucket)
        .createSignedUrl(classifyPath, 300);
      if (sErr || !signed?.signedUrl) throw new Error("Could not sign moderation URL");
      imageUrl = signed.signedUrl;
    }

    // Load enabled moderation rules
    const { data: rules } = await supabase
      .from("moderation_rules")
      .select("rule")
      .eq("enabled", true)
      .limit(50);
    const extraRules = (rules ?? []).map((r: any) => String(r.rule)).filter(Boolean);

    const verdict = await classifyImage(imageUrl, data.mediaType, extraRules);

    if (!verdict.safe) {
      // Delete BOTH the original object and the frame (if any) from storage.
      const toRemove = [data.path];
      if (data.framePath && data.framePath !== data.path) toRemove.push(data.framePath);
      try { await supabaseAdmin.storage.from(data.bucket).remove(toRemove); } catch {}

      // Log for admin review. For private buckets `imageUrl` is a short-lived
      // signed URL — store it anyway; admin UI can re-sign from `media_path`
      // if it has expired.
      const { data: logRow } = await supabaseAdmin
        .from("moderation_logs")
        .insert({
          user_id: userId,
          media_url: imageUrl,
          media_path: data.path,
          media_type: data.mediaType,
          reason: verdict.reason,
          ai_raw: verdict.raw as any,
          status: "blocked",
          category: data.surface,
          caption: `Blocked ${data.surface} upload from bucket "${data.bucket}"`,
        })
        .select("id")
        .single();

      return { safe: false as const, reason: verdict.reason ?? "unsafe", logId: logRow?.id ?? null };
    }

    return { safe: true as const, moderationSkipped: verdict.skipped };
  });

