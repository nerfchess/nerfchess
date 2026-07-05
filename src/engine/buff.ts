import { Tier } from "./nerf";
import { BoardState, Color, Move, PieceType, Square } from "./types";
import { RNG } from "./rng";

// ---------------------------------------------------------------------------
// Buff system core types.
//
// Buffs are the positive half of the draft loop: every game opens with a nerf
// draft (pick 1 of 2 handicaps), then every few moves each player drafts a
// buff. Buffs climb in tier as the game goes on. See docs/draft-system.md.
// ---------------------------------------------------------------------------

export type BuffCategory =
  | "movement" // new ways for pieces to move
  | "pieces" // summons, revivals, promotions, conversions
  | "tempo" // extra moves, skips, freezes
  | "protection" // shields, barred zones
  | "attack" // removal / detonation
  | "info" // reveals (opponent nerf, draft options)
  | "draft" // manipulate either player's drafts
  | "nerf"; // soften or remove your own nerf

export type BuffState = Record<string, unknown>;

export interface BuffInstance {
  id: string;
  /** Tier the card rolled at when drafted (may differ from library tier). */
  tier: Tier;
  state: BuffState;
  /** One-shot consumed (kept in the list for the record, but inert). */
  spent?: boolean;
  /** Cancelled by an opponent's nullify effect before it could be used. */
  nullified?: boolean;
}

// --- Board-level effects owned by the buff system ---------------------------
// These are plain serializable records living on BuffMatchState.effects and
// interpreted centrally by the game's legal-move pipeline. `turns` counts the
// affected player's own turns and is decremented after each of their moves;
// `null` means permanent.

export type ActiveEffect =
  | { kind: "freeze"; sq: Square; owner: Color; turns: number }
  | {
      kind: "shield";
      owner: Color;
      /** Protected squares; null = the owner's entire army. Squares follow
       * the piece standing on them when it moves. */
      squares: Square[] | null;
      turns: number | null;
    }
  | { kind: "barred"; squares: Square[]; against: Color; turns: number | null }
  | { kind: "king_safe"; owner: Color; turns: number | null }
  | { kind: "no_pawn_advance"; against: Color; turns: number }
  | { kind: "king_only"; against: Color; turns: number }
  | { kind: "nerf_suspended"; owner: Color; turns: number | null }
  /** Purely visual: squares hit by Lightning Strike flash on the board until
   * the opponent replies. No gameplay effect. */
  | { kind: "strike"; squares: Square[]; owner: Color; turns: number };

/** Which side's completed moves tick this effect's timer down. */
export function effectTickColor(e: ActiveEffect): Color {
  switch (e.kind) {
    case "freeze":
    case "nerf_suspended":
      return e.owner;
    case "shield":
    case "king_safe":
    case "strike":
      return e.owner === "w" ? "b" : "w";
    case "barred":
    case "no_pawn_advance":
    case "king_only":
      return e.against;
  }
}

// --- Draft state -------------------------------------------------------------

export interface DraftFlags {
  /** Prep: your next draft offers three cards instead of two. */
  prepThree?: boolean;
  /** Banked a skipped draft: next offer rolls one tier higher. Caps at 1. */
  bankBonus?: number;
  /** Recast / Draft Tyranny style: force the next offer's tier. */
  forceTier?: Tier;
  /** Take every card in your next N offers instead of just one. */
  takeBoth?: number;
  /** Inflicted by the opponent: your next N drafted buffs arrive nullified. */
  nullifyIncoming?: number;
  /** Inflicted by the opponent: your next N drafts are skipped outright. */
  blockedDrafts?: number;
  /** Inflicted by the opponent: your next N offers exclude draft-manipulation
   * cards (Suppress). */
  noDraftCards?: number;
  /** See the opponent's next offer's cards (Peek / Draft Insight). */
  seeOppCards?: boolean;
  /** See the tier of the opponent's next offer (Quick Glance). */
  seeOppTier?: boolean;
}

export interface BuffOffer {
  cards: { id: string; tier: Tier }[];
  /** 1-based index of this draft in the player's sequence. */
  index: number;
  /** This offer rolled a tier higher thanks to a banked skip. */
  banked?: boolean;
}

export interface PlayerBuffState {
  buffs: BuffInstance[];
  /** Number of buff drafts already generated for this player. */
  draftsTaken: number;
  /** Own-move count that triggers the next offer. */
  nextDraftAt: number;
  offer: BuffOffer | null;
  flags: DraftFlags;
  /** The two nerf cards this player chose between at game start. */
  nerfOptions?: string[];
  /** This player can see the opponent's nerf (Extra Glance / Watchtower). */
  oppNerfRevealed?: boolean;
  /** One-shot reveal result (Peek, Quick Glance, Draft Insight): a snapshot
   * of a single opponent offer, kept so the holder can still read it after
   * the offer resolves. Cards or tier only, depending on the source card. */
  oppReveal?: { index: number; cards?: { id: string; tier: Tier }[]; tier?: Tier } | null;
  /** This player's own nerf has been permanently removed (Nerf Breaker). */
  nerfRemoved?: boolean;
  /** Pieces this player has revived, deducted from the revivable pool. */
  revived: Partial<Record<PieceType, number>>;
}

export interface BuffMatchState {
  /** Own moves between buff drafts. */
  cadence: number;
  /** Shared draft trigger in total plies: both players draft at the same
   * time when the game reaches this ply. Optional so saved games from the
   * per-player cadence era still load; playMove backfills it. */
  nextDraftAtPly?: number;
  rngState: number;
  effects: ActiveEffect[];
  extraMoves: { w: number; b: number };
  skips: { w: number; b: number };
  /** Set while a player is chaining moves through extra moves or opponent
   * skips: that player cannot capture the king until the opponent has
   * played one reply move. Cleared by the opponent's next actual move. */
  chainKingGuard?: Color;
  players: { w: PlayerBuffState; b: PlayerBuffState };
  /**
   * Set once a buff mutates the board directly (summon, removal, teleport…).
   * The board can then no longer be reproduced by replaying move history, so
   * replay-based checks (threefold repetition) must be skipped.
   */
  historyDiverged?: boolean;
}

export function newPlayerBuffState(cadence: number): PlayerBuffState {
  return {
    buffs: [],
    draftsTaken: 0,
    nextDraftAt: cadence,
    offer: null,
    flags: {},
    revived: {},
  };
}

export function newBuffMatchState(seed: number, cadence: number): BuffMatchState {
  return {
    cadence,
    rngState: seed >>> 0 || 1,
    effects: [],
    extraMoves: { w: 0, b: 0 },
    skips: { w: 0, b: 0 },
    players: { w: newPlayerBuffState(cadence), b: newPlayerBuffState(cadence) },
  };
}

// --- Targeting ---------------------------------------------------------------

export type BuffTarget =
  | { kind: "square"; label: string; squares: Square[] }
  | {
      kind: "enemy-buff";
      label: string;
      options: { index: number; name: string; tier: Tier }[];
    };

export interface BuffPick {
  square?: Square;
  buffIndex?: number;
}

// --- The API buff hooks operate through --------------------------------------
// Constructed by game.ts (which owns the NerfGame); structural so the buff
// library never has to import game.ts.

export interface BuffApi {
  board: BoardState;
  me: Color;
  opp: Color;
  bs: BuffMatchState;
  mine: PlayerBuffState;
  theirs: PlayerBuffState;
  rng: RNG;
  /** Piece counts the opponent has captured from me (revivable pool). */
  capturedFromMe: Record<PieceType, number>;
  /** Piece counts I have captured from the opponent (their revivable pool). */
  capturedByMe: Record<PieceType, number>;
  place: (sq: Square, type: PieceType, color: Color) => void;
  removePiece: (sq: Square) => void;
  relocate: (from: Square, to: Square) => void;
  setPieceType: (sq: Square, type: PieceType) => void;
  setPieceColor: (sq: Square, color: Color) => void;
  /** Restore my castling rights (Castle Early). */
  restoreCastling: () => void;
  /** Permanently remove my nerf (Nerf Breaker). */
  removeMyNerf: () => void;
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  /** Library tier; drafts may roll the card at a nearby tier. */
  tier: Tier;
  category: BuffCategory;
  implemented: boolean;
  /**
   * passive   — hooks run automatically while held
   * instant   — effect applies the moment the card is picked
   * activated — the holder clicks "use" (optionally picking targets)
   */
  kind: "passive" | "instant" | "activated";
  /** Activated buffs default to being consumed on use. */
  spendOnUse?: boolean;
  /** Activated buffs normally consume the activator's turn; free actions
   * (the extra-move family) resolve within it instead. */
  freeAction?: boolean;
  /** Called when the card is acquired (before any instant effect). */
  init?: (inst: BuffInstance, api: BuffApi) => void;
  /** Instant: runs on pick. Activated: runs on use with collected picks. */
  effect?: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => void;
  /**
   * Sequential target collection for activated buffs: given the picks so
   * far, return the next target request, or null when done. Returning a
   * target with no candidates means the buff currently has no valid use.
   */
  targets?: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => BuffTarget | null;
  /** Add extra legal moves for the owner (push into `moves`). */
  augmentMoves?: (moves: Move[], inst: BuffInstance, api: BuffApi) => void;
  /** Filter the opponent's legal moves (shields, walls...). */
  filterOpponentMoves?: (moves: Move[], inst: BuffInstance, api: BuffApi) => Move[];
  /** Called after every move by either side (piece tracking, charges). */
  onMovePlayed?: (inst: BuffInstance, move: Move, api: BuffApi) => void;
  /** Short live status line ("2 turns left", "bound to e4"). */
  status?: (inst: BuffInstance) => string | null;
}

/** True when the AI can pick this card and resolve it without a UI. */
export function aiCanUse(def: Buff): boolean {
  return def.implemented && (def.kind === "passive" || (def.kind === "instant" && !def.targets));
}
