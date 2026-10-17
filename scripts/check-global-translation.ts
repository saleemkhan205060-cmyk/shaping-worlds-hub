import { globalTranslationBlockers, dictionaryReleaseBlockers } from "../src/lib/i18n-release";
import { LOCALE_READINESS, RELEASE_EVIDENCE } from "../src/lib/locales/readiness";
import { SOURCE_DICTIONARY, STAGED_DICTIONARIES } from "../src/lib/locales/staged";

const blockers = [
  ...globalTranslationBlockers(LOCALE_READINESS, RELEASE_EVIDENCE),
  ...dictionaryReleaseBlockers(SOURCE_DICTIONARY, STAGED_DICTIONARIES),
];
if (blockers.length) {
  console.error(`Global translation is NOT release-ready: ${blockers.length} unmet checks.`);
  console.error("Do not activate expanded country defaults or describe the app as fully translated.");
  console.error(blockers.join("\n"));
  process.exitCode = 1;
} else {
  console.log("All approved targets and global review/regression gates passed.");
}