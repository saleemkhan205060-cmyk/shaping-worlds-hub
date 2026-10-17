import type { PluralCategory } from "./i18n-core";

export type FormatterCapability = "date" | "number" | "relativeTime" | "plural";
export type FormattingSupport = { supported: boolean; requested: string; resolved: string | null };

/** Never mistake an implicit English fallback for target-language support. */
export function formattingSupport(locale: string, capability: FormatterCapability): FormattingSupport {
  try {
    const probes = {
      date: () => ({ supported: Intl.DateTimeFormat.supportedLocalesOf([locale]).length === 1, resolved: new Intl.DateTimeFormat(locale).resolvedOptions().locale }),
      number: () => ({ supported: Intl.NumberFormat.supportedLocalesOf([locale]).length === 1, resolved: new Intl.NumberFormat(locale).resolvedOptions().locale }),
      relativeTime: () => ({ supported: Intl.RelativeTimeFormat.supportedLocalesOf([locale]).length === 1, resolved: new Intl.RelativeTimeFormat(locale).resolvedOptions().locale }),
      plural: () => ({ supported: Intl.PluralRules.supportedLocalesOf([locale]).length === 1, resolved: new Intl.PluralRules(locale).resolvedOptions().locale }),
    };
    const { supported, resolved } = probes[capability]();
    return { supported, requested: locale, resolved: supported ? resolved : null };
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