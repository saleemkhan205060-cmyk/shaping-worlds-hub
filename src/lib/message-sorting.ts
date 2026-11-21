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
  T extends { peer: string; last: { created_at: string } },
>(
  conversations: readonly T[],
  statuses: Readonly<Record<string, Status>>,
): T[] {
  return [...conversations].sort((a, b) => {
    const aOnline = isPeerOnline(statuses, a.peer) ? 1 : 0;
    const bOnline = isPeerOnline(statuses, b.peer) ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    return (
      new Date(b.last.created_at).getTime() -
      new Date(a.last.created_at).getTime()
    );
  });
}