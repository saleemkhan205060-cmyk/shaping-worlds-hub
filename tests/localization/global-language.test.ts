import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import baseline from "./country-baseline.json";
import approvedMapping from "./approved-mapping.json";
import { APPROVED_COUNTRY_LANGUAGES, APPROVED_LANGUAGE_TARGETS } from "../../src/lib/country-languages";
import { dictionaryIssues, interpolate, resolveMessage } from "../../src/lib/i18n-core";
import { globalTranslationBlockers, type LocaleReadiness } from "../../src/lib/i18n-release";
import { LOCALE_READINESS, RELEASE_EVIDENCE } from "../../src/lib/locales/readiness";
import { formattingSupport, localizedNumber, localizedPlural } from "../../src/lib/i18n-format";

describe("approved country policy", () => {
  test("keeps all 195 original country names and ISO codes", () => {
    expect(APPROVED_COUNTRY_LANGUAGES).toHaveLength(195);
    expect(new Set(APPROVED_COUNTRY_LANGUAGES.map((row) => row.iso)).size).toBe(195);
    expect(new Set(APPROVED_COUNTRY_LANGUAGES.map((row) => row.country)).size).toBe(195);
    expect(APPROVED_COUNTRY_LANGUAGES.map(({ country, iso }) => ({ country, iso })))
      .toEqual(baseline.map(({ country, iso }) => ({ country, iso })));
  });
  test("exactly matches every approved country default", () => {
    expect(APPROVED_COUNTRY_LANGUAGES).toEqual(approvedMapping);
  });
  test("has all 92 targets and no unsupported country mapping", () => {
    const codes = APPROVED_LANGUAGE_TARGETS.map((language) => language.code);
    expect(codes).toHaveLength(92);
    expect(new Set(codes).size).toBe(92);
    expect([...new Set(APPROVED_COUNTRY_LANGUAGES.map((row) => row.lang))].sort()).toEqual([...codes].sort());
  });
  test("retains all 17 existing saved language codes", () => {
    const codes = new Set<string>(APPROVED_LANGUAGE_TARGETS.map((language) => language.code));
    for (const code of ["en", "es", "fr", "pt", "de", "it", "ar", "ur", "hi", "bn", "tr", "ru", "zh", "ja", "ko", "id", "sw"]) expect(codes.has(code)).toBe(true);
  });
  test("does not activate revised defaults in the live country selector", () => {
    const source = readFileSync(new URL("../../src/components/Layout.tsx", import.meta.url), "utf8");
    const live = Array.from(source.matchAll(/\{ country: "([^"]+)", lang: "([^"]+)", iso: "([^"]+)" \}/g), (match) => ({ country: match[1], lang: match[2], iso: match[3] }));
    expect(live).toEqual(baseline);
  });
  test("assigns text-only RTL to the six approved targets", () => {
    expect(APPROVED_LANGUAGE_TARGETS.filter((target) => target.direction === "rtl").map((target) => target.code).sort())
      .toEqual(["ar", "dv", "fa", "fa-AF", "he", "ur"]);
  });
});

describe("translation safety and quality gates", () => {
  test("preserves interpolated user content verbatim with bidi isolation", () => {
    const name = "Saleem خان";
    expect(interpolate("{actor}", { actor: name })).toBe(`\u2068${name}\u2069`);
    expect(() => interpolate("{actor}")).toThrow("Missing translation parameter");
  });
  test("fails missing keys rather than counting fallback as completeness", () => {
    expect(dictionaryIssues({ save: "Save", title: "Hello {actor}" }, { save: "Guardar" })).toEqual(["missing:title"]);
    expect(resolveMessage({}, { save: "Save" }, "save").usedFallback).toBe(true);
  });
  test("rejects dropped placeholders, empty values and mismatched plural shapes", () => {
    expect(dictionaryIssues({ welcome: "Hello {actor}" }, { welcome: "Bonjour" })).toContain("parameters:welcome");
    expect(dictionaryIssues({ save: "Save" }, { save: " " })).toContain("empty:save");
    expect(dictionaryIssues({ count: { one: "{count} message", other: "{count} messages" } }, { count: "Messages" })).toContain("shape:count");
  });
  test("uses complete plural templates without translating parameter values", () => {
    expect(resolveMessage({ count: { one: "{count} Nachricht", other: "{count} Nachrichten" } }, {}, "count", { count: 2 }, "other"))
      .toEqual({ text: "\u20682\u2069 Nachrichten", usedFallback: false });
  });
  test("refuses unsupported formatter locales instead of implicit English", () => {
    expect(formattingSupport("zz-ZZ", "number").supported).toBe(false);
    expect(() => localizedNumber("zz-ZZ", 2)).toThrow("Reviewed bundled formatting data required");
    expect(localizedPlural("en", 1)).toBe("one");
    expect(localizedPlural("en", 2)).toBe("other");
  });
  test("blocks a 17-language partial rollout", () => {
    const existing = new Set(baseline.map((row) => row.lang));
    const partial = LOCALE_READINESS.filter((row) => existing.has(row.code)).map((row) => ({ ...row, dictionaryComplete: true }));
    const blockers = globalTranslationBlockers(partial, RELEASE_EVIDENCE);
    expect(blockers.filter((item) => item.endsWith(":expected-one-dictionary"))).toHaveLength(75);
  });
  test("requires review, legal content and actual physical Android evidence", () => {
    const complete: LocaleReadiness[] = APPROVED_LANGUAGE_TARGETS.map(({ code }) => ({ code, dictionaryComplete: true, terminologyReviewed: true, nativeSpeakerReviewed: true, formattingReviewed: true, uiVerified: true }));
    expect(globalTranslationBlockers(complete, { inventoryApproved: true, legalApproved: true, artworkApproved: true, webRegressionPassed: true, physicalAndroidPassed: false }))
      .toEqual(["release:physicalAndroidPassed"]);
    expect(globalTranslationBlockers(complete, { inventoryApproved: true, legalApproved: true, artworkApproved: true, webRegressionPassed: true, physicalAndroidPassed: true })).toEqual([]);
    complete[0].nativeSpeakerReviewed = false;
    expect(globalTranslationBlockers(complete, { ...RELEASE_EVIDENCE, physicalAndroidPassed: true })).toContain("am:nativeSpeakerReviewed");
  });
});