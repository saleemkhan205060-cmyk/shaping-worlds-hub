/**
 * Shared, server-only moderation engine.
 *
 * Used by the TanStack server functions (`moderate.functions.ts`, web/PWA) and
 * by the public HTTP endpoint (`/api/public/moderate`, used by the Capacitor
 * Android shell, which has no server runtime of its own). Keeping the logic in
 * one place guarantees that EVERY upload path — feed post, profile photo,
 * cover photo, post thumbnail, chat attachment — goes through the same NSFW
 * classifier before anything becomes visible to other users.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const BASE_SYSTEM_PROMPT =
  "You are a strict content-safety classifier for a public social app. " +
  "Given ONE image (which may be a still frame from a video), decide if it is SAFE to publish. " +
  "Block if it clearly contains any of: nudity or sexual content, sexual activity, exposed genitals/breasts, " +
  "lingerie/underwear or swimwear posed sexually, sexually suggestive poses, graphic violence or gore, " +
  "real weapons aimed at people, hate symbols, illegal drugs, self-harm, " +
  "or content sexualizing minors. Do NOT block ordinary photos: selfies, food, scenery, art, sports, " +
  "clothed people, memes, cartoons, screenshots. Reply ONLY as compact JSON: " +
  `{"safe":true} OR {"safe":false,"reason":"<one of: nudity|sexual|violence|gore|weapons|hate|drugs|self_harm|minors|other>"}. No prose.`;

export type Verdict = { safe: boolean; reason: string | null; raw: unknown; skipped: boolean };

export async function classifyImage(
  imageUrl: string,
  kind: "image" | "video",
  extraRules: string[],
): Promise<Verdict> {
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
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  kind === "video"
                    ? "Frame from a user video. Is it safe to publish?"
                    : "User-uploaded image. Is it safe to publish?",
              },
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
  const content: string = (json as any)?.choices?.[0]?.message?.content ?? "";
  const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.safe === "boolean") {
      return {
        safe: parsed.safe,
        reason: parsed.safe ? null : typeof parsed.reason === "string" ? parsed.reason : "unsafe",
        raw: json,
        skipped: false,
      };
    }
  } catch {
    // parse failure — treat as unsafe/pending-review
  }
  return { safe: false, reason: "unparseable_ai_response", raw: json, skipped: false };
}

export async function loadExtraRules(supabase: SupabaseClient<any>): Promise<string[]> {
  const { data: rules } = await supabase
    .from("moderation_rules")
    .select("rule")
    .eq("enabled", true)
    .limit(50);
  return (rules ?? []).map((r: any) => String(r.rule)).filter(Boolean);
}

export type PublishInput = {
  mediaPath: string;
  mediaType: "image" | "video";
  moderationImageUrl: string;
  title: string | null;
  caption: string | null;
  category: string | null;
  isPrivate: boolean;
  thumbnailUrl: string | null;
  thumbnailTitle: string | null;
};

export async function runPublishPost(
  supabase: SupabaseClient<any>,
  userId: string,
  data: PublishInput,
) {
  if (!data.mediaPath.startsWith(`${userId}/`)) {
    throw new Error("Forbidden: media path does not belong to caller");
  }

  const mediaUrl = supabase.storage.from("media").getPublicUrl(data.mediaPath).data.publicUrl;
  const extraRules = await loadExtraRules(supabase);
  const verdict = await classifyImage(data.moderationImageUrl, data.mediaType, extraRules);

  if (!verdict.safe) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Remove the rejected file so it can never be linked or served.
    const toRemove = [data.mediaPath];
    try {
      await supabaseAdmin.storage.from("media").remove(toRemove);
    } catch {}

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
      } as any)
      .select("id")
      .single();

    return {
      published: false as const,
      safe: false,
      reason: verdict.reason ?? "unsafe",
      logId: (logRow as any)?.id ?? null,
    };
  }

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

  return {
    published: true as const,
    safe: true,
    postId: (post as any)?.id,
    moderationSkipped: verdict.skipped,
  };
}

export type MediaInput = {
  bucket: "media" | "message-media";
  path: string;
  mediaType: "image" | "video";
  surface: "avatar" | "cover" | "chat_image" | "chat_video" | "comment_image" | "thumbnail" | "other";
  framePath: string | null;
};

export async function runModerateUploadedMedia(
  supabase: SupabaseClient<any>,
  userId: string,
  data: MediaInput,
) {
  if (!data.path.startsWith(`${userId}/`)) {
    throw new Error("Forbidden: media path does not belong to caller");
  }
  if (data.framePath && !data.framePath.startsWith(`${userId}/`)) {
    throw new Error("Forbidden: frame path does not belong to caller");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const classifyPath = data.framePath ?? data.path;

  let imageUrl: string;
  if (data.bucket === "media") {
    imageUrl = supabase.storage.from("media").getPublicUrl(classifyPath).data.publicUrl;
  } else {
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(classifyPath, 300);
    if (sErr || !signed?.signedUrl) throw new Error("Could not sign moderation URL");
    imageUrl = signed.signedUrl;
  }

  const extraRules = await loadExtraRules(supabase);
  const verdict = await classifyImage(imageUrl, data.mediaType, extraRules);

  if (!verdict.safe) {
    const toRemove = [data.path];
    if (data.framePath && data.framePath !== data.path) toRemove.push(data.framePath);
    try {
      await supabaseAdmin.storage.from(data.bucket).remove(toRemove);
    } catch {}

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
      } as any)
      .select("id")
      .single();

    return { safe: false as const, reason: verdict.reason ?? "unsafe", logId: (logRow as any)?.id ?? null };
  }

  return { safe: true as const, moderationSkipped: verdict.skipped };
}
