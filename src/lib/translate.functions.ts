import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LANG_NAMES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  ar: "Arabic",
  ur: "Urdu",
  hi: "Hindi",
  bn: "Bengali",
  tr: "Turkish",
  ru: "Russian",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  id: "Indonesian",
  sw: "Swahili",
} as const;

type SupportedTarget = keyof typeof LANG_NAMES;

const SYSTEM_PROMPTS: ReadonlyMap<SupportedTarget, string> = new Map(
  (Object.entries(LANG_NAMES) as [SupportedTarget, string][]).map(([code, name]) => [
    code,
    `You are a UI string translator. Translate each string in the input JSON array into ${name}. ` +
      `Keep tone natural and concise for app UI. Preserve punctuation, emojis, numbers, URLs, brand names ("VIP Life"), and any {placeholders}. ` +
      `Return ONLY a valid JSON array of strings with the SAME length and order. No prose, no code fences.`,
  ]),
);

function isSupportedTarget(value: string): value is SupportedTarget {
  return SYSTEM_PROMPTS.has(value as SupportedTarget);
}

export const translateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])

  .inputValidator((input: { texts: string[]; target: string }) => {
    if (!input || !Array.isArray(input.texts) || typeof input.target !== "string") {
      throw new Error("Invalid input");
    }
    if (!isSupportedTarget(input.target)) throw new Error("Unsupported target language");
    if (input.texts.length > 80) throw new Error("Too many strings");
    const texts = input.texts.map((t) => {
      const s = typeof t === "string" ? t : String(t ?? "");
      return s.length > 500 ? s.slice(0, 500) : s;
    });
    return { texts, target: input.target };
  })
  .handler(async ({ data }) => {
    const { texts, target } = data;
    if (target === "en" || !texts.length) return { translations: texts };
    const systemPrompt = SYSTEM_PROMPTS.get(target);
    if (!systemPrompt) throw new Error("Unsupported target language");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { translations: texts };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: JSON.stringify(texts) },
        ],
      }),
    });

    if (!res.ok) return { translations: texts };
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr) && arr.length === texts.length) {
        return { translations: arr.map((s, i) => (typeof s === "string" ? s : texts[i])) };
      }
    } catch {
      // fall through
    }
    return { translations: texts };
  });
