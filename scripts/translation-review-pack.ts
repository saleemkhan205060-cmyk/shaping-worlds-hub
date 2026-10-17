import { readFileSync, writeFileSync } from "node:fs";
import { APPROVED_LANGUAGE_TARGETS } from "../src/lib/country-languages";
import { SOURCE_DICTIONARY, STAGED_DICTIONARIES } from "../src/lib/locales/staged";
import { dictionaryIssues } from "../src/lib/i18n-core";

const inventory = JSON.parse(readFileSync("localization/source-inventory.json", "utf8"));
const pack = {
  status: "incomplete-not-release-ready",
  scope: "All 92 approved targets; current source keys are not the complete app inventory.",
  sourceKeys: Object.entries(SOURCE_DICTIONARY).map(([key, source]) => ({
    key, source,
    locations: [
      ...inventory.translatedUses.filter((use: { key: string }) => use.key === key),
      ...(inventory.dynamicTranslatedUses ?? []).filter((use: { pattern: string }) => {
        const escaped = use.pattern.split("*").map((part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        return new RegExp(`^${escaped.join("[^.]+")}$`).test(key);
      }),
    ],
  })),
  targets: APPROVED_LANGUAGE_TARGETS.map(({ code, name, direction }) => ({
    code, name, direction,
    bundled: Boolean(STAGED_DICTIONARIES[code]),
    nativeSpeakerReviewed: false,
    issues: dictionaryIssues(SOURCE_DICTIONARY, STAGED_DICTIONARIES[code] ?? {}),
  })),
};
const serialized = JSON.stringify(pack, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync("localization/translation-review-pack.json", "utf8") !== serialized) throw new Error("Translation review pack is stale");
} else writeFileSync("localization/translation-review-pack.json", serialized);
console.log(`${pack.targets.length} targets; ${pack.sourceKeys.length} staged source keys; no completed-language claim.`);