import { dictionary as en } from "./en";
import { dictionary as es } from "./es";
import { dictionary as fr } from "./fr";
import { dictionary as pt } from "./pt";
import { dictionary as de } from "./de";
import { dictionary as it } from "./it";
import { dictionary as ar } from "./ar";
import { dictionary as ur } from "./ur";
import { dictionary as hi } from "./hi";
import { dictionary as bn } from "./bn";
import { dictionary as tr } from "./tr";
import { dictionary as ru } from "./ru";
import { dictionary as zh } from "./zh";
import { dictionary as ja } from "./ja";
import { dictionary as ko } from "./ko";
import { dictionary as id } from "./id";
import { dictionary as sw } from "./sw";

// Existing active languages only. Expanded targets remain behind the all-target gate.
export const LEGACY_TRANSLATIONS = { en, es, fr, pt, de, it, ar, ur, hi, bn, tr, ru, zh, ja, ko, id, sw } as const;
