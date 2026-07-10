/// <reference types="@cloudflare/workers-types" />

// Shared pieces for the moderator "human games" views (/api/mod/games and
// /api/mod/games/stats): the SQL fragments that decide which archived games
// had at least one HUMAN seat, and the D1 lookup that tells a guest account
// apart from a registered member.
//
// A seat is a bot when its user id carries one of the non-human id prefixes:
//   hp_    the house-bot roster (src/lib/server/bots.ts HOUSE_ROSTER)
//   seed_  the retired seeded leaderboard accounts (migrations/0014)
// Everything else — a real account id (random hex), a guest account
// (users.is_guest = 1), or a NULL seat (anonymous player, never a server bot:
// local client-side bot games never reach the server) — is a human.
//
// The fragments are written in the shared D1/Postgres dialect the pgAll()
// helper expects: `?` placeholders and LIKE ... ESCAPE, which behave the same
// on SQLite and Postgres, so one query serves both storage paths.

const botSeat = (col: string): string =>
  `(${col} LIKE 'hp\\_%' ESCAPE '\\' OR ${col} LIKE 'seed\\_%' ESCAPE '\\')`;

const humanSeat = (col: string): string => `(${col} IS NULL OR NOT ${botSeat(col)})`;

/** WHERE fragment: at least one seat of the game was a human. */
export const HUMAN_GAME_SQL = `(${humanSeat("white_user_id")} OR ${humanSeat("black_user_id")})`;

/** WHERE fragment: BOTH seats were humans (human vs human). */
export const BOTH_HUMAN_SQL = `(${humanSeat("white_user_id")} AND ${humanSeat("black_user_id")})`;

/** WHERE fragment: this one seat (column name) was a bot. */
export const BOT_SEAT_SQL = botSeat;

export type SeatKind = "member" | "guest" | "anon" | "house";

/** Cheap id-shape classification (no DB): anon / house, or null when the id
 *  needs a users lookup to split member from guest. */
export function seatKindFromId(userId: string | null): SeatKind | null {
  if (!userId) return "anon";
  if (userId.startsWith("hp_") || userId.startsWith("seed_")) return "house";
  return null;
}

/** Look up is_guest for the given user ids on D1 (the users table lives there
 *  on both storage paths) and return the guest id set. Chunked to stay under
 *  D1's bound-parameter limit. Ids that no longer resolve to a users row are
 *  simply absent (treated as registered members by callers). */
export async function guestIdSet(db: D1Database, userIds: string[]): Promise<Set<string>> {
  const guests = new Set<string>();
  const unique = [...new Set(userIds)];
  for (let i = 0; i < unique.length; i += 90) {
    const chunk = unique.slice(i, i + 90);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = await db
      .prepare(`SELECT id FROM users WHERE is_guest = 1 AND id IN (${placeholders})`)
      .bind(...chunk)
      .all<{ id: string }>();
    for (const row of rows.results) guests.add(row.id);
  }
  return guests;
}

/** Full seat classification once the guest set is known. */
export function classifySeat(userId: string | null, guests: Set<string>): SeatKind {
  return seatKindFromId(userId) ?? (guests.has(userId!) ? "guest" : "member");
}

/** Move count from the space-joined UCI move text stored in games.moves. */
export function moveCountFromText(moves: unknown): number {
  if (typeof moves !== "string" || moves.length === 0) return 0;
  return moves.split(" ").length;
}
