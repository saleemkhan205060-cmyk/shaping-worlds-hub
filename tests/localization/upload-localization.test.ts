import { expect, test } from "bun:test";
import { UPLOAD_CATEGORY_KEYS } from "../../src/lib/upload-localization";
import { dictionaryIssues, interpolate } from "../../src/lib/i18n-core";
import { uploadEnglish } from "../../src/lib/locales/upload-en";
import { uploadUrdu } from "../../src/lib/locales/upload-ur";
import { uploadSwedish } from "../../src/lib/locales/upload-sv";

test("translated categories retain canonical stored post values", () => {
  expect(Object.keys(UPLOAD_CATEGORY_KEYS)).toEqual(["For You", "Trending", "Music", "Food", "Travel"]);
  expect(UPLOAD_CATEGORY_KEYS["For You"]).toBe("upload.category.forYou");
  expect(UPLOAD_CATEGORY_KEYS.Travel).toBe("upload.category.travel");
});

test("upload drafts preserve parameters and original moderation reasons", () => {
  expect(dictionaryIssues(uploadEnglish, uploadUrdu)).toEqual([]);
  expect(dictionaryIssues(uploadEnglish, uploadSwedish)).toEqual([]);
  for (const dictionary of [uploadEnglish, uploadUrdu, uploadSwedish]) {
    expect(interpolate(dictionary["upload.videoBlocked"], { reason: "original reason وجہ" })).toContain("\u2068original reason وجہ\u2069");
    expect(() => interpolate(dictionary["upload.progress"])).toThrow("Missing translation parameter: progress");
  }
});