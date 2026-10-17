export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
export type Message = string | Partial<Record<PluralCategory, string>> & { other: string };
export type Dictionary = Readonly<Record<string, Message>>;
export type Parameters = Readonly<Record<string, string | number>>;

/** Required parameters are checked before rendering; user values are never translated. */
export function placeholders(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g), (match) => match[1]))].sort();
}

export function interpolate(text: string, values: Parameters = {}, isolate = true): string {
  return text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (original, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Missing translation parameter: ${key}`);
    // Unicode FSI/PDI isolate names, numbers and original user text in either direction.
    return isolate ? `\u2068${String(value)}\u2069` : String(value);
  });
}

export function resolveMessage(
  dictionary: Dictionary,
  english: Dictionary,
  key: string,
  values: Parameters = {},
  category: PluralCategory = "other",
): { text: string; usedFallback: boolean } {
  const localized = dictionary[key];
  const message = localized ?? english[key];
  if (message === undefined) return { text: key, usedFallback: true };
  const template = typeof message === "string" ? message : message[category] ?? message.other;
  return { text: interpolate(template, values), usedFallback: localized === undefined };
}

export function dictionaryIssues(english: Dictionary, dictionary: Dictionary): string[] {
  const issues: string[] = [];
  for (const [key, original] of Object.entries(english)) {
    const translated = dictionary[key];
    if (translated === undefined) { issues.push(`missing:${key}`); continue; }
    if (typeof original !== typeof translated) { issues.push(`shape:${key}`); continue; }
    const originals = typeof original === "string" ? [original] : Object.values(original);
    const expected = placeholders(originals.join(" "));
    const templates = typeof translated === "string" ? [translated] : Object.values(translated);
    if (typeof translated !== "string" && !translated.other?.trim()) issues.push(`plural-other:${key}`);
    for (const template of templates) {
      if (!template?.trim()) issues.push(`empty:${key}`);
      if (JSON.stringify(placeholders(template ?? "")) !== JSON.stringify(expected)) issues.push(`parameters:${key}`);
    }
  }
  for (const key of Object.keys(dictionary)) {
    if (!(key in english)) issues.push(`extra:${key}`);
  }
  return [...new Set(issues)];
}