import { expect, test } from "bun:test";
import { videoPickerErrorKey } from "../../src/lib/media-localization";
import { dictionaryIssues, interpolate } from "../../src/lib/i18n-core";
import { mediaEnglish } from "../../src/lib/locales/media-en";
import { mediaUrdu } from "../../src/lib/locales/media-ur";
import { mediaSwedish } from "../../src/lib/locales/media-sv";

test("known video errors localize without disguising unknown platform errors", () => {
  expect(videoPickerErrorKey("Couldn't capture frame")).toBe("media.captureFailed");
  expect(videoPickerErrorKey("Please pick an image")).toBe("media.pickImage");
  expect(videoPickerErrorKey("An unknown platform failure")).toBeUndefined();
  expect(videoPickerErrorKey("toString")).toBeUndefined();
});

test("draft media dictionaries preserve source shape and moderation reason parameters", () => {
  expect(dictionaryIssues(mediaEnglish, mediaUrdu)).toEqual([]);
  expect(dictionaryIssues(mediaEnglish, mediaSwedish)).toEqual([]);
  expect(interpolate(mediaUrdu["media.thumbnailRejected"], { reason: "original reason" })).toContain("\u2068original reason\u2069");
});