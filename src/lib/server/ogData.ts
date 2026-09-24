// Server-side reads for the link previews and the dynamic routes' metadata:
// finished games, profiles, clubs, tournaments, invites, the leaderboard top.
//
// Every function returns only what the public page already shows to a
// signed-out visitor (names, ratings, results, counts), is bounded (a slow or
// missing data source answers null, never hangs an unfurl), and never throws:
// the caller renders a generic card on null, and the image renderer falls
// back to the brand card on anything else (src/lib/og/render.ts).

import type { DraftMode } from "@/engine/buff";
import type { Piece } from "@/engine/types";
import { buildSpectatorDraftGame } from "@/lib/draftOnline";
import { replayUci } from "@/lib/gameReview";
import { PROVISIONAL_RD } from "@/lib/glicko";
import { AVATARS, isAvatarId } from "@/lib/avatars";
import { getDb } from "@/lib/server/db";
import { getGameServerStub } from "@/lib/server/gameServer";
import { pgAll, pgFirst } from "@/lib/server/pg";
import { publicDraftReplayFromColumn } from "@/lib/server/publicDraftRecord";
import { CHALLENGE_TTL_MS } from "@/lib/server/social";
import { BUFF_BY_ID } from "@/lib/cardCodex";

/** Game codes and ids: queue and friend codes, and hex arena ids. */
export const GAME_ID_RE = /^[A-Z0-9]{4,12}$/;

function modeOf(value: unknown): "buff" | "nerf" | null {
  return value === "buff" || value === "nerf" ? value : null;
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error("[ogData]", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

export type GameSummary = {
  id: string;
  white: { name: string; rating: number | null };
  black: { name: string; rating: number | null };
  mode: "buff" | "nerf" | null;
  timeSec: number;
  incrementSec: number;
  rated: boolean;
  winner: "w" | "b" | "draw" | null;
  /** "king captured", "resignation", as stored. */
  reason: string | null;
  pieces: (Piece | null)[] | null;
  lastMove: number[];
  plies: number;
  live: boolean;
};

/** A finished game from the archive, with its final position rebuilt through
 *  the same engine path the replay viewer uses (/game/[id]). Finished games
 *  reveal both players' rules anyway; the card shows none of them. */
export async function archivedGame(rawId: string, opts: { position?: boolean } = {}): Promise<GameSummary | null> {
  const id = rawId.trim().toUpperCase();
  if (!GAME_ID_RE.test(id)) return null;
  return safe(async () => {
    const row = await pgFirst<Record<string, unknown>>(
      `SELECT id, white_name, black_name, time_sec, increment_sec, moves, winner, reason, rated,
              category, draft_record, white_rating_before, black_rating_before
       FROM games WHERE id = ?`,
      [id],
    );
    if (!row) return null;
    const uci = String(row.moves ?? "")
      .split(" ")
      .filter(Boolean);
    const replay = publicDraftReplayFromColumn(row.draft_record);
    const mode = modeOf(replay?.mode) ?? modeOf(row.category);
    let pieces: (Piece | null)[] | null = null;
    let lastMove: number[] = [];
    // Metadata needs names and the result only; the replay runs for the image.
    if (opts.position !== false) {
      try {
        if (replay) {
          const g = buildSpectatorDraftGame(uci, replay.dtActions ?? [], undefined, (replay.mode as DraftMode | undefined) ?? undefined);
          pieces = g.board.pieces;
          const last = g.board.history[g.board.history.length - 1];
          if (last) lastMove = [last.from, last.to];
        } else {
          const r = replayUci(uci);
          pieces = r.board.pieces;
          const last = r.history[r.history.length - 1];
          if (last) lastMove = [last.from, last.to];
        }
      } catch (err) {
        console.error("[ogData] replay failed", id, err);
      }
    }
    const winner = row.winner === "w" || row.winner === "b" || row.winner === "draw" ? row.winner : null;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : v == null ? null : Number(v) || null);
    return {
      id,
      white: { name: String(row.white_name ?? "White"), rating: num(row.white_rating_before) },
      black: { name: String(row.black_name ?? "Black"), rating: num(row.black_rating_before) },
      mode,
      timeSec: Number(row.time_sec) || 0,
      incrementSec: Number(row.increment_sec) || 0,
      // D1 stores 0/1; Postgres returns a boolean.
      rated: row.rated === true || Number(row.rated) === 1,
      winner,
      reason: typeof row.reason === "string" ? row.reason : null,
      pieces,
      lastMove,
      plies: uci.length,
      live: false,
    };
  });
}

type LobbyPlayers = { w?: { name?: string; rating?: number | null } | null; b?: { name?: string; rating?: number | null } | null };
type LobbyPayload = {
  liveGames?: { id: string; players?: LobbyPlayers; rated?: boolean; mode?: string; timeSec?: number; incrementSec?: number; moves?: number }[];
  challenges?: { id: string; host?: { name?: string; rating?: number | null }; rated?: boolean; mode?: string; timeSec?: number; incrementSec?: number }[];
};

/** The public lobby snapshot (the same payload /api/lobby serves), bounded to
 *  1.5 seconds. Null when the game server is unavailable (next dev, preview). */
async function lobby(): Promise<LobbyPayload | null> {
  return safe(async () => {
    const stub = getGameServerStub();
    if (!stub) return null;
    const res = await stub.fetch("https://game-server/lobby", { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return null;
    return (await res.json()) as LobbyPayload;
  });
}

/** A game in progress, from the public lobby snapshot: players, ratings, mode
 *  and clock, exactly as the lobby and TV list it. No position: the snapshot
 *  carries none, and the live board can hide cards (P-snapshot). */
export async function liveGame(rawId: string): Promise<GameSummary | null> {
  const id = rawId.trim().toUpperCase();
  if (!GAME_ID_RE.test(id)) return null;
  const snap = await lobby();
  const g = snap?.liveGames?.find((x) => x.id === id);
  if (!g) return null;
  return {
    id,
    white: { name: g.players?.w?.name ?? "White", rating: g.players?.w?.rating ?? null },
    black: { name: g.players?.b?.name ?? "Black", rating: g.players?.b?.rating ?? null },
    mode: modeOf(g.mode),
    timeSec: g.timeSec ?? 0,
    incrementSec: g.incrementSec ?? 0,
    rated: !!g.rated,
    winner: null,
    reason: null,
    pieces: null,
    lastMove: [],
    plies: g.moves ?? 0,
    live: true,
  };
}

export async function gameSummary(id: string, opts: { position?: boolean } = {}): Promise<GameSummary | null> {
  return (await archivedGame(id, opts)) ?? (await liveGame(id));
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export type InviteSummary = {
  code: string;
  from: string | null;
  rating: number | null;
  timeSec: number | null;
  incrementSec: number | null;
  mode: "buff" | "nerf" | null;
  rated: boolean | null;
  /** Direct challenge addressed to one player (only they can accept). */
  direct: boolean;
};

export const INVITE_CODE_RE = /^[A-Z0-9]{4,10}$/;

/** Who sent an invite code and on what terms: a direct challenge (D1
 *  challenges row, keyed by the game code) or an open friend game listed in
 *  the public lobby. Null when the code is unknown or expired. */
export async function inviteSummary(rawCode: string): Promise<InviteSummary | null> {
  const code = rawCode.trim().toUpperCase();
  if (!INVITE_CODE_RE.test(code)) return null;
  const [direct, snap] = await Promise.all([
    safe(async () => {
      const db = await getDb();
      return db
        .prepare(
          `SELECT from_name, time_sec, increment_sec, rated, created_at FROM challenges
           WHERE id = ? AND status = 'pending' AND created_at > ?`,
        )
        .bind(code, Date.now() - CHALLENGE_TTL_MS)
        .first<{ from_name: string; time_sec: number; increment_sec: number; rated: number; created_at: number }>();
    }),
    lobby(),
  ]);
  const open = snap?.challenges?.find((c) => c.id === code);
  if (!direct && !open) return null;
  return {
    code,
    from: direct?.from_name ?? open?.host?.name ?? null,
    rating: open?.host?.rating ?? null,
    timeSec: direct?.time_sec ?? open?.timeSec ?? null,
    incrementSec: direct?.increment_sec ?? open?.incrementSec ?? null,
    mode: modeOf(open?.mode),
    rated: direct ? !!direct.rated : open ? !!open.rated : null,
    direct: !!direct,
  };
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export type ProfileSummary = {
  username: string;
  guest: boolean;
  /** Preset avatar only; uploads and other images are not put in previews. */
  avatar: { piece: Piece["type"]; bg: string } | null;
  ratings: { mode: "buff" | "nerf"; rating: number; games: number; provisional: boolean }[];
  games: number;
  topCards: { name: string; tier: number }[];
  createdAt: number | null;
};

/** A public profile's headline numbers. Banned accounts and unknown names
 *  answer null (the page shows its not-found state and the preview is
 *  generic). */
export async function profileSummary(rawName: string, opts: { cards?: boolean } = {}): Promise<ProfileSummary | null> {
  const name = rawName.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(name)) return null;
  return safe(async () => {
    const db = await getDb();
    const user = await db
      .prepare(
        `SELECT id, username, avatar, games, is_guest, banned_until, created_at FROM users WHERE username_lower = ?`,
      )
      .bind(name)
      .first<{ id: string; username: string; avatar: string | null; games: number; is_guest: number; banned_until: number | null; created_at: number }>();
    if (!user || (user.banned_until && user.banned_until > Date.now())) return null;
    const [ratings, recent] = await Promise.all([
      db
        .prepare(`SELECT category, rating, rd, games FROM user_ratings WHERE user_id = ? AND category IN ('buff', 'nerf')`)
        .bind(user.id)
        .all<{ category: string; rating: number; rd: number; games: number }>(),
      // Favourite cards read the archive; only the image needs them.
      opts.cards === false
        ? Promise.resolve([])
        : safe(() =>
            pgAll<{ white_user_id: string | null; black_user_id: string | null; draft_record: unknown }>(
          `SELECT white_user_id, black_user_id, draft_record FROM games
           WHERE (white_user_id = ? OR black_user_id = ?) AND draft_record IS NOT NULL
           ORDER BY completed_at DESC LIMIT 40`,
          [user.id, user.id],
        ),
      ),
    ]);
    const spec = user.avatar && isAvatarId(user.avatar) ? AVATARS[user.avatar] : null;
    return {
      username: user.username,
      guest: !!user.is_guest,
      avatar: spec ? { piece: spec.piece, bg: spec.bg } : null,
      ratings: (ratings.results ?? [])
        .filter((r) => r.games > 0 && (r.category === "buff" || r.category === "nerf"))
        .sort((a, b) => (a.category === "buff" ? -1 : 1) - (b.category === "buff" ? -1 : 1))
        .map((r) => ({ mode: r.category as "buff" | "nerf", rating: r.rating, games: r.games, provisional: r.rd > PROVISIONAL_RD })),
      games: user.games ?? 0,
      topCards: topCardsFrom(user.id, recent ?? []),
      createdAt: user.created_at ?? null,
    };
  });
}

/** The cards a player picked most often in their last 40 draft games. */
function topCardsFrom(
  userId: string,
  games: { white_user_id: string | null; black_user_id: string | null; draft_record: unknown }[],
): { name: string; tier: number }[] {
  const counts = new Map<string, number>();
  for (const g of games) {
    const color = g.white_user_id === userId ? "w" : g.black_user_id === userId ? "b" : null;
    if (!color) continue;
    let record: { draftActions?: { color?: string; a?: string; index?: number; cards?: { id?: string }[] }[] } | null = null;
    try {
      record = typeof g.draft_record === "string" ? JSON.parse(g.draft_record) : (g.draft_record as typeof record);
    } catch {
      record = null;
    }
    for (const act of record?.draftActions ?? []) {
      if (act.color !== color || act.a !== "pick" || typeof act.index !== "number") continue;
      const id = act.cards?.[act.index]?.id;
      if (id && BUFF_BY_ID[id]) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([id]) => ({ name: BUFF_BY_ID[id].name, tier: BUFF_BY_ID[id].tier }));
}

// ---------------------------------------------------------------------------
// Clubs, tournaments, leaderboard
// ---------------------------------------------------------------------------

export type ClubSummary = { slug: string; name: string; description: string; members: number };

export async function clubSummary(rawSlug: string): Promise<ClubSummary | null> {
  const slug = rawSlug.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  return safe(async () => {
    const db = await getDb();
    const club = await db
      .prepare(
        `SELECT c.slug, c.name, c.description, (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id) AS members
         FROM clubs c WHERE c.slug = ?`,
      )
      .bind(slug)
      .first<{ slug: string; name: string; description: string; members: number }>();
    return club ? { ...club, members: Number(club.members) || 0 } : null;
  });
}

export type TournamentSummary = {
  id: string;
  name: string;
  description: string;
  status: string;
  mode: "buff" | "nerf" | null;
  rated: boolean;
  timeSec: number;
  incrementSec: number;
  startsAt: number | null;
  players: number;
  maxPlayers: number;
};

export async function tournamentSummary(rawId: string): Promise<TournamentSummary | null> {
  const id = rawId.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return safe(async () => {
    const db = await getDb();
    const t = await db
      .prepare(
        `SELECT t.id, t.name, t.description, t.status, t.mode, t.rated, t.clock_time_sec, t.clock_increment_sec,
                t.starts_at, t.max_players,
                (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id = t.id) AS players
         FROM tournaments t WHERE t.id = ?`,
      )
      .bind(id)
      .first<{
        id: string;
        name: string;
        description: string;
        status: string;
        mode: string;
        rated: number;
        clock_time_sec: number;
        clock_increment_sec: number;
        starts_at: number | null;
        max_players: number;
        players: number;
      }>();
    if (!t) return null;
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status,
      mode: modeOf(t.mode),
      rated: !!t.rated,
      timeSec: t.clock_time_sec,
      incrementSec: t.clock_increment_sec,
      startsAt: t.starts_at,
      players: Number(t.players) || 0,
      maxPlayers: t.max_players,
    };
  });
}

/** The first row of the public leaderboard in each mode, with the same
 *  population rule as /api/leaderboard (rated players, hand-set ratings and
 *  the house roster, banned accounts excluded), so the preview never shows a
 *  name the board does not. */
export async function leaderboardTop(): Promise<{ mode: "buff" | "nerf"; username: string; rating: number }[]> {
  const out = await safe(async () => {
    const db = await getDb();
    const rows: { mode: "buff" | "nerf"; username: string; rating: number }[] = [];
    for (const mode of ["buff", "nerf"] as const) {
      const top = await db
        .prepare(
          `SELECT u.username, r.rating FROM user_ratings r JOIN users u ON u.id = r.user_id
           WHERE r.category = ? AND (r.games > 0 OR r.hand_set = 1 OR r.user_id LIKE ? ESCAPE '\\')
             AND (u.banned_until IS NULL OR u.banned_until <= ?)
           ORDER BY r.rating DESC, r.games DESC LIMIT 1`,
        )
        .bind(mode, "hp\\_%", Date.now())
        .first<{ username: string; rating: number }>();
      if (top) rows.push({ mode, username: top.username, rating: top.rating });
    }
    return rows;
  });
  return out ?? [];
}
