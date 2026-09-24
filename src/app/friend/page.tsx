// "Play a Friend" lives inside the lobby's Friends tab, so /friend redirects
// to /lobby?tab=friends on the server (F037). It used to be a client shim
// that painted a headerless "Opening the lobby…" page and then called
// router.replace, which every bell link and old share link went through.
// Shared join links (?code=...), direct challenges (?challenge=...) and mode
// links (?mode=...) are carried over so the Friends tab picks up where the old
// page left off (auto-opening the join flow when a code is present).

import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export default async function FriendRedirect({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const out = new URLSearchParams();
  out.set("tab", "friends");
  for (const key of ["code", "challenge", "mode"] as const) {
    const value = first(params[key]);
    if (value) out.set(key, value);
  }
  redirect(`/lobby?${out.toString()}`);
}
