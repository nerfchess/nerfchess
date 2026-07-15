// Server-side conversion of a stored archive draft record into the SAME
// spectator-safe public action stream a live watcher receives. This is the
// archive analogue of worker.ts `publicDraftActions`, and it MUST filter the
// stream identically so a replayed archived draft game reproduces every board
// rewrite exactly as the live spectator path does.
//
// SECURITY: `grant` is an owner-only god-panel action that is NEVER surfaced
// raw (it would leak an owner's private, possibly-hidden card seeding). Only an
// INSTANT grant is surfaced, and only as a public "pick" carrying the card
// identity, because an instant resolved its effect on the board inside
// acquireBuff and a replaying replica must re-run it or its board desyncs. A
// hideable grant only seats a held card (dtState carries that face-up-or-masked
// in the live path), so it is dropped from the replay. Rerolls are a server-only
// RNG detail the client never sees. See the warning comment on
// ArchivedDraftAction in src/lib/server/games.ts.

import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { BuffPick, DraftMode } from "@/engine/buff";
import type { MPDraftAction, MPDraftCard, MPHiddenCard } from "@/lib/multiplayer";
import type { ArchivedDraftAction, DraftRecord } from "@/lib/server/games";

/** Convert a stored archive draftActions stream into the public, spectator-safe
 *  MPDraftAction stream (the exact shape buildSpectatorDraftGame consumes). */
export function publicDraftActionsFromRecord(actions: ArchivedDraftAction[]): MPDraftAction[] {
  const out: MPDraftAction[] = [];
  for (const action of actions) {
    // Rerolls are a server-only RNG detail; the client never rolls offers.
    if (action.a === "reroll") continue;
    if (action.a === "grant") {
      const id = action.id as string | undefined;
      const tier = action.tier as number | undefined;
      if (!id || tier == null) continue;
      const def = BUFF_BY_ID[id];
      // Only an instant grant is public (its effect landed on the board);
      // hideable grants are dropped, exactly as publicDraftActions does. NEVER
      // surface a raw grant action.
      if (def?.kind === "instant") {
        out.push({ ply: action.ply, color: action.color, a: "pick", cards: [{ id, tier }] });
      }
      continue;
    }
    if (action.a === "pick") {
      out.push({
        ply: action.ply,
        color: action.color,
        a: "pick",
        cards: (action.cards as (MPDraftCard | MPHiddenCard)[]) ?? [],
      });
      continue;
    }
    if (action.a === "use") {
      out.push({
        ply: action.ply,
        color: action.color,
        a: "use",
        buffIndex: action.buffIndex as number,
        picks: (action.picks as BuffPick[]) ?? [],
        ...(action.card ? { card: action.card as MPDraftCard } : {}),
      });
      continue;
    }
    if (action.a === "bank") {
      out.push({ ply: action.ply, color: action.color, a: "bank" });
      continue;
    }
    if (action.a === "diffFlag") {
      out.push({ ply: action.ply, color: action.color, a: "diffFlag" });
      continue;
    }
    // Unknown opcode from a future engine: drop it rather than guess.
  }
  return out;
}

/** The public replay payload a spectator-safe archive endpoint returns for a
 *  draft game: the filtered action stream plus the draft mode. Null for a
 *  classic (recordless) game so callers fall back to the moves-only replay. */
export interface PublicDraftReplay {
  dtActions: MPDraftAction[];
  mode?: DraftMode;
}

/** Parse a stored draft_record (a JSON string on D1, an object from Postgres
 *  jsonb) into the spectator-safe public replay, or null when there is no
 *  usable record (legacy classic rows). */
export function publicDraftReplayFromColumn(raw: unknown): PublicDraftReplay | null {
  if (raw == null) return null;
  let record: DraftRecord | null = null;
  if (typeof raw === "string") {
    try {
      record = JSON.parse(raw) as DraftRecord;
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    record = raw as DraftRecord;
  }
  if (!record || !Array.isArray(record.draftActions)) return null;
  return {
    dtActions: publicDraftActionsFromRecord(record.draftActions),
    ...(record.mode ? { mode: record.mode as DraftMode } : {}),
  };
}
