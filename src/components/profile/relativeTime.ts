// Shared "N ago" relative-time copy for the profile game modules. Several other
// surfaces (SiteHeader, community, clubs, PresenceBadge) each carry a private
// copy of the same short-form helper; this is the extracted version the profile
// CurrentGameCard / RecentGameCard share. Kept framework-free (a plain function,
// `now` injectable for tests) so it runs inside any client component.
export function relativeTime(at: number, now: number = Date.now()): string {
  const s = Math.max(1, Math.floor((now - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
