import type { PluralCategory } from "./i18n-core";

export type FormatterCapability = "date" | "number" | "relativeTime" | "plural";
export type FormattingSupport = { supported: boolean; requested: string; resolved: string | null };

/** Never mistake an implicit English fallback for target-language support. */
export function formattingSupport(locale: string, capability: FormatterCapability): FormattingSupport {
  try {
    const constructors = {
      date: Intl.DateTimeFormat,
      number: Intl.NumberFormat,
      relativeTime: Intl.RelativeTimeFormat,
      plural: Intl.PluralRules,
    };
    const constructor = constructors[capability];
    const supported = constructor.supportedLocalesOf([locale]).length === 1;
    const resolved = supported ? new constructor(locale).resolvedOptions().locale : null;
    return { supported, requested: locale, resolved };
  } catch {
    return { supported: false, requested: locale, resolved: null };
  }
}

function requireSupport(locale: string, capability: FormatterCapability): void {
  if (!formattingSupport(locale, capability).supported) {
    throw new Error(`Reviewed bundled formatting data required: ${locale}/${capability}`);
  }
}

export function localizedNumber(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  requireSupport(locale, "number");
  return new Intl.NumberFormat(locale, options).format(value);
}

export function localizedDate(locale: string, value: Date | number, options?: Intl.DateTimeFormatOptions): string {
  requireSupport(locale, "date");
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function localizedRelativeTime(locale: string, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  requireSupport(locale, "relativeTime");
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}

export function localizedPlural(locale: string, count: number): PluralCategory {
  requireSupport(locale, "plural");
  return new Intl.PluralRules(locale).select(count);
}