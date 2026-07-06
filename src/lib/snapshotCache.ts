// Tiny sessionStorage snapshot cache: pages that poll (lobby, queue card)
// paint their LAST known data instantly on mount and let the live fetch
// replace it a beat later, instead of holding a skeleton through the first
// round-trip. Session-scoped on purpose: stale-forever data never survives
// the tab, and sign-in state changes within a tab overwrite on next fetch.

export function readSnapshot<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSnapshot(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function clearSnapshot(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
