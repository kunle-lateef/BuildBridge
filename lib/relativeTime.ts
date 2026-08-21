/** "10m ago" / "3h ago" for anything within a day, falling back to the date after that. */
export function formatRelativeTime(at: string | Date): string {
  const date = new Date(at);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
