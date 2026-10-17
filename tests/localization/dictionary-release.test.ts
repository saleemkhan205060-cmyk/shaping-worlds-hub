import { expect, test } from "bun:test";
import { APPROVED_LANGUAGE_TARGETS } from "../../src/lib/country-languages";
import { dictionaryReleaseBlockers } from "../../src/lib/i18n-release";
import { SOURCE_DICTIONARY, STAGED_DICTIONARIES } from "../../src/lib/locales/staged";

test("all 92 targets require actual dictionaries, not just ready status flags", () => {
  const blockers = dictionaryReleaseBlockers(SOURCE_DICTIONARY, STAGED_DICTIONARIES);
  expect(blockers.filter((item) => item.endsWith(":missing-bundled-dictionary"))).toHaveLength(75);
  expect(blockers).toContain("ur:missing:share.sentTo");
});

test("copied English cannot count as completed translation without explicit review", () => {
  const copies = Object.fromEntries(APPROVED_LANGUAGE_TARGETS.map(({ code }) => [code, { action: "Save" }]));
  expect(dictionaryReleaseBlockers({ action: "Save" }, copies).filter((item) => item.includes(":unreviewed-identical:"))).toHaveLength(91);
  expect(dictionaryReleaseBlockers({ action: "Save" }, copies, { ur: ["action"] })).not.toContain("ur:unreviewed-identical:action");
});

test("empty source and dropped user-content parameters block release", () => {
  expect(dictionaryReleaseBlockers({}, {})).toContain("source:empty-dictionary");
  expect(dictionaryReleaseBlockers({ sent: "Sent to {actor}" }, { ur: { sent: "بھیج دیا" } })).toContain("ur:parameters:sent");
});