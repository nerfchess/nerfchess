// Hex wave 4, upper band (tiers 5-8). Imported ONLY by ./wave4.ts, which
// concatenates these into HEX_WAVE4. Also exports the small helper kit the
// whole wave shares (trigger/cadence factories, guarded stings) so wave4.ts
// does not duplicate it. Same authoring rails as tier1-8/wave2/wave3:
//   - every opponent-move filter keeps a non-empty fallback (curse() guards);
//   - kings are never frozen, walnutted or removed;
//   - api.rng only inside init / effect / onMovePlayed;
//   - effects added DURING the victim's own move use turns = N + 1 (the shared
//     post-move pass ticks them once immediately), effects added on the
//     caster's turn use turns = N.

import type { FreezeSkin, CosmeticSkin } from "../../buff";
import type { Buff, BuffApi, BuffInstance, Move, PieceType, Square } from "./shared";
import type { Mech } from "./shared";
import {
  activated,
  addEffect,
  blockDrafts,
  curse,
  emptySquares,
  freezeAllEnemies,
  freezeTarget,
  hex,
  instant,
  isInCheck,
  mySquares,
  nullifyDrafts,
  relRank,
  skipOpponent,
  suppressDraftCards,
  tickTurns,
  tierHexes,
  turnsLeft,
  walnutAll,
  walnutTarget,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

const H5 = tierHexes(5);
const H6 = tierHexes(6);
const H7 = tierHexes(7);
const H8 = tierHexes(8);

// ---------------------------------------------------------------------------
// Wave-shared helpers (exported for wave4.ts).
// ---------------------------------------------------------------------------

export const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));
export const moveDist = (m: Move) => cheb(m.from, m.to);
export const sqShade = (sq: Square) => (FILE(sq) + RANK(sq)) & 1; // 0 dark, 1 light
export const capSq = (m: Move): Square | null =>
  m.capturedSquare ?? (m.captured ? m.to : null);

/** The victim's king square (null in degenerate boards). */
export function oppKing(api: BuffApi): Square | null {
  const k = mySquares(api.board, api.opp, "k");
  return k.length ? k[0] : null;
}
/** The caster's king square. */
export function myKing(api: BuffApi): Square | null {
  const k = mySquares(api.board, api.me, "k");
  return k.length ? k[0] : null;
}

/** Freeze a victim piece from INSIDE onMovePlayed (their move is about to be
 * ticked once), biting for exactly `n` of their turns. King-guarded. */
export function sting(api: BuffApi, sq: Square, n: number, skin: FreezeSkin) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: n + 1, skin });
}
/** Walnut a victim piece from inside onMovePlayed for exactly `n`. */
export function nutSting(api: BuffApi, sq: Square, n: number) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: n + 1 });
}
/** Freeze a victim piece on the CASTER'S turn (instant/activated effect). */
export function freezeNow(api: BuffApi, sq: Square, n: number, skin: FreezeSkin) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: n, skin });
}
/** Walnut a victim piece on the caster's turn. */
export function nutNow(api: BuffApi, sq: Square, n: number) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: n });
}
/** Pin a pure-visual cosmetic on a victim piece. */
export function dressUp(
  api: BuffApi,
  sq: Square,
  skin: CosmeticSkin,
  turns: number,
  label?: string,
) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp) return;
  addEffect(api, { kind: "cosmetic", sq, owner: api.opp, turns, skin, ...(label ? { label } : {}) });
}
/** Bar squares against the victim, cast on the caster's turn. */
export function barNow(api: BuffApi, squares: Square[], turns: number) {
  if (squares.length) addEffect(api, { kind: "barred", squares, against: api.opp, turns });
}
export function fileSquares(f: number): Square[] {
  return Array.from({ length: 8 }, (_, r) => SQ(f, r));
}
export function rankSquares(r: number): Square[] {
  return Array.from({ length: 8 }, (_, f) => SQ(f, r));
}
export const CENTER4: Square[] = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];

/** Timed passive that watches the victim's moves for `turns` of their turns.
 * `fire` runs BEFORE the tick, so effects it adds use the +1 convention
 * (sting/nutSting already do). */
export function onTheirMove(
  turns: number,
  fire: (move: Move, api: BuffApi, inst: BuffInstance) => void,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && turnsLeft(inst) > 0) fire(move, api, inst);
      tickTurns(inst, move, api.opp);
    },
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Cadence curse: a timed opponent filter that only bites on the turns where
 * `activeOn(elapsed)` is true (elapsed = 0 on their first cursed turn). */
export function cadenceCurse(
  turns: number,
  activeOn: (elapsed: number) => boolean,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    filterOpponentMoves: (moves, inst, api) => {
      const left = turnsLeft(inst);
      if (left <= 0 || moves.length === 0) return moves;
      if (!activeOn(turns - left)) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Like curse(), but before the curse fully binds, the first affected piece
 * (the lowest-square opponent piece that has a move the curse would forbid) may
 * make one such move. Taking that escape spends the reprieve; the curse then
 * binds fully for the rest of the duration. */
export function escapeCurse(
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.escaped = false;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      const kept = filter(moves, api);
      if (kept.length === 0) return moves;
      if (inst.state.escaped) return kept;
      const keptSet = new Set(kept);
      const blocked = moves.filter((m) => !keptSet.has(m));
      if (blocked.length === 0) return kept;
      let escapeFrom = blocked[0].from;
      for (const m of blocked) if (m.from < escapeFrom) escapeFrom = m.from;
      const escapeMoves = blocked.filter((m) => m.from === escapeFrom);
      inst.state.escapeFrom = escapeFrom;
      inst.state.escapeTos = escapeMoves.map((m) => m.to);
      return [...kept, ...escapeMoves];
    },
    onMovePlayed: (inst, move, api) => {
      if (
        move.color === api.opp &&
        turnsLeft(inst) > 0 &&
        !inst.state.escaped &&
        inst.state.escapeFrom != null &&
        move.from === inst.state.escapeFrom &&
        Array.isArray(inst.state.escapeTos) &&
        (inst.state.escapeTos as Square[]).includes(move.to)
      ) {
        inst.state.escaped = true;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Squares the caster's pawns currently attack (their capture diagonals). */
export function myPawnThreats(api: BuffApi): Set<Square> {
  const out = new Set<Square>();
  const dr = api.me === "w" ? 1 : -1;
  for (const sq of mySquares(api.board, api.me, "p")) {
    for (const df of [-1, 1]) {
      const f = FILE(sq) + df;
      const r = RANK(sq) + dr;
      if (inBoard(f, r)) out.add(SQ(f, r));
    }
  }
  return out;
}

/** Pure-geometry attack test (mirrors overhaul/shared.ts, kept local so the
 * hex barrel stays self-contained). */
export function attacks(api: BuffApi, from: Square, target: Square): boolean {
  const board = api.board;
  const p = board.pieces[from];
  if (!p || from === target) return false;
  const df = FILE(target) - FILE(from);
  const dr = RANK(target) - RANK(from);
  const adf = Math.abs(df);
  const adr = Math.abs(dr);
  switch (p.type) {
    case "p": {
      const dir = p.color === "w" ? 1 : -1;
      return dr === dir && adf === 1;
    }
    case "n":
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case "k":
      return adf <= 1 && adr <= 1;
    case "b":
      if (adf !== adr) return false;
      break;
    case "r":
      if (df !== 0 && dr !== 0) return false;
      break;
    case "q":
      if (adf !== adr && df !== 0 && dr !== 0) return false;
      break;
  }
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  let f = FILE(from) + sf;
  let r = RANK(from) + sr;
  while (inBoard(f, r) && SQ(f, r) !== target) {
    if (board.pieces[SQ(f, r)]) return false;
    f += sf;
    r += sr;
  }
  return true;
}

/** Piece rough value for "strongest piece" picks. */
export const PIECE_VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 4, q: 5, k: 100 };

/** The victim's non-king squares, strongest first, ties by lowest square. */
export function victimByValue(api: BuffApi): Square[] {
  return mySquares(api.board, api.opp)
    .filter((sq) => api.board.pieces[sq]!.type !== "k")
    .sort((a, b) => {
      const dv = PIECE_VAL[api.board.pieces[b]!.type] - PIECE_VAL[api.board.pieces[a]!.type];
      return dv !== 0 ? dv : a - b;
    });
}

/** Draw `n` distinct random entries from `pool` via api.rng (effect paths only). */
export function drawRandom(api: BuffApi, pool: Square[], n: number): Square[] {
  const rest = pool.slice();
  const out: Square[] = [];
  while (rest.length > 0 && out.length < n) {
    out.push(rest.splice(api.rng.int(rest.length), 1)[0]);
  }
  return out;
}

// ------------------------------- TIER 5 ------------------------------------
// Solid curses: multi-turn class locks, first zone seals, telegraphed traps.

const T5: Buff[] = [
  hex(
    { id: "hx4_glacier_gate", name: "Glacier Gate", description: "A wall of ice fills the four center squares: your opponent's pieces cannot stop on d4, e4, d5 or e5 for their next turn.", flavor: "The crossroads froze overnight.", icon: "Snowflake", fx: { motif: "blindfold" }, tier: 6 },
    instant((_inst, api) => barNow(api, CENTER4, 1)),
  ),
  H5(
    { id: "hx4_honey_spill", name: "Honey Spill", description: "A barrel of honey bursts over the stables: all but one of your opponent's knights are stuck fast and cannot move for 2 of their turns. The first knight the honey reaches wriggles free.", flavor: "Sweetest trap ever set.", icon: "Droplet", fx: { motif: "jail", pieces: ["n"] } },
    instant((_inst, api) => {
      const knights = mySquares(api.board, api.opp, "n");
      for (let i = 1; i < knights.length; i++) freezeNow(api, knights[i], 2, "honey");
    }),
  ),
  H5(
    { id: "hx4_drawn_curtain", name: "Drawn Curtain", description: "Choose one rank. Your opponent's next move passes freely; then, for their following turn, none of their pieces may stop on it or cross it. Your pieces pass freely.", flavor: "The stage is closed between acts.", icon: "Theater", fx: { motif: "blindfold" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, _api, picks) =>
        picks.length > 0 || inst.state.rank != null
          ? null
          : { kind: "square", label: "Pick any square on the rank to seal", squares: Array.from({ length: 64 }, (_, i) => i) },
      effect: (inst, _api, picks) => {
        if (inst.state.rank != null) return;
        if (picks[0]?.square != null) inst.state.rank = RANK(picks[0].square);
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.spent || inst.state.rank == null) return;
        if (move.color === api.opp) {
          barNow(api, rankSquares(inst.state.rank as number), 2);
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.rank == null ? "activate to choose the rank" : "seals after their next move",
    },
  ),

  H5(
    { id: "hx4_leaden_boots", name: "Leaden Boots", description: "For your opponent's next 4 turns, none of their pieces may move more than 2 squares. Their king is exempt.", flavor: "Every step rings like an anvil.", icon: "Footprints", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves) => moves.filter((m) => m.piece === "k" || moveDist(m) <= 2)),
  ),
  H5(
    { id: "hx4_tithe_of_blood", name: "Tithe of Blood", description: "For your opponent's next 4 turns, any piece of theirs that captures is frozen for 1 of their turns immediately after the kill. Kings never freeze.", flavor: "The altar takes its cut of every kill.", icon: "Droplets", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (move.captured && move.piece !== "k") sting(api, move.to, 1, "rust");
    }),
  ),
  H5(
    { id: "hx4_river_watch", name: "River Watch", description: "For your opponent's next 3 turns, their rooks may not cross the midline into your half of the board.", flavor: "The ferry does not take siege towers.", icon: "Waves", fx: { motif: "anchor", pieces: ["r"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "r" || relRank(api.opp, m.to) <= 4)),
  ),
  H5(
    { id: "hx4_sandstorm", name: "Sandstorm", description: "Grit chokes every sightline: for your opponent's next 3 turns, their bishops, rooks and queen may slide at most 3 squares.", flavor: "You cannot aim at what you cannot see.", icon: "Wind", fx: { motif: "anchor", pieces: ["b", "r", "q"] } },
    curse(3, (moves) => moves.filter((m) => !["b", "r", "q"].includes(m.piece) || moveDist(m) <= 3)),
  ),
  H5(
    { id: "hx4_royal_escort", name: "Royal Escort", description: "For your opponent's next 4 turns, their queen may not end a move more than 2 squares from one of their rooks. If they have no rooks, she travels unguarded and freely.", flavor: "Her Majesty does not travel without the guard.", icon: "Link", fx: { motif: "anchor", pieces: ["q"] } },
    curse(4, (moves, api) => {
      const rooks = mySquares(api.board, api.opp, "r");
      if (rooks.length === 0) return moves;
      return moves.filter((m) => m.piece !== "q" || rooks.some((r) => r !== m.from && cheb(m.to, r) <= 2));
    }),
  ),
  H5(
    { id: "hx4_night_watch_rota", name: "Night Watch Rota", description: "For your opponent's next 4 turns, their knights and bishops are on watch duty every other turn (the 1st and 3rd) and cannot move on those turns.", flavor: "Half the officers are always asleep on the wall.", icon: "Moon", fx: { motif: "slow", pieces: ["n", "b"] } },
    cadenceCurse(4, (e) => e % 2 === 0, (moves) => moves.filter((m) => m.piece !== "n" && m.piece !== "b")),
  ),
  H5(
    { id: "hx4_tar_pits", name: "Tar Pits", description: "Choose 3 empty squares: they become bubbling tar for 3 of your opponent's turns, and none of their pieces may stop on them.", flavor: "The ground remembers everything that steps in it.", icon: "CircleDot", fx: { motif: "blindfold" } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : { kind: "square", label: `Choose a tar square (${picks.length + 1}/3)`, squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)) },
      (_inst, api, picks) => {
        barNow(api, picks.map((k) => k.square).filter((s): s is number => s != null), 3);
      },
    ),
  ),
  H5(
    { id: "hx4_walnut_pinch", name: "Walnut Pinch", description: "Your opponent's queen turns into a walnut for 1 of their turns: a heavy nut that can only shuffle one square.", flavor: "Just a taste of the shell.", icon: "Nut", fx: { motif: "anchor", pieces: ["q"] } },
    walnutAll(["q"], 1),
  ),
  H5(
    { id: "hx4_cold_reception", name: "Cold Reception", description: "For your opponent's next 3 turns, any pawn of theirs that enters your half of the board is frozen for 1 of their turns on arrival. The first pawn to cross slips through unfrozen; every pawn after it freezes.", flavor: "No fire, no bread, no welcome.", icon: "ThermometerSnowflake", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(3, (move, api, inst) => {
      if (move.piece === "p" && relRank(api.opp, move.to) >= 5) {
        if (!inst.state.escaped) {
          inst.state.escaped = true;
          return;
        }
        sting(api, move.to, 1, "ice");
      }
    }),
  ),
  H5(
    { id: "hx4_dead_letter", name: "Dead Letter", description: "Your opponent's next drafted card arrives nullified: they still pick it, but it does nothing.", flavor: "Signed, sealed, and utterly worthless.", icon: "MailX" },
    nullifyDrafts(1),
  ),
  H5(
    { id: "hx4_no_homecoming", name: "No Homecoming", description: "For your opponent's next 4 turns, none of their pieces may stop on their own back rank. Their king is exempt.", flavor: "The doors of the keep are shut from inside.", icon: "DoorClosed", fx: { motif: "blindfold", pieces: "all" } },
    curse(4, (moves, api) => moves.filter((m) => m.piece === "k" || relRank(api.opp, m.to) !== 1)),
  ),
  H5(
    { id: "hx4_undertow", name: "Undertow", description: "For your opponent's next 3 turns, any piece of theirs that moves backward, toward its own back rank, is frozen for 1 of their turns on arrival. Kings never freeze.", flavor: "The current only pulls one way.", icon: "ArrowDownToLine", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(3, (move, api) => {
      if (move.piece !== "k" && relRank(api.opp, move.to) < relRank(api.opp, move.from)) sting(api, move.to, 1, "quicksand");
    }),
  ),
  H5(
    { id: "hx4_change_of_step", name: "Change of Step", description: "For your opponent's next 4 turns, each move they make must use a different piece type than their previous move. Their king is always allowed. The first move the drill would forbid slips through once, then the rule binds fully.", flavor: "The drillmaster forbids repetition.", icon: "Repeat2", fx: { motif: "slow", pieces: "all" } },
    escapeCurse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.opp) {
          const last = hist[i].piece;
          return moves.filter((m) => m.piece === "k" || m.piece !== last);
        }
      }
      return moves;
    }),
  ),
  H5(
    { id: "hx4_frost_heave", name: "Frost Heave", description: "The ground in your half buckles with frost: every enemy pawn currently standing in your half of the board, except the first, is frozen for 2 of their turns. One pawn shakes free.", flavor: "The invasion is welded to the road.", icon: "Mountain", fx: { motif: "jail", pieces: ["p"] } },
    instant((_inst, api) => {
      let spared = false;
      for (const sq of mySquares(api.board, api.opp, "p")) {
        if (relRank(api.opp, sq) >= 5) {
          if (!spared) {
            spared = true;
            continue;
          }
          freezeNow(api, sq, 2, "ice");
        }
      }
    }),
  ),
  H5(
    { id: "hx4_white_flag_hour", name: "White Flag Hour", description: "A rolling truce is called: on the 1st and 3rd of your opponent's next 4 turns, they cannot capture anything.", flavor: "One hour of peace, signed under protest. Renewed hourly.", icon: "Flag", fx: { motif: "muzzle", pieces: "all" } },
    cadenceCurse(4, (e) => e % 2 === 0, (moves) => moves.filter((m) => !m.captured)),
  ),
  H5(
    { id: "hx4_high_water", name: "High Water", description: "For your opponent's next 4 turns, their rooks and queen may not enter your half of the board. The first piece the flood would stop may cross once; after that it binds fully.", flavor: "Heavy wagons wait for the flood to pass.", icon: "CloudRain", fx: { motif: "anchor", pieces: ["r", "q"] } },
    escapeCurse(4, (moves, api) =>
      moves.filter((m) => (m.piece !== "r" && m.piece !== "q") || relRank(api.opp, m.to) <= 4),
    ),
  ),
  H5(
    { id: "hx4_gargoyle_perch", name: "Gargoyle Perch", description: "Up to two enemy rooks you target turn into walnuts for 1 of their turns: they can only shuffle one square at a time.", flavor: "Towers make excellent roosts.", icon: "Castle", fx: { motif: "anchor", pieces: ["r"] } },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const taken = new Set(picks.map((pk) => pk.square));
        const rooks = mySquares(api.board, api.opp, "r").filter((sq) => !taken.has(sq));
        if (rooks.length === 0) return null;
        return {
          kind: "square",
          label: picks.length === 0 ? "Choose an enemy rook to perch on" : "Choose a second rook, or finish",
          squares: rooks,
          finishable: picks.length > 0,
        };
      },
      (_inst, api, picks) => {
        for (const pk of picks) {
          if (pk.square != null) addEffect(api, { kind: "walnut", sq: pk.square, owner: api.opp, turns: 1 });
        }
      },
    ),
  ),
  H5(
    { id: "hx4_silk_cocoon", name: "Silk Cocoon", description: "Wrap one enemy knight or bishop you target in silk: it is frozen for 3 of their turns.", flavor: "It will emerge exactly the same, only later.", icon: "Bug", fx: { motif: "jail", pieces: ["n", "b"] } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight or bishop to wrap",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) freezeNow(api, picks[0].square, 3, "web");
      },
    ),
  ),
  H5(
    { id: "hx4_quicksand_quarter", name: "Quicksand Quarter", description: "The queenside quarter of your half (files a to d) turns to quicksand: your opponent's pieces may not stop there for their next 3 turns. Their king is exempt.", flavor: "The map says meadow. The meadow disagrees.", icon: "MapPinOff", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => m.piece === "k" || !(FILE(m.to) <= 3 && relRank(api.opp, m.to) >= 5)),
    ),
  ),
  H5(
    { id: "hx4_echo_of_bells", name: "Echo of Bells", description: "Your opponent's next move passes freely. Then, for their next 6 turns, every second turn (the 2nd, 4th and 6th) the bells toll and they may only move a pawn or their king.", flavor: "You cannot plan over that ringing.", icon: "Bell", fx: { motif: "slow", pieces: ["n", "b", "r", "q"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.armed = false;
      },
      filterOpponentMoves: (moves, inst) => {
        if (!inst.state.armed) return moves;
        const left = turnsLeft(inst);
        if (left <= 0 || moves.length === 0) return moves;
        if ((6 - left) % 2 !== 1) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (!inst.state.armed) {
          inst.state.armed = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.armed
          ? `${turnsLeft(inst)} of their turns left`
          : "the bells begin after their next move",
    },
  ),
  H5(
    { id: "hx4_grooms_leash", name: "Groom's Leash", description: "For your opponent's next 3 turns, their knights may only land on squares adjacent to another of their own pieces. Stray leaps are forbidden. The first stray leap slips through once, then the leash binds fully.", flavor: "No horse rides out without a handler.", icon: "Grip", fx: { motif: "anchor", pieces: ["n"] } },
    escapeCurse(3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece !== "n" ||
          mySquares(api.board, api.opp).some((s) => s !== m.from && s !== m.to && cheb(s, m.to) === 1),
      ),
    ),
  ),
  H5(
    { id: "hx4_mitred_blinders", name: "Mitred Blinders", description: "For your opponent's next 4 turns, their bishops may slide at most 1 square.", flavor: "Faith is no substitute for eyesight.", icon: "EyeOff", fx: { motif: "anchor", pieces: ["b"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "b" || moveDist(m) <= 1)),
  ),
  H5(
    { id: "hx4_court_in_session", name: "Court in Session", description: "For your opponent's next 2 turns, any of their pieces standing adjacent to their own king may not move. The king itself is free to go.", flavor: "Nobody leaves while the king is speaking.", icon: "Gavel", fx: { motif: "jail", pieces: "all" } },
    curse(2, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || cheb(m.from, k) > 1);
    }),
  ),
  H5(
    { id: "hx4_ford_crossing", name: "Ford Crossing", description: "For your opponent's next 4 turns, any move that crosses the midline into your half must stop on the first rank of your half. Deeper landings are forbidden. Their king is exempt. The first piece the ford would stop may make one forbidden crossing, then it binds fully.", flavor: "Everyone wades. Nobody swims.", icon: "Footprints", fx: { motif: "anchor", pieces: "all" } },
    escapeCurse(4, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "k" ||
          relRank(api.opp, m.from) >= 5 ||
          relRank(api.opp, m.to) <= 5,
      ),
    ),
  ),
  H5(
    { id: "hx4_hollow_fanfare", name: "Hollow Fanfare", description: "For your opponent's next 8 turns, any pawn they promote arrives as a walnut for 2 of their turns: crowned, celebrated, and unable to do more than shuffle.", flavor: "The trumpets were rented. The crown is a shell.", icon: "Trophy", fx: { motif: "slow", pieces: ["p"] } },
    onTheirMove(8, (move, api) => {
      if (move.promotion) nutSting(api, move.to, 2);
    }),
  ),
  H5(
    { id: "hx4_beartrap_cache", name: "Beartrap Cache", description: "Hide traps on 2 empty squares you choose: the first enemy piece to stop on each is caught and frozen for 2 of their turns. Kings step over traps.", flavor: "The forest floor is patient.", icon: "Cross", fx: { motif: "blindfold" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length >= 2 || inst.state.traps != null
          ? null
          : { kind: "square", label: `Hide a trap (${picks.length + 1}/2)`, squares: emptySquares(api.board).filter((sq) => !picks.some((k) => k.square === sq)) },
      effect: (inst, _api, picks) => {
        if (inst.state.traps != null) return;
        inst.state.traps = picks.map((k) => k.square).filter((s): s is number => s != null);
      },
      onMovePlayed: (inst, move, api) => {
        const traps = inst.state.traps as Square[] | undefined;
        if (!traps?.length) return;
        if (move.color === api.opp && move.piece !== "k" && traps.includes(move.to)) {
          sting(api, move.to, 2, "beartrap");
          inst.state.traps = traps.filter((t) => t !== move.to);
          if ((inst.state.traps as Square[]).length === 0) inst.spent = true;
        }
      },
      status: (inst) => {
        const traps = inst.state.traps as Square[] | undefined;
        return traps == null ? "activate to hide the traps" : `${traps.length} trap(s) still set`;
      },
    },
  ),
  H5(
    { id: "hx4_ash_veil", name: "Ash Veil", description: "A veil of ash hides your minor pieces: your opponent cannot capture your knights or bishops for their next 3 turns.", flavor: "Strike the shadow, miss the shape.", icon: "CloudFog", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        if (c == null) return true;
        const t = api.board.pieces[c]?.type;
        return t !== "n" && t !== "b";
      }),
    ),
  ),
  H5(
    { id: "hx4_gilded_cage", name: "Gilded Cage", description: "For your opponent's next 3 turns, their queen may only move to squares on their own back two ranks. The palace doors are locked from outside.", flavor: "Every luxury except a key.", icon: "Lock", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "q" || relRank(api.opp, m.to) <= 2)),
  ),
  H5(
    { id: "hx4_summons_to_court", name: "Summons to Court", description: "On your opponent's next 2 turns they may move only their king. The crown answers alone.", flavor: "The letter bore every seal but mercy.", icon: "ScrollText", fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] } },
    instant((_inst, api) => addEffect(api, { kind: "king_only", against: api.opp, turns: 2 })),
  ),
  H5(
    { id: "hx4_wagon_ruts", name: "Wagon Ruts", description: "For your opponent's next 5 turns, their rooks may only move along files, never sideways along ranks.", flavor: "The road decides where the wheels go.", icon: "TrainTrack", fx: { motif: "anchor", pieces: ["r"] } },
    curse(5, (moves) => moves.filter((m) => m.piece !== "r" || FILE(m.from) === FILE(m.to))),
  ),
  H5(
    { id: "hx4_paddock_fence", name: "Paddock Fence", description: "For your opponent's next 3 turns, their knights may not land in your half of the board.", flavor: "The gate is horse-high and grudge-deep.", icon: "Fence", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves, api) => moves.filter((m) => m.piece !== "n" || relRank(api.opp, m.to) <= 4)),
  ),
  H5(
    { id: "hx4_widows_veil", name: "Widow's Veil", description: "For your opponent's next 6 turns, their queen cannot capture anything. She is in deep mourning.", flavor: "Black lace, sheathed blade.", icon: "HeartCrack", fx: { motif: "muzzle", pieces: ["q"] } },
    curse(6, (moves) => moves.filter((m) => m.piece !== "q" || !m.captured)),
  ),
  H5(
    { id: "hx4_grasping_ivy", name: "Grasping Ivy", description: "Ivy coils around your king's court: for your opponent's next 4 turns, any piece of theirs that ends a move adjacent to your king is seized by vines and frozen for 1 of their turns.", flavor: "The garden defends the gardener.", icon: "Leaf", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      const k = myKing(api);
      if (k != null && move.piece !== "k" && cheb(move.to, k) <= 1) sting(api, move.to, 1, "vines");
    }),
  ),
  H5(
    { id: "hx4_paper_orders", name: "Paper Orders", description: "Your opponent's next 4 draft offers exclude draft manipulation cards. The couriers were paid to lose that satchel.", flavor: "Bureaucracy is the quietest siege engine.", icon: "FileX" },
    suppressDraftCards(4),
  ),
];

// ---------------------------------------------------------------------------
/** Follow one tracked square across a move; null when its piece is gone. */
export function followSq(sq: Square | null, move: Move): Square | null {
  if (sq == null) return null;
  if (move.capturedSquare === sq && move.from !== sq) return null;
  if (move.from === sq && move.to !== sq) return move.to;
  if (move.to === sq && move.from !== sq) return null;
  return sq;
}

// ------------------------------- TIER 6 ------------------------------------
// Heavy curses: mass zone freezes, rule distortions, compound taxes.

const T6: Buff[] = [
  H6(
    { id: "hx4_rusted_battlements", name: "Rusted Battlements", description: "Both of your opponent's rooks seize with rust and cannot move for 2 of their turns.", flavor: "Nobody oiled the towers this century.", icon: "Castle", fx: { motif: "jail", pieces: ["r"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "r")) freezeNow(api, sq, 2, "rust");
    }),
  ),
  H6(
    { id: "hx4_crown_malaise", name: "Crown Malaise", description: "For your opponent's next 4 turns, their queen is bedridden every other turn (the 1st and 3rd) and cannot move on those turns.", flavor: "The physicians prescribe rest and defeat.", icon: "Thermometer", fx: { motif: "slow", pieces: ["q"] } },
    cadenceCurse(4, (e) => e % 2 === 0, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  H6(
    { id: "hx4_the_bell_tolls", name: "The Bell Tolls", description: "Your opponent skips their next turn entirely. The board waits for no one, except them.", flavor: "One toll, one silence.", icon: "BellRing", fx: { motif: "slow", pieces: "all" } },
    skipOpponent(1),
  ),
  H6(
    { id: "hx4_chain_gang", name: "Chain Gang", description: "On your opponent's next turn, every piece they own may move at most 1 square. King captures are always allowed.", flavor: "Shuffle together, clink together.", icon: "Link2", fx: { motif: "anchor", pieces: "all" } },
    instant((_inst, api) => addEffect(api, { kind: "short_leash", owner: api.opp, turns: 1 })),
  ),
  H6(
    { id: "hx4_hall_of_mirrors", name: "Hall of Mirrors", description: "For your opponent's next 4 turns, every piece must land on a square of the same color it started from. Knights, whose every leap changes color, cannot move at all. Their king is exempt.", flavor: "Step only where your reflection already stands.", icon: "Copy", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves) => moves.filter((m) => m.piece === "k" || sqShade(m.from) === sqShade(m.to))),
  ),
  H6(
    { id: "hx4_famine", name: "Famine", description: "For your opponent's next 3 turns, they cannot capture any of your pawns. The granary is warded.", flavor: "An army marches on its stomach, then stops.", icon: "Wheat", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) => {
      return moves.filter((m) => {
        const c = capSq(m);
        return c == null || api.board.pieces[c]?.type !== "p";
      });
    }),
  ),
  H6(
    { id: "hx4_stone_orchard", name: "Stone Orchard", description: "All of your opponent's knights and bishops turn to walnuts for 1 of their turns: heavy nuts that can only shuffle one square.", flavor: "A fine crop of statues this year.", icon: "TreePine", fx: { motif: "anchor", pieces: ["n", "b"] } },
    walnutAll(["n", "b"], 1),
  ),
  H6(
    { id: "hx4_siren_song", name: "Siren Song", description: "Mark one enemy piece: for your opponent's next 3 turns, every move it makes must bring it closer to your king. The rest of their army is free. Kings cannot be marked.", flavor: "The music is lovely. The rocks are not.", icon: "Music", fx: { motif: "anchor" } },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : { kind: "square", label: "Choose the piece to enchant", squares: mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k") },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        const k = myKing(api);
        if (sq == null || k == null || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.from !== sq || cheb(m.to, k) < cheb(m.from, k));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = followSq((inst.state.sq as Square | null | undefined) ?? null, move);
        inst.state.sq = sq;
        if (sq == null) {
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to enchant a piece" : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_tar_flood", name: "Tar Flood", description: "Tar floods your opponent's third rank: for their next 2 turns, none of their pieces may stop anywhere on it.", flavor: "Development is postponed indefinitely.", icon: "Layers", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => {
      barNow(api, rankSquares(api.opp === "w" ? 2 : 5), 2);
    }),
  ),
  H6(
    { id: "hx4_dead_calm", name: "Dead Calm", description: "The wind dies: for your opponent's next 2 turns, their bishops, rooks and queen may slide at most 1 square.", flavor: "A fleet of sails and not a breath to fill them.", icon: "Sailboat", fx: { motif: "anchor", pieces: ["b", "r", "q"] } },
    curse(2, (moves) => moves.filter((m) => !["b", "r", "q"].includes(m.piece) || moveDist(m) <= 1)),
  ),
  H6(
    { id: "hx4_pillory", name: "Pillory", description: "Lock one enemy piece you target in the pillory: it is frozen for 2 of their turns and wears the dunce cap for 6. Kings cannot be locked up.", flavor: "Rotten fruit sold separately.", icon: "UserX", fx: { motif: "jail" } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the prisoner", squares: mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k") },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        freezeNow(api, sq, 2, "chains");
        dressUp(api, sq, "dunce", 6);
      },
    ),
  ),
  H6(
    { id: "hx4_poachers_snare", name: "Poacher's Snare", description: "A snare waits at the border: within your opponent's next 6 turns, the first piece of theirs to enter your half of the board is caught and frozen for 3 of their turns. Kings slip the noose.", flavor: "The border bites first.", icon: "Scan", fx: { motif: "blindfold" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (
          move.color === api.opp &&
          turnsLeft(inst) > 0 &&
          move.piece !== "k" &&
          relRank(api.opp, move.from) <= 4 &&
          relRank(api.opp, move.to) >= 5
        ) {
          sting(api, move.to, 3, "beartrap");
          inst.spent = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `snare set, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_rusted_crown", name: "Rusted Crown", description: "For your opponent's next 3 turns, their queen may move only 1 square at a time, like a stiff old king.", flavor: "Majesty, corroded at the joints.", icon: "Crown", fx: { motif: "anchor", pieces: ["q"] } },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || moveDist(m) <= 1)),
  ),
  H6(
    { id: "hx4_checkers_law", name: "Checkers Law", description: "For your opponent's next 3 turns, if any capture is available to them, they must play a capture. The old rules apply.", flavor: "You touched the board. You take the piece.", icon: "Grid2x2", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves) => {
      const caps = moves.filter((m) => m.captured);
      return caps.length > 0 ? caps : moves;
    }),
  ),
  H6(
    { id: "hx4_plush_cavalry", name: "Plush Cavalry", description: "Your opponent's knights become adorable plush toys for 6 of their turns, and stuffed hooves cannot fight: their knights cannot capture for their next 2 turns.", flavor: "Squeeze one. We dare you.", icon: "ToyBrick", fx: { motif: "muzzle", pieces: ["n"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        for (const sq of mySquares(api.board, api.opp, "n")) dressUp(api, sq, "plush", 6);
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "n" || !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_grave_chill", name: "Grave Chill", description: "A chill rises from below: every enemy piece standing on a dark square is frozen for 1 of their turns. Their king shivers but stays free.", flavor: "The cold keeps excellent records.", icon: "Skull", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (sqShade(sq) === 0) freezeNow(api, sq, 1, "ice");
      }
    }),
  ),
  H6(
    { id: "hx4_quagmire_march", name: "Quagmire March", description: "Your half of the board turns to bog: for your opponent's next 3 turns, any piece of theirs standing in your half may move at most 1 square. Their king is exempt.", flavor: "The deeper they push, the deeper they sink.", icon: "Shovel", fx: { motif: "anchor", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => m.piece === "k" || relRank(api.opp, m.from) <= 4 || moveDist(m) <= 1),
    ),
  ),
  H6(
    { id: "hx4_watchmans_whistle", name: "Watchman's Whistle", description: "For your opponent's next 5 turns, any piece of theirs that gives check to your king is arrested on the spot and frozen for 2 of their turns. Kings are never arrested.", flavor: "Disturbing the peace, one count.", icon: "Siren", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(5, (move, api) => {
      if (move.piece !== "k" && isInCheck(api.board, api.me)) sting(api, move.to, 2, "chains");
    }),
  ),
  H6(
    { id: "hx4_dockmasters_fee", name: "Dockmaster's Fee", description: "For your opponent's next 4 turns, every capture they make is taxed: on the turn after a capture they may only move a pawn or their king.", flavor: "Cargo in, coin out.", icon: "Anchor", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.tax = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.tax as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.tax = move.captured ? 1 : 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        ((inst.state.tax as number) ?? 0) > 0
          ? "the fee falls due next turn"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_ivory_tower", name: "Ivory Tower", description: "For your opponent's next 4 turns, their king may not move toward your side of the board. Sideways and homeward steps are free.", flavor: "The view is lovely. The stairs go only up.", icon: "Building", fx: { motif: "anchor" } },
    curse(4, (moves, api) =>
      moves.filter((m) => m.piece !== "k" || relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
  ),
  H6(
    { id: "hx4_silken_net", name: "Silken Net", description: "Cast a net over a square you choose: every enemy piece except the king within one square of it is frozen for 1 of their turns.", flavor: "One throw, many flies.", icon: "Torus", fx: { motif: "jail" } },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose where the net lands", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        for (const sq of mySquares(api.board, api.opp)) {
          if (cheb(sq, c) <= 1) freezeNow(api, sq, 1, "web");
        }
      },
    ),
  ),
  H6(
    { id: "hx4_lantern_out", name: "Lantern Out", description: "The lights go out at home: for your opponent's next 3 turns, they cannot capture anything standing in their own half of the board.", flavor: "Hard to aim in your own dark hallway.", icon: "LampOff", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        return c == null || relRank(api.opp, c) >= 5;
      }),
    ),
  ),
  H6(
    { id: "hx4_signal_jam", name: "Signal Jam", description: "For your opponent's next 3 turns, none of their pieces may end a move on the same file as their own king. The king itself may move freely.", flavor: "Every order home is static.", icon: "RadioTower", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || FILE(m.to) !== FILE(k));
    }),
  ),
  H6(
    { id: "hx4_donkey_ears", name: "Donkey Ears", description: "Their king sprouts magnificent donkey ears (the dunce cap, worn for 6 of their turns), and the shame stings: for their next 2 turns their king cannot capture anything.", flavor: "The portrait painters are thrilled.", icon: "Crown", fx: { motif: "muzzle" } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        const k = oppKing(api);
        if (k != null) addEffect(api, { kind: "cosmetic", sq: k, owner: api.opp, turns: 6, skin: "dunce" });
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece !== "k" || !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_flooded_flanks", name: "Flooded Flanks", description: "Both edge files (a and h) flood: your opponent's pieces cannot stop on them for their next 3 turns.", flavor: "The riverbanks reclaim their own.", icon: "Waves", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => barNow(api, [...fileSquares(0), ...fileSquares(7)], 3)),
  ),
  H6(
    { id: "hx4_sleepwalkers", name: "Sleepwalkers", description: "For your opponent's next 3 turns, pieces that start a move in their own half cannot capture. Only their pieces already in your half may fight.", flavor: "You cannot swing a sword you dreamt of packing.", icon: "MoonStar", fx: { motif: "muzzle", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter((m) => !m.captured || relRank(api.opp, m.from) >= 5),
    ),
  ),
  H6(
    { id: "hx4_glass_floor", name: "Glass Floor", description: "Every dark square becomes thin glass: for your opponent's next 3 turns their pieces may not stop on dark squares. Their king is exempt.", flavor: "Mind the crunch.", icon: "Square", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves) => moves.filter((m) => m.piece === "k" || sqShade(m.to) === 1)),
  ),
  H6(
    { id: "hx4_pied_piper", name: "Pied Piper", description: "The pipe plays and the infantry follows: for your opponent's next 2 turns, if any pawn move is available they must move a pawn.", flavor: "The tune is older than the town.", icon: "Music2", fx: { motif: "slow", pieces: "all" } },
    curse(2, (moves) => {
      const pawns = moves.filter((m) => m.piece === "p");
      return pawns.length > 0 ? pawns : moves;
    }),
  ),
  H6(
    { id: "hx4_wax_seal", name: "Wax Seal", description: "Their supply lines are sealed: your opponent's next drafted card arrives nullified, and their next offer excludes draft manipulation cards.", flavor: "Stamped by an authority that does not exist.", icon: "Stamp" },
    instant((_inst, api) => {
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
      api.theirs.flags.noDraftCards = (api.theirs.flags.noDraftCards ?? 0) + 1;
    }),
  ),
  H6(
    { id: "hx4_iron_maiden", name: "Iron Maiden", description: "Clamp one enemy rook or queen you target in iron: it is frozen for 2 of their turns.", flavor: "A snug fit, by design.", icon: "Box", fx: { motif: "jail", pieces: ["r", "q"] } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to clamp",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "q";
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) freezeNow(api, picks[0].square, 2, "chains");
      },
    ),
  ),
  H6(
    { id: "hx4_thunderhead", name: "Thunderhead", description: "A storm gathers over their throne, in plain sight: after 2 of your opponent's turns, lightning falls and every piece adjacent to their king is frozen for 1 of their turns.", flavor: "Count the seconds between flash and ruin.", icon: "CloudLightning", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(2, (_move, api, inst) => {
      if (turnsLeft(inst) === 1) {
        const k = oppKing(api);
        if (k == null) return;
        for (const sq of mySquares(api.board, api.opp)) {
          if (sq !== k && cheb(sq, k) <= 1) sting(api, sq, 1, "shock");
        }
      }
    }),
  ),
  H6(
    { id: "hx4_old_laws", name: "The Old Laws", description: "The ancient rulebook is enforced: for your opponent's next 4 turns there is no castling, no two square pawn advance, and no en passant.", flavor: "Before your fancy modern conveniences.", icon: "Scale", fx: { motif: "slow", pieces: ["p", "k"] } },
    curse(4, (moves) =>
      moves.filter(
        (m) =>
          !m.castle &&
          !(m.piece === "p" && Math.abs(RANK(m.to) - RANK(m.from)) === 2) &&
          !(m.captured && m.capturedSquare != null && m.capturedSquare !== m.to),
      ),
    ),
  ),
  H6(
    { id: "hx4_gale_warning", name: "Gale Warning", description: "A gale rakes the rim of the board: for your opponent's next 3 turns, any piece of theirs that ends a move on an edge square is pinned flat and frozen for 1 of their turns. Kings keep their footing.", flavor: "The edge of the world has weather.", icon: "Tornado", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(3, (move, api) => {
      const f = FILE(move.to);
      const r = RANK(move.to);
      if (move.piece !== "k" && (f === 0 || f === 7 || r === 0 || r === 7)) sting(api, move.to, 1, "petal");
    }),
  ),
  H6(
    { id: "hx4_debt_collector", name: "Debt Collector", description: "The collector watches for 5 of your opponent's turns: their second capture in that window is repossessed on the spot, and the capturing piece becomes a walnut for 2 of their turns.", flavor: "The first one is on credit.", icon: "Receipt", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
        inst.state.caps = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          const caps = ((inst.state.caps as number) ?? 0) + 1;
          inst.state.caps = caps;
          if (caps >= 2) {
            nutSting(api, move.to, 2);
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${(inst.state.caps as number) ?? 0}/2 captures, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H6(
    { id: "hx4_velvet_rope", name: "Velvet Rope", description: "Your back rank is roped off: your opponent's pieces cannot stop anywhere on it for their next 4 turns. No entry, no promotion party.", flavor: "Your name is not on the list.", icon: "Ban", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => barNow(api, rankSquares(api.me === "w" ? 0 : 7), 4)),
  ),
  H6(
    { id: "hx4_narcolepsy", name: "Narcolepsy", description: "Two of your opponent's pieces, chosen at random (never the king), fall asleep mid campaign and are frozen for 2 of their turns.", flavor: "The war can wait five minutes.", icon: "BedDouble", fx: { motif: "jail" } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      for (const sq of drawRandom(api, pool, 2)) freezeNow(api, sq, 2, "sleep");
    }),
  ),
  H6(
    { id: "hx4_moat_diggers", name: "Moat Diggers", description: "Your sappers dig 4 pits at random empty squares in your opponent's half: their pieces cannot stop on those squares for their next 3 turns.", flavor: "They work nights. You will notice mornings.", icon: "Pickaxe", fx: { motif: "blindfold" } },
    instant((_inst, api) => {
      const pool = emptySquares(api.board, (sq) => relRank(api.opp, sq) <= 4);
      barNow(api, drawRandom(api, pool, 4), 3);
    }),
  ),
];

// ------------------------------- TIER 7 ------------------------------------
// Severe curses: draft locks, mass petrify, army-wide leashes, big zone seals.

const T7: Buff[] = [
  H7(
    { id: "hx4_iron_portcullis", name: "Iron Portcullis", description: "The armory gate slams shut: your opponent's next 2 drafts are skipped outright. They get nothing those rounds.", flavor: "Requisitions are closed until further notice.", icon: "Grid3x3" },
    blockDrafts(2),
  ),
  H7(
    { id: "hx4_stone_garden", name: "Stone Garden", description: "All of your opponent's knights, bishops and rooks turn to walnuts for 1 of their turns: heavy nuts that can only shuffle one square at a time.", flavor: "Arranged tastefully. Screaming silently.", icon: "Trees", fx: { motif: "anchor", pieces: ["n", "b", "r"] } },
    walnutAll(["n", "b", "r"], 1),
  ),
  H7(
    { id: "hx4_lovestruck_majesty", name: "Lovestruck Majesty", description: "Your opponent's queen falls head over heels and is frozen, swooning, for 2 of their turns.", flavor: "She has written four sonnets already.", icon: "Heart", fx: { motif: "jail", pieces: ["q"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "q")) freezeNow(api, sq, 2, "charm");
    }),
  ),
  H7(
    { id: "hx4_royal_quarantine", name: "Royal Quarantine", description: "Their king is declared contagious: for your opponent's next 4 turns, none of their pieces may end a move adjacent to their own king. The king itself moves freely.", flavor: "Get well soon, Your Majesty. From a distance.", icon: "ShieldAlert", fx: { motif: "blindfold", pieces: "all" } },
    curse(4, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || cheb(m.to, k) > 1);
    }),
  ),
  H7(
    { id: "hx4_falling_rubble", name: "Falling Rubble", description: "Collapse a 2x2 block of squares you choose: your opponent's pieces cannot stop on any of those 4 squares for their next 3 turns.", flavor: "The masonry has opinions about trespassers.", icon: "Blocks", fx: { motif: "blindfold" } },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Pick the bottom-left square of the block",
              squares: Array.from({ length: 64 }, (_, i) => i).filter((sq) => FILE(sq) <= 6 && RANK(sq) <= 6),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        barNow(api, [c, c + 1, c + 8, c + 9], 3);
      },
    ),
  ),
  H7(
    { id: "hx4_the_long_night", name: "The Long Night", description: "Darkness swallows their camp: for your opponent's next 2 turns, every piece they own may move at most 1 square. King captures are always allowed.", flavor: "Nobody marches far by candlelight.", icon: "MoonStar", fx: { motif: "anchor", pieces: "all" } },
    instant((_inst, api) => addEffect(api, { kind: "short_leash", owner: api.opp, turns: 2 })),
  ),
  H7(
    { id: "hx4_kraken_arms", name: "Kraken Arms", description: "Three tentacles burst from the board: choose 3 enemy pieces (never the king), and each is held fast, frozen for 1 of their turns.", flavor: "It only has three arms free. Lucky you.", icon: "Shell", fx: { motif: "jail" } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 3
          ? null
          : {
              kind: "square",
              label: `Choose a piece to grab (${picks.length + 1}/3)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square != null) freezeNow(api, k.square, 1, "slime");
        }
      },
    ),
  ),
  H7(
    { id: "hx4_scorched_diagonal", name: "Scorched Diagonal", description: "The great a1 to h8 diagonal burns: your opponent's pieces cannot stop on any of its 8 squares for their next 3 turns.", flavor: "The longest road in the kingdom, closed for repairs.", icon: "Flame", fx: { motif: "blindfold" } },
    instant((_inst, api) => barNow(api, Array.from({ length: 8 }, (_, i) => SQ(i, i)), 3)),
  ),
  H7(
    { id: "hx4_tribute_demand", name: "Tribute Demand", description: "For your opponent's next 5 turns, every capture they make demands tribute: whichever of their other pieces stands nearest the kill is frozen for 1 of their turns.", flavor: "Victory is taxed at the source.", icon: "HandCoins", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(5, (move, api) => {
      if (!move.captured) return;
      let best: Square | null = null;
      let bd = Infinity;
      for (const sq of mySquares(api.board, api.opp)) {
        if (sq === move.to || api.board.pieces[sq]!.type === "k") continue;
        const d = cheb(move.to, sq);
        if (d < bd || (d === bd && best != null && sq < best)) {
          bd = d;
          best = sq;
        }
      }
      if (best != null) sting(api, best, 1, "chains");
    }),
  ),
  H7(
    { id: "hx4_field_of_spears", name: "Field of Spears", description: "Your pawns raise a hedge of spears: for your opponent's next 3 turns, their pieces may not stop on any square one of your pawns attacks. Their king is exempt.", flavor: "Walk anywhere you like. Except there. Or there.", icon: "Swords", fx: { motif: "blindfold", pieces: "all" } },
    curse(3, (moves, api) => {
      const threat = myPawnThreats(api);
      return moves.filter((m) => m.piece === "k" || !threat.has(m.to));
    }),
  ),
  H7(
    { id: "hx4_hearth_frost", name: "Hearth Frost", description: "Frost creeps into their barracks: every enemy pawn still standing on its owner's second rank is frozen for 2 of their turns.", flavor: "The fire went out sometime around midnight.", icon: "House", fx: { motif: "jail", pieces: ["p"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp, "p")) {
        if (relRank(api.opp, sq) === 2) freezeNow(api, sq, 2, "ice");
      }
    }),
  ),
  H7(
    { id: "hx4_command_paralysis", name: "Command Paralysis", description: "Their high command falls silent: for your opponent's next 3 turns, they may only move pieces standing in your half of the board. If they have none there, they move freely that turn.", flavor: "The ones at the front stopped waiting for orders.", icon: "Radio", fx: { motif: "jail", pieces: "all" } },
    curse(3, (moves, api) => moves.filter((m) => relRank(api.opp, m.from) >= 5)),
  ),
  H7(
    { id: "hx4_gorgon_field", name: "Gorgon Field", description: "A gorgon's gaze sweeps the middle of the board: for your opponent's next 4 turns, any piece of theirs that ends a move on the central 4x4 (c3 to f6) becomes a walnut for 1 of their turns. Kings resist the gaze.", flavor: "Admire the centre from a distance.", icon: "Eye", fx: { motif: "anchor", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      const f = FILE(move.to);
      const r = RANK(move.to);
      if (move.piece !== "k" && f >= 2 && f <= 5 && r >= 2 && r <= 5) nutSting(api, move.to, 1);
    }),
  ),
  H7(
    { id: "hx4_eclipse", name: "Eclipse", description: "The sun goes out over their camp: on your opponent's next turn only their king may move, and their pawns cannot advance for their next 3 turns.", flavor: "The astrologers swore this was impossible.", icon: "CircleOff", fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
    }),
  ),
  H7(
    { id: "hx4_lead_rain", name: "Lead Rain", description: "A rain of lead pins the field: 4 of your opponent's pieces, chosen at random (never the king), are frozen for 1 of their turns.", flavor: "The forecast said scattered showers.", icon: "CloudHail", fx: { motif: "jail" } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      for (const sq of drawRandom(api, pool, 4)) freezeNow(api, sq, 1, "cement");
    }),
  ),
  H7(
    { id: "hx4_oathbreakers_brand", name: "Oathbreaker's Brand", description: "A brand hangs over their castle gate for their next 6 turns: if your opponent castles in that window, the castling rook is frozen for 3 of their turns and their king wears the dunce cap for 8.", flavor: "The oath was witnessed. The penalty was notarized.", icon: "FileWarning", fx: { motif: "slow", pieces: ["r", "k"] } },
    onTheirMove(6, (move, api) => {
      if (!move.castle) return;
      const rank = RANK(move.to);
      const rookSq = FILE(move.to) === 6 ? SQ(5, rank) : SQ(3, rank);
      sting(api, rookSq, 3, "chains");
      addEffect(api, { kind: "cosmetic", sq: move.to, owner: api.opp, turns: 8, skin: "dunce" });
    }),
  ),
  H7(
    { id: "hx4_glass_prison", name: "Glass Prison", description: "Seal one enemy rook or queen you target inside a glass bubble: it is frozen for 3 of their turns, in full view and utterly stuck.", flavor: "Museum quality containment.", icon: "GlassWater", fx: { motif: "jail", pieces: ["r", "q"] } },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to seal",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "r" || t === "q";
              }),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) freezeNow(api, picks[0].square, 3, "bubble");
      },
    ),
  ),
  H7(
    { id: "hx4_broken_supply", name: "Broken Supply", description: "Their supply wagons are looted: your opponent's next 3 drafted cards arrive nullified. They still pick; the cards do nothing.", flavor: "The crates arrived. The contents did not.", icon: "PackageX" },
    nullifyDrafts(3),
  ),
  H7(
    { id: "hx4_tidal_wall", name: "Tidal Wall", description: "A wall of seawater stands across the middle of the board: your opponent's pieces cannot stop on either central rank (the 4th and 5th) for their next 2 turns.", flavor: "The tide takes sides.", icon: "Waves", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => barNow(api, [...rankSquares(3), ...rankSquares(4)], 2)),
  ),
  H7(
    { id: "hx4_treacle_tide", name: "Treacle Tide", description: "Treacle floods their camp: for your opponent's next 4 turns, any piece of theirs standing in their own half may move at most 1 square. Their king is exempt, and pieces already in your half are free.", flavor: "Sweet, slow, and knee deep.", icon: "IceCreamCone", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter((m) => m.piece === "k" || relRank(api.opp, m.from) >= 5 || moveDist(m) <= 1),
    ),
  ),
  H7(
    { id: "hx4_traitors_gala", name: "Traitor's Gala", description: "Two of your opponent's knights or bishops, chosen at random, drink the wrong toast and become walnuts for 2 of their turns.", flavor: "The wine list was curated by the enemy.", icon: "Wine", fx: { motif: "anchor", pieces: ["n", "b"] } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter((sq) => {
        const t = api.board.pieces[sq]!.type;
        return t === "n" || t === "b";
      });
      for (const sq of drawRandom(api, pool, 2)) nutNow(api, sq, 2);
    }),
  ),
  H7(
    { id: "hx4_dead_march", name: "Dead March", description: "For your opponent's next 6 turns, the drums forbid haste: on every second turn (the 2nd, 4th and 6th) their rooks and queen cannot move.", flavor: "Step. Rest. Step. Rest.", icon: "Drum", fx: { motif: "slow", pieces: ["r", "q"] } },
    cadenceCurse(6, (e) => e % 2 === 1, (moves) => moves.filter((m) => m.piece !== "r" && m.piece !== "q")),
  ),
  H7(
    { id: "hx4_hunters_moon", name: "Hunter's Moon", description: "For your opponent's next 4 turns, any piece of theirs that captures is cursed by the moon and becomes a walnut for 2 of their turns. Kings are beyond the curse.", flavor: "Feast tonight, hobble tomorrow.", icon: "Moon", fx: { motif: "muzzle", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (move.captured && move.piece !== "k") nutSting(api, move.to, 2);
    }),
  ),
  H7(
    { id: "hx4_castle_of_sand", name: "Castle of Sand", description: "Both of your opponent's rooks crumble into walnuts for 4 of their turns: heavy husks that can only shuffle one square at a time.", flavor: "The tide always finds the towers.", icon: "Castle", fx: { motif: "anchor", pieces: ["r"] } },
    walnutAll(["r"], 4),
  ),
  H7(
    { id: "hx4_veil_of_moths", name: "Veil of Moths", description: "A living veil settles over your half of the board: for your opponent's next 4 turns, they cannot capture anything standing in your half.", flavor: "A thousand wings between the blade and the mark.", icon: "Bug", fx: { motif: "muzzle", pieces: "all" } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        const c = capSq(m);
        return c == null || relRank(api.opp, c) <= 4;
      }),
    ),
  ),
  H7(
    { id: "hx4_choke_point", name: "Choke Point", description: "Caltrops blanket the central 4x4 (c3 to f6): your opponent's pieces may not stop anywhere in it for their next 2 turns. Their king picks its way through freely.", flavor: "The middle of the map is mostly spikes now.", icon: "Hexagon", fx: { motif: "blindfold", pieces: "all" } },
    curse(2, (moves) =>
      moves.filter((m) => {
        if (m.piece === "k") return true;
        const f = FILE(m.to);
        const r = RANK(m.to);
        return !(f >= 2 && f <= 5 && r >= 2 && r <= 5);
      }),
    ),
  ),
  H7(
    { id: "hx4_muster_silence", name: "Muster of Silence", description: "For your opponent's next 3 turns, any piece of theirs that is defended by another of their pieces may not move. Only the unguarded stragglers may act. Their king is exempt.", flavor: "The protected wait. The forgotten work.", icon: "VolumeX", fx: { motif: "jail", pieces: "all" } },
    curse(3, (moves, api) =>
      moves.filter(
        (m) =>
          m.piece === "k" ||
          !mySquares(api.board, api.opp).some((s) => s !== m.from && attacks(api, s, m.from)),
      ),
    ),
  ),
  H7(
    { id: "hx4_grim_procession", name: "Grim Procession", description: "For your opponent's next 4 turns, no piece of theirs may end a move farther from their own king than it started. The army huddles toward the crown. Their king walks free.", flavor: "The court draws in like a fist closing.", icon: "Users", fx: { motif: "anchor", pieces: "all" } },
    curse(4, (moves, api) => {
      const k = oppKing(api);
      if (k == null) return moves;
      return moves.filter((m) => m.piece === "k" || cheb(m.to, k) <= cheb(m.from, k));
    }),
  ),
  H7(
    { id: "hx4_famine_year", name: "Famine Year", description: "The harvest fails utterly: your opponent's pawns cannot advance for their next 5 turns. They may still capture diagonally.", flavor: "Nothing to eat, nowhere to go.", icon: "WheatOff", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 5 })),
  ),
  H7(
    { id: "hx4_wheel_of_ice", name: "Wheel of Ice", description: "A ribbon of ice sweeps the board one file per turn, starting at the a file: for your opponent's next 4 turns, their pieces standing on the current icy file cannot move. Their king is exempt.", flavor: "You can hear it coming, column by column.", icon: "LoaderCircle", fx: { motif: "jail", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
      },
      filterOpponentMoves: (moves, inst) => {
        const left = turnsLeft(inst);
        if (left <= 0 || moves.length === 0) return moves;
        const file = 4 - left; // a, then b, c, d
        const kept = moves.filter((m) => m.piece === "k" || FILE(m.from) !== file);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H7(
    { id: "hx4_clipped_diagonals", name: "Clipped Diagonals", description: "For your opponent's next 4 turns, their bishops and queen may slide at most 2 squares along diagonals. Straight queen moves are untouched.", flavor: "Somebody trimmed all the corners off the map.", icon: "Scissors", fx: { motif: "anchor", pieces: ["b", "q"] } },
    curse(4, (moves) =>
      moves.filter((m) => {
        if (m.piece !== "b" && m.piece !== "q") return true;
        const diag = Math.abs(FILE(m.to) - FILE(m.from)) === Math.abs(RANK(m.to) - RANK(m.from));
        return !diag || moveDist(m) <= 2;
      }),
    ),
  ),
  H7(
    { id: "hx4_frozen_harbor", name: "Frozen Harbor", description: "The queenside harbor ices over: every enemy piece standing on files a, b or c is frozen for 1 of their turns. Their king stays free.", flavor: "No ships in, no ships out.", icon: "Ship", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (FILE(sq) <= 2) freezeNow(api, sq, 1, "ice");
      }
    }),
  ),
  H7(
    { id: "hx4_burden_of_command", name: "Burden of Command", description: "For your opponent's next 4 turns, every time their queen moves, the whole army stops to salute: on their following turn they may move only their king.", flavor: "Protocol is the heaviest piece on the board.", icon: "Medal", fx: { motif: "slow", pieces: ["q"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.tax = 0;
      },
      filterOpponentMoves: (moves, inst) => {
        if (((inst.state.tax as number) ?? 0) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0) {
          inst.state.tax = move.piece === "q" ? 1 : 0;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        ((inst.state.tax as number) ?? 0) > 0
          ? "the salute falls due next turn"
          : `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H7(
    { id: "hx4_echo_chamber", name: "Echo Chamber", description: "For your opponent's next 4 turns, they may not move a piece of the same type as the piece you moved on your previous turn. Their king is always allowed.", flavor: "Whatever you say, they must not say back.", icon: "Megaphone", fx: { motif: "slow", pieces: "all" } },
    curse(4, (moves, api) => {
      const hist = api.board.history;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].color === api.me) {
          const t = hist[i].piece;
          return moves.filter((m) => m.piece === "k" || m.piece !== t);
        }
      }
      return moves;
    }),
  ),
  H7(
    { id: "hx4_spiders_parlor", name: "Spider's Parlor", description: "Invisible webs stretch between the armies: for your opponent's next 3 turns, any piece of theirs that ends a move adjacent to one of your pieces is snared and frozen for 1 of their turns. Kings tear free.", flavor: "Do come closer, said the spider.", icon: "Waypoints", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(3, (move, api) => {
      if (move.piece === "k") return;
      const near = mySquares(api.board, api.me).some((s) => cheb(s, move.to) <= 1);
      if (near) sting(api, move.to, 1, "web");
    }),
  ),
  H7(
    { id: "hx4_last_toll", name: "The Last Toll", description: "The great bell rings twice: your opponent skips their next turn, and on the turn after that they may only move a pawn or their king.", flavor: "Once for silence. Once for obedience.", icon: "BellElectric", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 1;
        api.bs.skips[api.opp] += 1;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => m.piece === "p" || m.piece === "k");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => (turnsLeft(inst) > 0 ? "the second toll still hangs in the air" : null),
    },
  ),
  H7(
    { id: "hx4_crossbow_curfew", name: "Crossbow Curfew", description: "Ranged warfare is outlawed: for your opponent's next 4 turns, they may only capture from 1 square away. Long range kills are forbidden.", flavor: "If you want it dead, walk over and say so.", icon: "Crosshair", fx: { motif: "muzzle", pieces: "all" } },
    curse(4, (moves) => moves.filter((m) => !m.captured || moveDist(m) <= 1)),
  ),
];

// ------------------------------- TIER 8 ------------------------------------
// Events: the board changes shape for a while and everyone can feel it.

const T8: Buff[] = [
  H8(
    { id: "hx4_walnut_crown", name: "The Walnut Crown", description: "Your opponent's queen becomes a walnut for 2 of their turns: the mightiest piece on the board reduced to a slow, dignified shuffle.", flavor: "Heavy is the head. Heavier is the shell.", icon: "Nut", fx: { motif: "anchor", pieces: ["q"] } },
    walnutAll(["q"], 2),
  ),
  H8(
    { id: "hx4_great_glacier", name: "The Great Glacier", description: "A glacier grinds across their entire army: every enemy piece except the king is frozen for 1 of their turns.", flavor: "The age of ice does not negotiate.", icon: "Snowflake", fx: { motif: "jail", pieces: "all" } },
    freezeAllEnemies(1, "ice"),
  ),
  H8(
    { id: "hx4_sealed_meridian", name: "Sealed Meridian", description: "Choose a file: it is sealed against your opponent for 3 of their turns. None of their pieces may stop on it or cross it, while yours pass freely.", flavor: "The cartographers simply removed the road.", icon: "AlignVerticalJustifyCenter", fx: { motif: "blindfold" } },
    activated(
      (_inst, _api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Pick any square on the file to seal", squares: Array.from({ length: 64 }, (_, i) => i) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) barNow(api, fileSquares(FILE(picks[0].square)), 3);
      },
    ),
  ),
  H8(
    { id: "hx4_hundred_year_nap", name: "Hundred Year Nap", description: "Put one enemy piece you target into an enchanted sleep: it is frozen for 4 of their turns. Kings cannot be enchanted.", flavor: "The briars grew before anyone thought to argue.", icon: "Bed", fx: { motif: "jail" } },
    freezeTarget(4, "sleep"),
  ),
  H8(
    { id: "hx4_brittle_arsenal", name: "Brittle Arsenal", description: "Every enemy bishop, rook and queen turns to a walnut for 1 of their turns: the whole long range arsenal reduced to shuffling.", flavor: "All that reach, and nothing to reach with.", icon: "Hammer", fx: { motif: "anchor", pieces: ["b", "r", "q"] } },
    walnutAll(["b", "r", "q"], 1),
  ),
  H8(
    { id: "hx4_royal_lockdown", name: "Royal Lockdown", description: "Their realm grinds to a halt: your opponent skips their next turn, and on their first turn after that only their king may move.", flavor: "By royal decree, nothing happens.", icon: "Landmark", fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => {
      api.bs.skips[api.opp] += 1;
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),
  H8(
    { id: "hx4_winter_that_stays", name: "The Winter That Stays", description: "For your opponent's next 5 turns, any piece of theirs that travels more than 2 squares in one move arrives frostbitten and is frozen for 1 of their turns. Kings endure the cold.", flavor: "Speed is a summer habit.", icon: "ThermometerSnowflake", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(5, (move, api) => {
      if (move.piece !== "k" && moveDist(move) > 2) sting(api, move.to, 1, "ice");
    }),
  ),
  H8(
    { id: "hx4_the_long_siege", name: "The Long Siege", description: "Your opponent's pawns cannot advance for their next 8 turns. Diagonal captures remain their only forward step.", flavor: "The walls will still be here in spring.", icon: "Castle", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 8 })),
  ),
  H8(
    { id: "hx4_shattered_council", name: "Shattered Council", description: "Their war council collapses: their queen and both rooks are frozen for 1 of their turns, and their next drafted card arrives nullified.", flavor: "The table broke first. The alliance followed.", icon: "Users", fx: { motif: "jail", pieces: ["q", "r"] } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        const t = api.board.pieces[sq]!.type;
        if (t === "q" || t === "r") freezeNow(api, sq, 1, "stun");
      }
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  H8(
    { id: "hx4_iron_ring", name: "The Iron Ring", description: "An iron ring closes around the board's rim: your opponent's pieces cannot stop on any edge square for their next 2 turns.", flavor: "The world got smaller while they slept.", icon: "Circle", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => {
      const edge: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        const f = FILE(sq);
        const r = RANK(sq);
        if (f === 0 || f === 7 || r === 0 || r === 7) edge.push(sq);
      }
      barNow(api, edge, 2);
    }),
  ),
  H8(
    { id: "hx4_puppet_court", name: "Puppet Court", description: "Every officer's strings are cut: for your opponent's next 3 turns they may move only pawns and their king.", flavor: "The puppeteer stepped out for a smoke.", icon: "Drama", fx: { motif: "jail", pieces: ["n", "b", "r", "q"] } },
    curse(3, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),
  H8(
    { id: "hx4_avalanche_pass", name: "Avalanche Pass", description: "Snow buries both central files: your opponent's pieces cannot stop on the d or e file for their next 2 turns, while yours climb freely.", flavor: "The mountain closed the road on purpose.", icon: "MountainSnow", fx: { motif: "blindfold" } },
    instant((_inst, api) => barNow(api, [...fileSquares(3), ...fileSquares(4)], 2)),
  ),
  H8(
    { id: "hx4_debt_of_crowns", name: "Debt of Crowns", description: "The crown's debts are called in: your opponent's next draft is skipped outright, and the 2 drafted cards after that arrive nullified.", flavor: "Compound interest, sovereign edition.", icon: "Coins" },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 2;
    }),
  ),
  H8(
    { id: "hx4_blood_price", name: "Blood Price", description: "For your opponent's next 4 turns, killing has a price: each of their first 2 captures in that window costs them their following turn, skipped outright.", flavor: "Pay at the moment of purchase.", icon: "Banknote", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.paid = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured) {
          const paid = ((inst.state.paid as number) ?? 0) + 1;
          inst.state.paid = paid;
          api.bs.skips[api.opp] += 1;
          if (paid >= 2) {
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${(inst.state.paid as number) ?? 0}/2 prices paid, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H8(
    { id: "hx4_gorgons_court", name: "Gorgon's Court", description: "Choose 2 enemy pieces (never the king): both become walnuts for 3 of their turns.", flavor: "Two more statues for the east wing.", icon: "Landmark", fx: { motif: "anchor" } },
    activated(
      (_inst, api, picks) =>
        picks.length >= 2
          ? null
          : {
              kind: "square",
              label: `Choose a piece to petrify (${picks.length + 1}/2)`,
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k" && !picks.some((k) => k.square === sq),
              ),
            },
      (_inst, api, picks) => {
        for (const k of picks) {
          if (k.square != null) nutNow(api, k.square, 3);
        }
      },
    ),
  ),
  H8(
    { id: "hx4_maze_of_thorns", name: "Maze of Thorns", description: "Thorn hedges spring up across every lane: for your opponent's next 5 turns, no piece of theirs may move more than 1 square, except knights, who leap the hedges. Their king is exempt.", flavor: "The garden won the war.", icon: "Flower2", fx: { motif: "anchor", pieces: "all" } },
    curse(5, (moves) => moves.filter((m) => m.piece === "k" || m.piece === "n" || moveDist(m) <= 1)),
  ),
  H8(
    { id: "hx4_frozen_reserves", name: "Frozen Reserves", description: "The reserves never got the mobilization order: every enemy piece standing on their own back rank is frozen for 2 of their turns. Their king is spared.", flavor: "The barracks doors froze shut from the inside.", icon: "Warehouse", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (relRank(api.opp, sq) === 1) freezeNow(api, sq, 2, "ice");
      }
    }),
  ),
  H8(
    { id: "hx4_toy_box", name: "The Toy Box", description: "Their entire army is turned into plush toys for 8 of their turns (a purely cosmetic indignity), and toys need a moment to remember war: on their next turn every piece may move at most 1 square.", flavor: "Please keep all buttons and stuffing inside the board.", icon: "Gift", fx: { motif: "slow", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type !== "k") dressUp(api, sq, "plush", 8);
      }
      addEffect(api, { kind: "short_leash", owner: api.opp, turns: 1 });
    }),
  ),
  H8(
    { id: "hx4_severed_lines", name: "Severed Lines", description: "Their supply roads are cut: your opponent's pieces cannot stop on their own 3rd or 4th rank for their next 2 turns.", flavor: "An army is a stomach with banners.", icon: "Unlink", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        const rr = relRank(api.opp, sq);
        if (rr === 3 || rr === 4) squares.push(sq);
      }
      barNow(api, squares, 2);
    }),
  ),
  H8(
    { id: "hx4_doomsday_clock", name: "Doomsday Clock", description: "A great clock begins to tick, in full view: after 4 of your opponent's turns, every piece of theirs then standing in your half of the board becomes a walnut for 2 of their turns.", flavor: "Midnight is a place, and they are marching into it.", icon: "AlarmClock", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(4, (_move, api, inst) => {
      if (turnsLeft(inst) === 1) {
        for (const sq of mySquares(api.board, api.opp)) {
          if (relRank(api.opp, sq) >= 5) nutSting(api, sq, 2);
        }
      }
    }),
  ),
  H8(
    { id: "hx4_kings_ransom", name: "King's Ransom", description: "For your opponent's next 4 turns, every time their king moves, the ransom is collected: 2 of their other pieces, chosen at random, are frozen for 1 of their turns.", flavor: "The crown travels. The treasury pays.", icon: "Gem", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(4, (move, api) => {
      if (move.piece !== "k") return;
      const pool = mySquares(api.board, api.opp).filter(
        (sq) => sq !== move.to && api.board.pieces[sq]!.type !== "k",
      );
      for (const sq of drawRandom(api, pool, 2)) sting(api, sq, 1, "chains");
    }),
  ),
  H8(
    { id: "hx4_no_quarter", name: "No Quarter", description: "Your half of the board rejects the invasion: every enemy piece currently standing in your half becomes a walnut for 2 of their turns.", flavor: "The land itself refuses them.", icon: "ShieldBan", fx: { motif: "anchor", pieces: "all" } },
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (relRank(api.opp, sq) >= 5) nutNow(api, sq, 2);
      }
    }),
  ),
  H8(
    { id: "hx4_pawn_embargo", name: "Pawn Embargo", description: "For your opponent's next 6 turns, their pawns may not enter or move within your half of the board. The infantry is stopped at the border.", flavor: "Papers, please. Denied.", icon: "FileX2", fx: { motif: "anchor", pieces: ["p"] } },
    curse(6, (moves, api) => moves.filter((m) => m.piece !== "p" || relRank(api.opp, m.to) <= 4)),
  ),
  H8(
    { id: "hx4_tempest", name: "Tempest", description: "A storm tears across the board: 6 random empty squares become impassable wreckage your opponent cannot stop on for their next 3 turns, and 2 of their pieces, chosen at random, are stunned frozen for 1 of their turns.", flavor: "The sky finally picked a side.", icon: "CloudLightning", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => {
      barNow(api, drawRandom(api, emptySquares(api.board), 6), 3);
      const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      for (const sq of drawRandom(api, pool, 2)) freezeNow(api, sq, 1, "shock");
    }),
  ),
  H8(
    { id: "hx4_crown_of_lead", name: "Crown of Lead", description: "Their king is crowned with lead and wears the dunce cap for 10 of their turns. Under its weight, for their next 3 turns no piece standing adjacent to their king may capture.", flavor: "It was gold last week. Funny thing, alchemy.", icon: "Crown", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        const k = oppKing(api);
        if (k != null) addEffect(api, { kind: "cosmetic", sq: k, owner: api.opp, turns: 10, skin: "dunce" });
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const k = oppKing(api);
        if (k == null) return moves;
        const kept = moves.filter((m) => !m.captured || cheb(m.from, k) > 1);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H8(
    { id: "hx4_great_waltz", name: "The Great Waltz", description: "The board itself calls the dance: for your opponent's next 3 turns they may only move pieces standing on the color the waltz names, dark squares first, then light, then dark. Their king may always dance.", flavor: "One two three, one two three.", icon: "Music4", fx: { motif: "slow", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      filterOpponentMoves: (moves, inst) => {
        const left = turnsLeft(inst);
        if (left <= 0 || moves.length === 0) return moves;
        const want = (3 - left) % 2; // 0 dark, 1 light
        const kept = moves.filter((m) => m.piece === "k" || sqShade(m.from) === want);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H8(
    { id: "hx4_reapers_due", name: "Reaper's Due", description: "The reaper collects from the front line: your opponent's 3 most advanced pieces (never the king) are frozen for 2 of their turns.", flavor: "The scythe starts with the tallest wheat.", icon: "Scissors", fx: { motif: "jail", pieces: "all" } },
    instant((_inst, api) => {
      const front = mySquares(api.board, api.opp)
        .filter((sq) => api.board.pieces[sq]!.type !== "k")
        .sort((a, b) => relRank(api.opp, b) - relRank(api.opp, a) || a - b)
        .slice(0, 3);
      for (const sq of front) freezeNow(api, sq, 2, "stone");
    }),
  ),
  H8(
    { id: "hx4_burned_keep", name: "The Burned Keep", description: "Their castle burns to the ground: your opponent may never castle again this game, and both of their rooks, busy fighting the fire, are frozen for 1 of their turns.", flavor: "Insurance does not cover acts of hex.", icon: "FlameKindling", fx: { motif: "jail", pieces: ["r", "k"] } },
    {
      kind: "passive",
      init: (_inst, api) => {
        for (const sq of mySquares(api.board, api.opp, "r")) freezeNow(api, sq, 1, "shock");
      },
      filterOpponentMoves: (moves) => {
        if (moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.castle);
        return kept.length > 0 ? kept : moves;
      },
      status: () => "their castle is ash",
    },
  ),
  H8(
    { id: "hx4_sated_blades", name: "Sated Blades", description: "For your opponent's next 4 turns, each of their pieces may kill only once: a piece that captures in that window cannot capture again until the curse lifts.", flavor: "A full blade is a lazy blade.", icon: "Utensils", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.sated = [] as Square[];
      },
      filterOpponentMoves: (moves, inst) => {
        const sated = (inst.state.sated as Square[] | undefined) ?? [];
        if (turnsLeft(inst) <= 0 || sated.length === 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.captured || !sated.includes(m.from));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        let sated = ((inst.state.sated as Square[] | undefined) ?? [])
          .map((s) => followSq(s, move))
          .filter((s): s is Square => s != null);
        if (move.color === api.opp && turnsLeft(inst) > 0 && move.captured && move.piece !== "k") {
          if (!sated.includes(move.to)) sated = [...sated, move.to];
        }
        inst.state.sated = sated;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
  H8(
    { id: "hx4_banquet_of_dust", name: "Banquet of Dust", description: "Their heavy pieces are seated at a feast of nothing: for your opponent's next 5 turns, their queen and rooks cannot capture.", flavor: "Course after course of empty plates.", icon: "UtensilsCrossed", fx: { motif: "muzzle", pieces: ["r", "q"] } },
    curse(5, (moves) => moves.filter((m) => (m.piece !== "q" && m.piece !== "r") || !m.captured)),
  ),
  H8(
    { id: "hx4_eternal_toll", name: "Eternal Toll", description: "The border levies its toll without mercy: for your opponent's next 6 turns, any piece of theirs that crosses the midline into your half is frozen for 1 of their turns on arrival. Kings cross free.", flavor: "The gate never sleeps and never waives a fee.", icon: "Landmark", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(6, (move, api) => {
      if (move.piece !== "k" && relRank(api.opp, move.from) <= 4 && relRank(api.opp, move.to) >= 5) {
        sting(api, move.to, 1, "quicksand");
      }
    }),
  ),
  H8(
    { id: "hx4_wall_of_teeth", name: "Wall of Teeth", description: "Your two back ranks grow a wall of teeth: your opponent's pieces cannot stop anywhere on them for their next 3 turns. No infiltration, no promotion.", flavor: "The fortress smiled, and the siege reconsidered.", icon: "Fence", fx: { motif: "blindfold", pieces: "all" } },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let sq = 0; sq < 64; sq++) {
        if (relRank(api.opp, sq) >= 7) squares.push(sq);
      }
      barNow(api, squares, 3);
    }),
  ),
  H8(
    { id: "hx4_black_lotus", name: "Black Lotus", description: "The lotus blooms once over their army: one random pawn, knight, bishop, rook and queen of theirs (one of each they still have) is frozen for 2 of their turns.", flavor: "Five petals, five sleepers.", icon: "Flower", fx: { motif: "jail" } },
    instant((_inst, api) => {
      for (const t of ["p", "n", "b", "r", "q"] as const) {
        const pool = mySquares(api.board, api.opp, t);
        if (pool.length > 0) freezeNow(api, pool[api.rng.int(pool.length)], 2, "petal");
      }
    }),
  ),
  H8(
    { id: "hx4_tithe_of_silence", name: "Tithe of Silence", description: "For your opponent's next 6 turns, shouting at a king is taxed: each of their first 2 checks against your king costs them their following turn, skipped outright.", flavor: "You may speak. You may not be heard.", icon: "MicOff", fx: { motif: "muzzle", pieces: "all" } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.paid = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && turnsLeft(inst) > 0 && isInCheck(api.board, api.me)) {
          const paid = ((inst.state.paid as number) ?? 0) + 1;
          inst.state.paid = paid;
          api.bs.skips[api.opp] += 1;
          if (paid >= 2) {
            inst.spent = true;
            return;
          }
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) => `${(inst.state.paid as number) ?? 0}/2 tithes, ${turnsLeft(inst)} of their turns left`,
    },
  ),
  H8(
    { id: "hx4_stone_rain", name: "Stone Rain", description: "Petrifying hail sweeps their lines: 5 of your opponent's pieces, chosen at random (never the king), become walnuts for 1 of their turns.", flavor: "The weather report said gravel.", icon: "CloudHail", fx: { motif: "anchor" } },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
      for (const sq of drawRandom(api, pool, 5)) nutNow(api, sq, 1);
    }),
  ),
  H8(
    { id: "hx4_tolling_thirds", name: "The Tolling Thirds", description: "A funeral bell counts your opponent's turns: on their 3rd and 6th turns from now, their most valuable piece (never the king) is frozen for 1 of their turns as the bell tolls.", flavor: "It knows exactly whom it tolls for.", icon: "Bell", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(6, (_move, api, inst) => {
      if (turnsLeft(inst) % 3 === 1) {
        const best = victimByValue(api);
        if (best.length > 0) sting(api, best[0], 1, "stun");
      }
    }),
  ),
  H8(
    { id: "hx4_mirror_of_winter", name: "Mirror of Winter", description: "A sympathetic frost binds their army: for your opponent's next 2 turns, whenever they move a piece, every OTHER piece they own of that same type is frozen for 1 of their turns.", flavor: "When one soldier shivers, the regiment catches cold.", icon: "Copy", fx: { motif: "slow", pieces: "all" } },
    onTheirMove(2, (move, api) => {
      if (move.piece === "k") return;
      for (const sq of mySquares(api.board, api.opp, move.piece)) {
        if (sq !== move.to) sting(api, sq, 1, "ice");
      }
    }),
  ),
];

export const HEX_WAVE4B: Buff[] = [...T5, ...T6, ...T7, ...T8];
