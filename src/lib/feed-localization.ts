/** Keep the existing feed's compact elapsed-time thresholds unchanged. */
export function feedElapsedMessage(dateStr: string, now: number): { key: string; count: number } {
  const seconds = Math.floor((now - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return { key: "feed.time.seconds", count: seconds };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { key: "feed.time.minutes", count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "feed.time.hours", count: hours };
  const days = Math.floor(hours / 24);
  if (days < 30) return { key: "feed.time.days", count: days };
  const months = Math.floor(days / 30);
  if (months < 12) return { key: "feed.time.months", count: months };
  return { key: "feed.time.years", count: Math.floor(months / 12) };
}