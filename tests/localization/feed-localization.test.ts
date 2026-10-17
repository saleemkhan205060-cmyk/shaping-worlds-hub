import { expect, test } from "bun:test";
import { feedElapsedMessage } from "../../src/lib/feed-localization";
import { dictionaryIssues, interpolate } from "../../src/lib/i18n-core";
import { feedEnglish } from "../../src/lib/locales/feed-en";
import { feedUrdu } from "../../src/lib/locales/feed-ur";
import { feedSwedish } from "../../src/lib/locales/feed-sv";

test("feed elapsed-time extraction retains existing thresholds", () => {
  const now = Date.UTC(2026, 9, 17);
  for (const [seconds, key, count] of [
    [59, "seconds", 59], [60, "minutes", 1], [3600, "hours", 1],
    [86400, "days", 1], [2592000, "months", 1], [31104000, "years", 1],
  ] as const) {
    expect(feedElapsedMessage(new Date(now - seconds * 1000).toISOString(), now)).toEqual({ key: `feed.time.${key}`, count });
  }
});

test("feed drafts preserve original error details and every parameter", () => {
  expect(dictionaryIssues(feedEnglish, feedUrdu)).toEqual([]);
  expect(dictionaryIssues(feedEnglish, feedSwedish)).toEqual([]);
  expect(interpolate(feedUrdu["feed.postFailed"], { reason: "اصل error message" })).toContain("\u2068اصل error message\u2069");
});