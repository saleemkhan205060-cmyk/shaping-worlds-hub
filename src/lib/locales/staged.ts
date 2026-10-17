import { LEGACY_TRANSLATIONS } from "./legacy";
import { appEnglish } from "./app-en";
import type { Dictionary } from "../i18n-core";
import { dictionary as sv } from "./sv";
import { appUrdu } from "./app-ur";

// An absent dictionary stays absent: never seed other languages with English.
export const STAGED_DICTIONARIES: Readonly<Record<string, Dictionary>> = {
  ...LEGACY_TRANSLATIONS,
  en: { ...LEGACY_TRANSLATIONS.en, ...appEnglish },
  ur: { ...LEGACY_TRANSLATIONS.ur, ...appUrdu },
  sv,
};
export const SOURCE_DICTIONARY = STAGED_DICTIONARIES.en;