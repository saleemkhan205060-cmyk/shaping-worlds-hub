import { APPROVED_LANGUAGE_TARGETS, APPROVED_COUNTRY_LANGUAGES } from "./country-languages";
import { dictionaryIssues, type Dictionary } from "./i18n-core";

export type LocaleReadiness = {
  code: string;
  dictionaryComplete: boolean;
  terminologyReviewed: boolean;
  nativeSpeakerReviewed: boolean;
  formattingReviewed: boolean;
  uiVerified: boolean;
};

export type ReleaseEvidence = {
  inventoryApproved: boolean;
  legalApproved: boolean;
  artworkApproved: boolean;
  webRegressionPassed: boolean;
  physicalAndroidPassed: boolean;
};

/** All approved targets roll out together; fallback and partial coverage never pass. */
export function globalTranslationBlockers(locales: readonly LocaleReadiness[], evidence: ReleaseEvidence): string[] {
  const blockers: string[] = [];
  const targets = new Set<string>(APPROVED_LANGUAGE_TARGETS.map((language) => language.code));
  for (const target of targets) {
    const matching = locales.filter((locale) => locale.code === target);
    if (matching.length !== 1) { blockers.push(`${target}:expected-one-dictionary`); continue; }
    const locale = matching[0];
    for (const check of ["dictionaryComplete", "terminologyReviewed", "nativeSpeakerReviewed", "formattingReviewed", "uiVerified"] as const) {
      if (!locale[check]) blockers.push(`${target}:${check}`);
    }
  }
  for (const locale of locales) if (!targets.has(locale.code)) blockers.push(`${locale.code}:unapproved-target`);
  for (const country of APPROVED_COUNTRY_LANGUAGES) {
    if (!targets.has(country.lang)) blockers.push(`${country.iso}:unsupported-default`);
  }
  for (const [check, passed] of Object.entries(evidence)) if (!passed) blockers.push(`release:${check}`);
  return blockers;
}

/** Status flags cannot certify missing files, copied English, or broken parameters. */
export function dictionaryReleaseBlockers(
  english: Dictionary,
  dictionaries: Readonly<Record<string, Dictionary>>,
  identicalTextApprovals: Readonly<Record<string, readonly string[]>> = {},
): string[] {
  const blockers: string[] = [];
  if (!Object.keys(english).length) blockers.push("source:empty-dictionary");
  for (const { code } of APPROVED_LANGUAGE_TARGETS) {
    const dictionary = dictionaries[code];
    if (!dictionary) { blockers.push(`${code}:missing-bundled-dictionary`); continue; }
    for (const issue of dictionaryIssues(english, dictionary)) blockers.push(`${code}:${issue}`);
    if (code === "en") continue;
    const approved = new Set(identicalTextApprovals[code] ?? []);
    for (const [key, original] of Object.entries(english)) {
      if (dictionary[key] !== undefined && JSON.stringify(dictionary[key]) === JSON.stringify(original) && !approved.has(key)) {
        blockers.push(`${code}:unreviewed-identical:${key}`);
      }
    }
  }
  const targets = new Set<string>(APPROVED_LANGUAGE_TARGETS.map(({ code }) => code));
  for (const code of Object.keys(dictionaries)) if (!targets.has(code)) blockers.push(`${code}:unapproved-bundled-dictionary`);
  return blockers;
}