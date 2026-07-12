/// <reference types="@cloudflare/workers-types" />

// The codex card-insights rollup: aggregate gameplay stats for every card,
// computed in one pass over the games archive and cached as a single JSON
// blob in D1 (codex_insights_cache), then sliced per card by
// /api/cards/insights. A rollup (not per-card queries) because the buff
// aggregates walk the draft_record JSON stream: one occasional full scan is
// fine (the uncached /api/stats already does one per request), a scan per
// card page view is not.
//
// Privacy: only aggregates ever leave this module. No draft_record contents,
// no draftSeed, no per-game rows; owner `grant` actions never enter the pick
// aggregation because they are not `pick` actions (docs/archive-draft-record.md).

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "./db";
import { pgAll } from "./pg";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { buffType } from "@/lib/cardCodex";

export interface StatSegment {
  /** Nerf: sides that carried it. Buff family: 0. */
  dealt: number;
  /** Buff family: times seen in an offer a player picked from. Offers that
   * were banked or rerolled carry no card list in the archive, so they are
   * invisible here by construction. Nerf: 0. */
  offered: number;
  /** Buff family: times it was the card taken from such an offer. Nerf: 0. */
  picked: number;
  /** Holder's games with a recorded result (wins, losses, and draws). */
  decided: number;
  /** Games the holder won. */
  wins: number;
  /** Dealt (nerf) or picked (buff) in the last 30 days. */
  recent30d: number;
}

export interface CardStats {
  human: StatSegment;
  bots: StatSegment;
  /** Popularity rank by human volume within (kind, family, tier); absent when
   * the card has no human games. */
  tierRank?: { rank: number; of: number };
  /** Human holder-win-rate averaged across the card's (family, tier) group,
   * for the "tier average" comparison line. 0..1. */
  tierAvgWinRate?: number;
}

export interface InsightsBlob {
  computedAt: number;
  /** Key "nerf:<id>" | "buff:<id>". Cards with no recorded games are absent. */
  cards: Record<string, CardStats>;
}

// Bump when the blob layout changes: old cached shapes are then never read.
const BLOB_KEY = "v1";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const emptySegment = (): StatSegment => ({
  dealt: 0,
  offered: 0,
  picked: 0,
  decided: 0,
  wins: 0,
  recent30d: 0,
});

// House-bot sides are identifiable by the hp_ user-id prefix
// (src/lib/server/bots.ts HOUSE_ROSTER); NULL user ids (guests) read as
// human, which is what we want.
const BOT_PREDICATE = `LIKE 'hp\\_%' ESCAPE '\\'`;

interface NerfRow {
  nerf: string;
  bot: number | boolean;
  dealt: number;
  decided: number;
  wins: number;
  recent: number;
}

// Portable across PG and the D1 fallback (pgAll routes it): plain columns,
// UNION ALL per side, FILTER aggregates.
const NERF_SQL = `
  SELECT nerf,
         CASE WHEN uid ${BOT_PREDICATE} THEN 1 ELSE 0 END AS bot,
         COUNT(*) AS dealt,
         COUNT(*) FILTER (WHERE winner IS NOT NULL) AS decided,
         COUNT(*) FILTER (WHERE won = 1) AS wins,
         COUNT(*) FILTER (WHERE completed_at > ?) AS recent
  FROM (
    SELECT white_nerf_id AS nerf, white_user_id AS uid,
           CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won, winner, completed_at
    FROM games
    UNION ALL
    SELECT black_nerf_id, black_user_id,
           CASE WHEN winner = 'b' THEN 1 ELSE 0 END, winner, completed_at
    FROM games
  ) s
  GROUP BY nerf, bot`;

interface BuffRow {
  card_id: string | null;
  bot: number | boolean;
  offered: number;
  picked: number;
  wins: number;
  decided: number;
  recent: number;
}

// Postgres-only: walks draft_record (JSONB). Only `pick` actions carry the
// offer's card list, so both the offered and picked counts come from them.
const BUFF_SQL_PG = `
  SELECT c.card_id AS card_id,
         CASE WHEN (CASE WHEN da.act->>'color' = 'w' THEN g.white_user_id ELSE g.black_user_id END)
              ${BOT_PREDICATE} THEN 1 ELSE 0 END AS bot,
         COUNT(*) AS offered,
         COUNT(*) FILTER (WHERE c.chosen) AS picked,
         COUNT(*) FILTER (WHERE c.chosen AND g.winner = da.act->>'color') AS wins,
         COUNT(*) FILTER (WHERE c.chosen AND g.winner IS NOT NULL) AS decided,
         COUNT(*) FILTER (WHERE c.chosen AND g.completed_at > ?) AS recent
  FROM games g
  CROSS JOIN LATERAL jsonb_array_elements(g.draft_record->'draftActions') AS da(act)
  CROSS JOIN LATERAL (
    SELECT t.elem->>'id' AS card_id,
           (t.ord - 1) = (da.act->>'index')::int AS chosen
    FROM jsonb_array_elements(da.act->'cards') WITH ORDINALITY AS t(elem, ord)
  ) c
  WHERE g.draft_record IS NOT NULL AND da.act->>'a' = 'pick'
  GROUP BY c.card_id, bot`;

// D1/SQLite equivalent over the TEXT copy of draft_record. json_each's key is
// the array index, which is exactly the pick's chosen offset.
const CHOSEN_D1 = `c.key = json_extract(a.value, '$.index')`;
const BUFF_SQL_D1 = `
  SELECT json_extract(c.value, '$.id') AS card_id,
         CASE WHEN (CASE WHEN json_extract(a.value, '$.color') = 'w' THEN g.white_user_id ELSE g.black_user_id END)
              ${BOT_PREDICATE} THEN 1 ELSE 0 END AS bot,
         COUNT(*) AS offered,
         COUNT(*) FILTER (WHERE ${CHOSEN_D1}) AS picked,
         COUNT(*) FILTER (WHERE ${CHOSEN_D1} AND g.winner = json_extract(a.value, '$.color')) AS wins,
         COUNT(*) FILTER (WHERE ${CHOSEN_D1} AND g.winner IS NOT NULL) AS decided,
         COUNT(*) FILTER (WHERE ${CHOSEN_D1} AND g.completed_at > ?) AS recent
  FROM games g, json_each(g.draft_record, '$.draftActions') a, json_each(a.value, '$.cards') c
  WHERE g.draft_record IS NOT NULL AND json_extract(a.value, '$.a') = 'pick'
  GROUP BY card_id, bot`;

const KNOWN_NERF_IDS = new Set(ALL_NERFS.map((n) => n.id));
const KNOWN_BUFF_IDS = new Set(ALL_BUFFS.map((b) => b.id));

async function buffRows(cutoff: number): Promise<BuffRow[]> {
  try {
    // Hyperdrive path. If the binding is missing (dev) pgAll falls back to
    // running this Postgres-only SQL on D1, which throws; the catch below is
    // that dev path as well as the Hyperdrive-down path.
    return await pgAll<BuffRow>(BUFF_SQL_PG, [cutoff]);
  } catch {
    const db = await getDb();
    const res = await db.prepare(BUFF_SQL_D1).bind(cutoff).all<BuffRow>();
    return res.results;
  }
}

/** One full pass over the archive: every card's aggregate stats. */
export async function computeInsightsBlob(): Promise<InsightsBlob> {
  const now = Date.now();
  const cutoff = now - RECENT_WINDOW_MS;

  const [nerfRows, bRows] = await Promise.all([
    pgAll<NerfRow>(NERF_SQL, [cutoff]),
    buffRows(cutoff),
  ]);

  const cards: Record<string, CardStats> = {};
  const entry = (key: string): CardStats => {
    let e = cards[key];
    if (!e) {
      e = { human: emptySegment(), bots: emptySegment() };
      cards[key] = e;
    }
    return e;
  };
  const isBot = (v: number | boolean) => v === 1 || v === true;

  for (const row of nerfRows) {
    // Unknown ids (buff-mode sentinel, retired cards) are dropped here.
    if (!KNOWN_NERF_IDS.has(row.nerf)) continue;
    const seg = isBot(row.bot) ? entry(`nerf:${row.nerf}`).bots : entry(`nerf:${row.nerf}`).human;
    seg.dealt += Number(row.dealt);
    seg.decided += Number(row.decided);
    seg.wins += Number(row.wins);
    seg.recent30d += Number(row.recent);
  }

  for (const row of bRows) {
    if (!row.card_id || !KNOWN_BUFF_IDS.has(row.card_id)) continue;
    const key = `buff:${row.card_id}`;
    const seg = isBot(row.bot) ? entry(key).bots : entry(key).human;
    seg.offered += Number(row.offered);
    seg.picked += Number(row.picked);
    seg.decided += Number(row.decided);
    seg.wins += Number(row.wins);
    seg.recent30d += Number(row.recent);
  }

  rankWithinTiers(cards);
  return { computedAt: now, cards };
}

// Popularity rank and tier-average win rate, per (kind, family, code tier):
// hexes rank against hexes, boons against boons, so "3rd of 40 Tier V hexes"
// reads honestly. Volume is human dealt (nerfs) or human picked (buffs).
function rankWithinTiers(cards: Record<string, CardStats>): void {
  const groups = new Map<string, { key: string; volume: number }[]>();
  const add = (groupKey: string, cardKey: string, volume: number) => {
    let g = groups.get(groupKey);
    if (!g) {
      g = [];
      groups.set(groupKey, g);
    }
    g.push({ key: cardKey, volume });
  };
  for (const n of ALL_NERFS) {
    if (!n.implemented) continue;
    add(`nerf:Nerf:${n.tier}`, `nerf:${n.id}`, cards[`nerf:${n.id}`]?.human.dealt ?? 0);
  }
  for (const b of ALL_BUFFS) {
    if (!b.implemented) continue;
    add(`buff:${buffType(b)}:${b.tier}`, `buff:${b.id}`, cards[`buff:${b.id}`]?.human.picked ?? 0);
  }
  for (const members of groups.values()) {
    let winSum = 0;
    let decidedSum = 0;
    for (const m of members) {
      const s = cards[m.key];
      if (s) {
        winSum += s.human.wins;
        decidedSum += s.human.decided;
      }
    }
    const avg = decidedSum > 0 ? winSum / decidedSum : undefined;
    for (const m of members) {
      const s = cards[m.key];
      if (!s) continue;
      if (avg !== undefined) s.tierAvgWinRate = avg;
      if (m.volume > 0) {
        const rank = 1 + members.filter((o) => o.volume > m.volume).length;
        s.tierRank = { rank, of: members.length };
      }
    }
  }
}

/** The cached blob, recomputed when older than the freshness window. Serves
 * the stale copy if a recompute fails, and null only when there is neither a
 * cached copy nor a computable one. */
export async function getInsightsBlob(db: D1Database): Promise<InsightsBlob | null> {
  let stale: InsightsBlob | null = null;
  try {
    const row = await db
      .prepare(`SELECT json, computed_at FROM codex_insights_cache WHERE key = ?`)
      .bind(BLOB_KEY)
      .first<{ json: string; computed_at: number }>();
    if (row) {
      const parsed = JSON.parse(row.json) as InsightsBlob;
      if (Date.now() - row.computed_at <= MAX_AGE_MS) return parsed;
      stale = parsed;
    }
  } catch {}

  let fresh: InsightsBlob;
  try {
    fresh = await computeInsightsBlob();
  } catch (err) {
    console.error("codex insights recompute failed; serving stale copy", err);
    return stale;
  }
  try {
    await db
      .prepare(
        `INSERT OR REPLACE INTO codex_insights_cache (key, json, computed_at) VALUES (?, ?, ?)`,
      )
      .bind(BLOB_KEY, JSON.stringify(fresh), fresh.computedAt)
      .run();
  } catch {
    // A failed cache write only means the next request recomputes too.
  }
  return fresh;
}
