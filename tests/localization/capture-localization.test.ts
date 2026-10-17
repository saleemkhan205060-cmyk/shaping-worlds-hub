import { describe, expect, test } from "bun:test";
import { dictionaryIssues } from "../../src/lib/i18n-core";
import { captureEnglish } from "../../src/lib/locales/capture-en";
import { captureUrdu } from "../../src/lib/locales/capture-ur";
import { captureSwedish } from "../../src/lib/locales/capture-sv";
import { searchEnglish } from "../../src/lib/locales/search-en";
import { searchUrdu } from "../../src/lib/locales/search-ur";
import { searchSwedish } from "../../src/lib/locales/search-sv";
import { accountEnglish } from "../../src/lib/locales/account-en";
import { accountUrdu } from "../../src/lib/locales/account-ur";
import { accountSwedish } from "../../src/lib/locales/account-sv";

describe("capture dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(captureEnglish, captureUrdu)).toEqual([]);
    expect(dictionaryIssues(captureEnglish, captureSwedish)).toEqual([]);
  });

  test("all camera filter presets have display keys", () => {
    const ids = ["normal", "vivid", "warm", "cool", "bw", "vintage", "dramatic", "fade", "noir", "pink", "neon", "sunset", "lush", "mint", "berry", "ocean", "honey", "mono", "polaroid", "cinema"];
    for (const id of ids) expect(captureEnglish[`capture.filter.${id}`]).toBeTruthy();
  });

  test("camera error messages keep the reason parameter", () => {
    expect(captureEnglish["capture.unavailable"]).toContain("{reason}");
    expect(captureUrdu["capture.unavailable"]).toContain("{reason}");
    expect(captureSwedish["capture.unavailable"]).toContain("{reason}");
  });
});

describe("search dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(searchEnglish, searchUrdu)).toEqual([]);
    expect(dictionaryIssues(searchEnglish, searchSwedish)).toEqual([]);
  });

  test("no-results message keeps the query parameter", () => {
    expect(searchEnglish["search.noResults"]).toContain("{q}");
  });
});

describe("account-edit dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(accountEnglish, accountUrdu)).toEqual([]);
    expect(dictionaryIssues(accountEnglish, accountSwedish)).toEqual([]);
  });

  test("stored select values stay canonical english", () => {
    // Display keys exist; the stored values (Male, Single, Islam, Private) are not keys.
    expect(accountEnglish["accountEdit.gender.male"]).toBe("Male");
    expect(accountEnglish["accountEdit.marital.single"]).toBe("Single");
    expect(accountEnglish["accountEdit.religion.islam"]).toBe("Islam");
    expect(accountEnglish["accountEdit.email.private"]).toBe("Private");
  });
});
