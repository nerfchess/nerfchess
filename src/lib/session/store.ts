// The one client-side record of "who am I", shared by every component.
//
// Before this, each consumer (the header, the mobile menu, the achievement
// toast, pages) fetched /api/auth/me on its own and kept its own copy, so a
// page load made 5 to 14 /me calls and the copies disagreed (the header showed
// the freshly minted guest while the mobile menu still said Sign in).
// authClient publishes every /me answer here; components read it with
// useSession (src/lib/session/SessionProvider.tsx).
//
// `undefined` = not known yet, `null` = the server says signed out.

import type { AccountUser } from "@/lib/authClient";

type Listener = () => void;

let current: AccountUser | null | undefined = undefined;
const listeners = new Set<Listener>();

export function getSessionUser(): AccountUser | null | undefined {
  return current;
}

/** Server snapshot: the server never knows the full user, only the hint. */
export function getServerSessionUser(): AccountUser | null | undefined {
  return undefined;
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Publish a new answer. A transport failure (`undefined`) never overwrites
 *  a known answer: an account we could not reach is still that account. */
export function publishSessionUser(user: AccountUser | null | undefined): void {
  if (typeof window === "undefined") return;
  if (user === undefined && current !== undefined) return;
  if (user === current) return;
  current = user;
  for (const l of [...listeners]) l();
}

/** Forget the answer (sign out, account switch) so the next read refetches. */
export function resetSessionUser(next: AccountUser | null | undefined = undefined): void {
  if (typeof window === "undefined") return;
  current = next;
  for (const l of [...listeners]) l();
}
