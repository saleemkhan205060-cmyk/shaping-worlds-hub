import { APPROVED_LANGUAGE_TARGETS, APPROVED_COUNTRY_LANGUAGES } from "./country-languages";

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