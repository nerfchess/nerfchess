// Client-side helpers for the account API. The session itself lives in an
// httpOnly cookie, so "who am I" is always answered by the server.
//
// Every answer is published to the shared session store
// (src/lib/session/store.ts), and concurrent fetchMe() calls share one
// request, so a page that mounts several account-aware components makes one
// /api/auth/me call, not one per component. Components should read the user
// with useSession() (src/lib/session/SessionProvider.tsx) rather than calling
// fetchMe themselves.

import { publishSessionUser, resetSessionUser } from "@/lib/session/store";

export interface AccountUser {
  id: string;
  username: string;
  /** Legacy shared rating column (frozen since the per-category switch); only
   *  useful as a seed-fallback value. DISPLAY displayRating instead. */
  rating: number;
  /** The rating to show for this account with no category context: best live
   *  mode bucket (nerf/buff), falling back to the legacy column: the same
   *  number the lobby's online list, player search, and club lists resolve.
   *  Optional: older cached payloads may not carry it. */
  displayRating?: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  avatar: string | null;
  role: "user" | "mod" | "admin";
  mutedUntil: number | null;
  bio: string | null;
  flair: string | null;
  isGuest: boolean;
  /** True when a moderator flagged the username: the owner must rename via
   *  /api/auth/rename before playing on. Optional: older cached payloads. */
  nameFlagged?: boolean;
  email: string | null;
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function expectUser(res: Response): Promise<{ id: string; username: string }> {
  const data = (await res.json().catch(() => ({}))) as { id?: string; username?: string; error?: string };
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return { id: data.id!, username: data.username! };
}

// Session writes from this tab run one at a time, in order: a guest mint, a
// sign-in, a registration. Each response carries Set-Cookie for the session
// and the display cookie, so two in flight at once let the later response
// win, and on a first visit to /login the header's guest mint could land
// after the sign-in and silently turn the new account back into that guest
// (section 4: the next first paint drew the guest header).
let sessionWrites: Promise<unknown> = Promise.resolve();

function inOrder<T>(write: () => Promise<T>): Promise<T> {
  const run = sessionWrites.then(write, write);
  sessionWrites = run.catch(() => {});
  return run;
}

/**
 * A different account now owns the tab: /me answers already in flight were
 * asked with the old cookies, so they must not publish over the new account.
 * Starts a fresh request whose answer every mounted consumer follows. The old
 * answer stays on screen until then (dropping it first would fall back to the
 * stale server hint).
 */
function accountChanged(): void {
  meGeneration++;
  mePromise = null;
  void fetchMe();
}

export function register(username: string, password: string, email?: string, turnstileToken?: string) {
  return inOrder(async () => {
    const who = await expectUser(
      await post("/api/auth/register", {
        username,
        password,
        email: email || undefined,
        turnstileToken: turnstileToken || undefined,
      }),
    );
    accountChanged();
    return who;
  });
}

export function login(username: string, password: string) {
  return inOrder(async () => {
    const who = await expectUser(await post("/api/auth/login", { username, password }));
    accountChanged();
    return who;
  });
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout", {});
  // A /me asked before the logout would otherwise republish the old account.
  meGeneration++;
  mePromise = null;
  resetSessionUser(null);
}

/**
 * Who am I. `null` is a real signed-out answer (the server said so, or a
 * 401); `undefined` means the request failed in transit (offline, 5xx),
 * so the caller does not actually know and should not act as if signed out.
 */
let mePromise: Promise<AccountUser | null | undefined> | null = null;
/** Bumped when the account changes; an answer from an older one is dropped. */
let meGeneration = 0;

export function fetchMe(): Promise<AccountUser | null | undefined> {
  // One request in flight at a time, shared by every caller. A caller that
  // arrives after it settles gets a fresh request (pollers want fresh data).
  if (mePromise) return mePromise;
  const generation = meGeneration;
  const request = (async (): Promise<AccountUser | null | undefined> => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return null;
      if (!res.ok) return undefined;
      const data = (await res.json()) as { user: AccountUser | null };
      return data.user;
    } catch {
      return undefined;
    }
  })();
  mePromise = request;
  void request.then((user) => {
    if (mePromise === request) mePromise = null;
    if (generation === meGeneration) publishSessionUser(user);
  });
  return request;
}

// One guest-creation attempt per page load, shared across components.
let guestPromise: Promise<AccountUser | null | undefined> | null = null;

/**
 * Who am I, creating an instant guest account on the first visit. Passes
 * fetchMe's `undefined` (transport failure) through without minting a guest:
 * an existing account we merely could not reach must not be shadowed by a
 * throwaway one.
 */
export async function ensureAccount(): Promise<AccountUser | null | undefined> {
  const generation = meGeneration;
  const me = await fetchMe();
  if (me !== null) return me;
  if (!guestPromise) {
    guestPromise = (async () => {
      try {
        // The signed-out answer is stale once a sign-in or registration has
        // landed since it was asked: that account is the answer, no guest.
        const res = await inOrder(() =>
          generation === meGeneration ? post("/api/auth/guest", {}) : Promise.resolve(null),
        );
        if (res && !res.ok) return null;
        return await fetchMe();
      } catch {
        return null;
      }
    })();
  }
  return guestPromise;
}
