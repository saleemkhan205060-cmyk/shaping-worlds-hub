import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Moderate an image (or a representative video frame) using Lovable AI (Gemini vision).
 * Returns { safe, reason? }. If the AI gateway is unavailable, fails open (safe=true)
 * to avoid blocking legitimate uploads — text-level moderation still runs on captions/titles
 * via the DB `classify_risky_text` triggers.
 */
export const moderateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageUrl: string; kind?: "image" | "video" }) => {
    if (!input || typeof input.imageUrl !== "string" || !/^https?:\/\//i.test(input.imageUrl)) {
      throw new Error("Invalid imageUrl");
    }
    if (input.imageUrl.length > 2000) throw new Error("imageUrl too long");
    return { imageUrl: input.imageUrl, kind: input.kind === "video" ? "video" : "image" as const };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { safe: true, reason: null as string | null, skipped: true };

    const system =
      "You are a strict content-safety classifier for a public social app. " +
      "Given ONE image (which may be a still frame from a video), decide if it is SAFE to publish. " +
      "Block if it clearly contains any of: nudity or sexual content, sexual activity, exposed genitals/breasts, " +
      "graphic violence or gore, real weapons aimed at people, hate symbols, illegal drugs, self-harm, " +
      "or content sexualizing minors. Do NOT block ordinary photos: selfies, food, scenery, art, sports, " +
      "clothed people, memes, cartoons, screenshots. Reply ONLY as compact JSON: " +
      `{"safe":true} OR {"safe":false,"reason":"<one of: nudity|sexual|violence|gore|weapons|hate|drugs|self_harm|minors|other>"}. No prose.`;

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                { type: "text", text: data.kind === "video" ? "Frame from a user video. Is it safe to publish?" : "User-uploaded image. Is it safe to publish?" },
                { type: "image_url", image_url: { url: data.imageUrl } },
              ],
            },
          ],
        }),
      });
    } catch {
      return { safe: true, reason: null, skipped: true };
    }

    if (res.status === 429 || res.status === 402) {
      // Do not silently block on gateway quota errors
      return { safe: true, reason: null, skipped: true };
    }
    if (!res.ok) return { safe: true, reason: null, skipped: true };

    const json = await res.json().catch(() => null);
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.safe === "boolean") {
        return {
          safe: parsed.safe,
          reason: parsed.safe ? null : (typeof parsed.reason === "string" ? parsed.reason : "unsafe"),
          skipped: false,
        };
      }
    } catch {
      // fall through
    }
    return { safe: true, reason: null, skipped: true };
  });
