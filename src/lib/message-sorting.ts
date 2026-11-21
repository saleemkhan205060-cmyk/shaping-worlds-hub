import type { Status } from "@/lib/presence";

export function isPeerOnline(
  statuses: Readonly<Record<string, Status>>,
  peerId: string,
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(statuses, peerId) &&
    Boolean(statuses[peerId])
  );
}

export function sortConversationsByPresence<
  T extends { peer: string; last: { created_at: string } | null },
>(
  conversations: readonly T[],
  statuses: Readonly<Record<string, Status>>,
  activePeerId?: string | null,
): T[] {
  const time = (c: T) =>
    c.last ? new Date(c.last.created_at).getTime() : 0;
  return [...conversations].sort((a, b) => {
    if (activePeerId) {
      const aActive = a.peer === activePeerId ? 1 : 0;
      const bActive = b.peer === activePeerId ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
    }
    const aOnline = isPeerOnline(statuses, a.peer) ? 1 : 0;
    const bOnline = isPeerOnline(statuses, b.peer) ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    return time(b) - time(a);
  });
}
