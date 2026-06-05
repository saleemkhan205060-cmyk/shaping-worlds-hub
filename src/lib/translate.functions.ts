import { createServerFn } from "@tanstack/react-start";

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", pt: "Portuguese", de: "German",
  it: "Italian", ar: "Arabic", ur: "Urdu", hi: "Hindi", bn: "Bengali",
  tr: "Turkish", ru: "Russian", zh: "Simplified Chinese", ja: "Japanese",
  ko: "Korean", id: "Indonesian", sw: "Swahili",
};

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((input: { texts: string[]; target: string }) => input)
  .handler(async ({ data }) => {
    const { texts, target } = data;
    if (target === "en" || !texts.length) return { translations: texts };
    const language = LANG_NAMES[target] ?? target;
    const apiKey = process.env.LOVABLE_API_KEY;
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
            content:
              `You are a UI string translator. Translate each string in the input JSON array into ${language}. ` +
              `Keep tone natural and concise for app UI. Preserve punctuation, emojis, numbers, URLs, brand names ("VIP Life"), and any {placeholders}. ` +
              `Return ONLY a valid JSON array of strings with the SAME length and order. No prose, no code fences.`,
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
