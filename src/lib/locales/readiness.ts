import { APPROVED_LANGUAGE_TARGETS } from "../country-languages";
import type { LocaleReadiness, ReleaseEvidence } from "../i18n-release";

// No target is release-ready until full-app integration and independent review pass.
export const LOCALE_READINESS: readonly LocaleReadiness[] = APPROVED_LANGUAGE_TARGETS.map(({ code }) => ({
  code, dictionaryComplete: false, terminologyReviewed: false, nativeSpeakerReviewed: false, formattingReviewed: false, uiVerified: false,
}));

export const RELEASE_EVIDENCE: ReleaseEvidence = {
  inventoryApproved: false, legalApproved: false, artworkApproved: false, webRegressionPassed: false, physicalAndroidPassed: false,
};
