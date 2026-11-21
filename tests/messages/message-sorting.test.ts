import { expect, test } from "bun:test";
import {
  isPeerOnline,
  sortConversationsByPresence,
} from "../../src/lib/message-sorting";
import type { Status } from "../../src/lib/presence";

test("places online users above offline users even when an offline chat is newer", () => {
  const items = [
    { peer: "offline-newest", last: { created_at: "2026-11-21T12:00:00.000Z" } },
    { peer: "online-older", last: { created_at: "2026-11-20T08:00:00.000Z" } },
  ];
  const statuses: Record<string, Status> = { "online-older": "online" };

  expect(sortConversationsByPresence(items, statuses).map((c) => c.peer)).toEqual([
    "online-older",
    "offline-newest",
  ]);
});

test("sorts within online and offline groups by latest message, newest first", () => {
  const items = [
    { peer: "off-old", last: { created_at: "2026-11-18T10:00:00.000Z" } },
    { peer: "on-old", last: { created_at: "2026-11-19T10:00:00.000Z" } },
    { peer: "off-new", last: { created_at: "2026-11-21T10:00:00.000Z" } },
    { peer: "on-new", last: { created_at: "2026-11-20T10:00:00.000Z" } },
  ];
  const statuses: Record<string, Status> = {
    "on-old": "online",
    "on-new": "online",
  };

  expect(sortConversationsByPresence(items, statuses).map((c) => c.peer)).toEqual([
    "on-new",
    "on-old",
    "off-new",
    "off-old",
  ]);
});

test("keeps busy and do-not-disturb users in the single online group without separate groups", () => {
  const items = [
    { peer: "user-online", last: { created_at: "2026-11-21T07:00:00.000Z" } },
    { peer: "user-busy", last: { created_at: "2026-11-21T08:00:00.000Z" } },
    { peer: "user-dnd", last: { created_at: "2026-11-21T09:00:00.000Z" } },
    { peer: "user-offline", last: { created_at: "2026-11-21T10:00:00.000Z" } },
  ];
  const statuses: Record<string, Status> = {
    "user-online": "online",
    "user-busy": "busy",
    "user-dnd": "dnd",
  };

  expect(isPeerOnline(statuses, "user-online")).toBe(true);
  expect(isPeerOnline(statuses, "user-busy")).toBe(true);
  expect(isPeerOnline(statuses, "user-dnd")).toBe(true);
  expect(isPeerOnline(statuses, "user-offline")).toBe(false);
  expect(isPeerOnline(statuses, "toString")).toBe(false);

  expect(sortConversationsByPresence(items, statuses).map((c) => c.peer)).toEqual([
    "user-dnd",
    "user-busy",
    "user-online",
    "user-offline",
  ]);
});