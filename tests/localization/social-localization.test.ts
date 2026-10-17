import { describe, expect, test } from "bun:test";
import { dictionaryIssues } from "../../src/lib/i18n-core";
import { notifEnglish } from "../../src/lib/locales/notif-en";
import { notifUrdu } from "../../src/lib/locales/notif-ur";
import { notifSwedish } from "../../src/lib/locales/notif-sv";
import { profileEnglish } from "../../src/lib/locales/profile-en";
import { profileUrdu } from "../../src/lib/locales/profile-ur";
import { profileSwedish } from "../../src/lib/locales/profile-sv";
import { msgEnglish } from "../../src/lib/locales/msg-en";
import { msgUrdu } from "../../src/lib/locales/msg-ur";
import { msgSwedish } from "../../src/lib/locales/msg-sv";

describe("notifications dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(notifEnglish, notifUrdu)).toEqual([]);
    expect(dictionaryIssues(notifEnglish, notifSwedish)).toEqual([]);
  });

  test("elapsed-time wrapper keeps the time parameter", () => {
    expect(notifEnglish["notif.ago"]).toContain("{time}");
  });
});

describe("profile dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(profileEnglish, profileUrdu)).toEqual([]);
    expect(dictionaryIssues(profileEnglish, profileSwedish)).toEqual([]);
  });

  test("moderation rejections keep the reason parameter", () => {
    expect(profileEnglish["profile.coverRejected"]).toContain("{reason}");
    expect(profileEnglish["profile.avatarRejected"]).toContain("{reason}");
  });
});

describe("messages dictionaries", () => {
  test("urdu and swedish drafts match the english source exactly", () => {
    expect(dictionaryIssues(msgEnglish, msgUrdu)).toEqual([]);
    expect(dictionaryIssues(msgEnglish, msgSwedish)).toEqual([]);
  });

  test("parameterized messages keep their parameters", () => {
    expect(msgEnglish["msg.sendFailed"]).toContain("{reason}");
    expect(msgEnglish["msg.blocked"]).toContain("{kind}");
    expect(msgEnglish["msg.blocked"]).toContain("{reason}");
    expect(msgEnglish["msg.openProfile"]).toContain("{name}");
    expect(msgEnglish["msg.previewBefore"]).toContain("{size}");
  });
});
