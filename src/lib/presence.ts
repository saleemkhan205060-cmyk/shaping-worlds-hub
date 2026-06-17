import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Status = "online" | "busy" | "dnd";

export const PRESENCE_STORAGE_KEY = "vip:my-status";

type Listener = (state: Record<string, Status>) => void;

let channel: ReturnType<typeof supabase.channel> | null = null;
let currentUid: string | null = null;
let currentStatus: Status = "online";
let cachedState: Record<string, Status> = {};
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l(cachedState);
}

function syncFromChannel() {
  if (!channel) return;
  const state = channel.presenceState() as Record<string, Array<{ status?: Status }>>;
  const next: Record<string, Status> = {};
  for (const [id, metas] of Object.entries(state)) {
    const s = metas[0]?.status;
    next[id] = s === "busy" || s === "dnd" ? s : "online";
  }
  cachedState = next;
  notify();
}

async function ensureChannel(uid: string) {
  if (channel && currentUid === uid) return;
  if (channel) {
    try {
      await channel.untrack();
    } catch {}
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUid = uid;
  const ch = supabase.channel("online-users", {
    config: { presence: { key: uid } },
  });
  channel = ch;
  ch.on("presence", { event: "sync" }, syncFromChannel)
    .on("presence", { event: "join" }, syncFromChannel)
    .on("presence", { event: "leave" }, syncFromChannel)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ status: currentStatus, online_at: new Date().toISOString() });
      }
    });
}

/** Mounts a global presence connection tied to the signed-in user.
 *  Call once at app/layout level. Stays connected across route changes;
 *  drops only when the tab/app is fully closed. */
export function useGlobalPresence(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem(PRESENCE_STORAGE_KEY) as Status | null)
      : null) || "online";
    currentStatus = stored;
    ensureChannel(userId);
  }, [userId]);
}

export function usePresenceState() {
  const [state, setState] = useState<Record<string, Status>>(cachedState);
  useEffect(() => {
    const l: Listener = (s) => setState(s);
    listeners.add(l);
    // Push current snapshot immediately
    l(cachedState);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

export async function setMyStatus(s: Status) {
  currentStatus = s;
  if (typeof window !== "undefined") localStorage.setItem(PRESENCE_STORAGE_KEY, s);
  if (channel) {
    await channel.track({ status: s, online_at: new Date().toISOString() });
  }
}

export function getMyStatus(): Status {
  if (typeof window === "undefined") return currentStatus;
  return ((localStorage.getItem(PRESENCE_STORAGE_KEY) as Status | null) || currentStatus || "online");
}
