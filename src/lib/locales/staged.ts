import { LEGACY_TRANSLATIONS } from "./legacy";
import { appEnglish } from "./app-en";
import type { Dictionary } from "../i18n-core";
import { dictionary as sv } from "./sv";
import { appUrdu } from "./app-ur";
import { mediaEnglish } from "./media-en";
import { mediaUrdu } from "./media-ur";
import { mediaSwedish } from "./media-sv";
import { accountEnglish } from "./account-en";
import { accountUrdu } from "./account-ur";
import { accountSwedish } from "./account-sv";
import { uploadEnglish } from "./upload-en";
import { uploadUrdu } from "./upload-ur";
import { uploadSwedish } from "./upload-sv";
import { feedEnglish } from "./feed-en";
import { feedUrdu } from "./feed-ur";
import { feedSwedish } from "./feed-sv";
import { captureEnglish } from "./capture-en";
import { captureUrdu } from "./capture-ur";
import { captureSwedish } from "./capture-sv";
import { searchEnglish } from "./search-en";
import { searchUrdu } from "./search-ur";
import { searchSwedish } from "./search-sv";
import { notifEnglish } from "./notif-en";
import { notifUrdu } from "./notif-ur";
import { notifSwedish } from "./notif-sv";

// An absent dictionary stays absent: never seed other languages with English.
export const STAGED_DICTIONARIES: Readonly<Record<string, Dictionary>> = {
  ...LEGACY_TRANSLATIONS,
  en: { ...LEGACY_TRANSLATIONS.en, ...appEnglish, ...mediaEnglish, ...accountEnglish, ...uploadEnglish, ...feedEnglish, ...captureEnglish, ...searchEnglish, ...notifEnglish },
  ur: { ...LEGACY_TRANSLATIONS.ur, ...appUrdu, ...mediaUrdu, ...accountUrdu, ...uploadUrdu, ...feedUrdu, ...captureUrdu, ...searchUrdu, ...notifUrdu },
  sv: { ...sv, ...mediaSwedish, ...accountSwedish, ...uploadSwedish, ...feedSwedish, ...captureSwedish, ...searchSwedish, ...notifSwedish },
};
export const SOURCE_DICTIONARY = STAGED_DICTIONARIES.en;