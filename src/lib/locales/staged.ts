import { LEGACY_TRANSLATIONS } from "./legacy";
import { appEnglish } from "./app-en";
import type { Dictionary } from "../i18n-core";

// An absent dictionary stays absent: never seed other languages with English.
export const STAGED_DICTIONARIES: Readonly<Record<string, Dictionary>> = {
  ...LEGACY_TRANSLATIONS,
  en: { ...LEGACY_TRANSLATIONS.en, ...appEnglish },
};
export const SOURCE_DICTIONARY = STAGED_DICTIONARIES.en;