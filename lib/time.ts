// Compact relative time: "now", "5m", "3h", "2d", "4w", then a date.
export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 2419200) return `${Math.floor(s / 604800)}w`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
