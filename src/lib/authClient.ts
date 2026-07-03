// Client-side helpers for the account API. The session itself lives in an
// httpOnly cookie, so "who am I" is always answered by the server.

export interface AccountUser {
  id: string;
  username: string;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  avatar: string | null;
  role: "user" | "mod" | "admin";
  mutedUntil: number | null;
  bio: string | null;
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

export async function register(username: string, password: string) {
  return expectUser(await post("/api/auth/register", { username, password }));
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
