// Server side of the display cookie (src/lib/session/who.ts): every auth
// route that changes who the session belongs to stamps or clears it here, so
// the next page render can draw the right header before /api/auth/me runs.

import { hintFor, whoCookieHeader, type SessionHint } from "@/lib/session/who";

type HintRow = { username: string; avatar: string | null; role: string; is_guest: number | boolean };

export function hintFromRow(row: HintRow): SessionHint {
  return hintFor({ username: row.username, avatar: row.avatar, role: row.role, isGuest: !!row.is_guest });
}

/** Look the account up and return its Set-Cookie value (null hint when gone). */
export async function whoCookieFor(db: D1Database, userId: string, secure: boolean): Promise<string> {
  const row = await db
    .prepare("SELECT username, avatar, role, is_guest FROM users WHERE id = ?")
    .bind(userId)
    .first<HintRow>();
  return whoCookieHeader(row ? hintFromRow(row) : null, secure);
}

export function clearWhoCookie(secure: boolean): string {
  return whoCookieHeader(null, secure);
}
