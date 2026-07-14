// Client-side helpers for the account API. The session itself lives in an
// httpOnly cookie, so "who am I" is always answered by the server.

export interface AccountUser {
  id: string;
  username: string;
  /** Legacy shared rating column (frozen since the per-category switch); only
   *  useful as a seed-fallback value. DISPLAY displayRating instead. */
  rating: number;
  /** The rating to show for this account with no category context: best live
   *  mode bucket (nerf/buff), falling back to the legacy column — the same
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

export async function register(username: string, password: string, email?: string, turnstileToken?: string) {
  return expectUser(
    await post("/api/auth/register", {
      username,
      password,
      email: email || undefined,
      turnstileToken: turnstileToken || undefined,
    }),
  );
}

export async function login(username: string, password: string) {
  return expectUser(await post("/api/auth/login", { username, password }));
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout", {});
}

export async function fetchMe(): Promise<AccountUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AccountUser | null };
    return data.user;
  } catch {
    return null;
  }
}

// One guest-creation attempt per page load, shared across components.
let guestPromise: Promise<AccountUser | null> | null = null;

/** Who am I, creating an instant guest account on the first visit. */
export async function ensureAccount(): Promise<AccountUser | null> {
  const me = await fetchMe();
  if (me) return me;
  if (!guestPromise) {
    guestPromise = (async () => {
      try {
        const res = await post("/api/auth/guest", {});
        if (!res.ok) return null;
        return await fetchMe();
      } catch {
        return null;
      }
    })();
  }
  return guestPromise;
}
