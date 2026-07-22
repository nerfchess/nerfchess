import { Tier } from "./nerf";
import { BoardState, Color, Move, PieceType, Square } from "./types";
import { RNG } from "./rng";

// --- Chess Diff sub-game -------------------------------------------------------
// Chess Diff (tier 6) PAUSES the running game and spawns a fresh, completely
// normal game of chess on top of it: the pre-diff board, board effects, and
// tempo counters are stashed here, both armies snap to the standard opening,
// and (in timed games) the game server swaps both clocks for a 1+0 sprint.
// While the diff runs there are NO drafts, NO nerfs, NO buff activations and
// no lingering effects — plain chess. When the diff is decided the stash is
// restored, the paused game (and its clocks) resumes, and ONLY the diff's
// winner is handed an apex (tier 9) card. A drawn diff grants nobody
// anything. Fully part of the deterministic engine state, so replicas replay
// it from the shared move/action record and snapshots persist it.
export interface ChessDiffState {
  /** Who cast Chess Diff (they get no reward unless they win the diff). */
  caster: Color;
  /** Deep, detached copy of the paused game's board (history included). */
  savedBoard: BoardState;
  /** The paused game's board effects, restored when the diff ends. */
  savedEffects: ActiveEffect[];
  savedExtraMoves: { w: number; b: number };
  savedSkips: { w: number; b: number };
  savedChainKingGuard?: Color;
}

// ---------------------------------------------------------------------------
// Buff system core types.
//
// Buffs are the positive half of the draft loop: every game opens with a nerf
// draft (pick 1 of 2 handicaps), then every few moves each player drafts a
// buff. Buffs climb in tier as the game goes on. See docs/draft-system.md.
// ---------------------------------------------------------------------------

// Which section of the site a draft game belongs to.
// - "nerf": opening nerf pick, slower cadence, only nerf-modifier buffs.
// - "buff": no nerfs at all, normal cadence, nerf-modifier buffs excluded.
// - absent: the legacy merged ruleset (kept so saved games still replay).
export type DraftMode = "nerf" | "buff";

/** What the draftable cards are called in each section: nerf mode's cards
 * are "hexes" (curses cast on your opponent, with a boon or item minority in
 * the pool), everywhere else "buffs". */
export function draftCardNoun(mode?: DraftMode): "hex" | "buff" {
  return mode === "nerf" ? "hex" : "buff";
}

/** True when a card belongs to nerf mode's boon (self-relief) share: every
 * nerf-relief card (category "nerf") plus the light general cards flagged
 * `boon`. Nerf mode's pool is these plus hexes and items (see draft.ts). */
export function isBoon(b: { category: BuffCategory; boon?: boolean }): boolean {
  return b.category === "nerf" || !!b.boon;
}

export type BuffCategory =
  | "movement" // new ways for pieces to move
  | "pieces" // summons, revivals, promotions, conversions
  | "tempo" // extra moves, skips, freezes
  | "protection" // shields, barred zones
  | "attack" // removal / detonation
  | "info" // reveals (opponent nerf, draft options)
  | "draft" // manipulate either player's drafts
  | "nerf" // soften or remove your own nerf
  | "hex" // curse the opponent: piece hexes and drawback intensifiers (nerf mode only)
  | "item"; // playful consumables (apples, bananas...); drafted in both modes

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
  /**
   * An activated card whose effect has fully resolved once. Set by activateBuff
   * for EVERY activated card the moment its effect fires (picks are already
   * complete by then), so a card can never be activated a second time. Unlike
   * `spent` it does NOT prune the instance: a spendOnUse:false card stays alive
   * to run its lingering rider (a despawn timer, a landed-on trigger, a per-turn
   * effect) while the dock renders it as Used and targets() reports no more
   * work. Set inside activateBuff, which replicas replay through the "use" draft
   * action, so both clients reach the same used state (no desync).
   */
  usedActivation?: boolean;
}

// --- Board-level effects owned by the buff system ---------------------------
// These are plain serializable records living on BuffMatchState.effects and
// interpreted centrally by the game's legal-move pipeline. `turns` counts the
// affected player's own turns and is decremented after each of their moves;
// `null` means permanent.

/** The visual theme a freeze wears. The MECHANIC is identical for all of them
 * (the piece cannot move while the timer runs); the skin only changes how the
 * square paints and what the hover says, so two "stuck" cards never look the
 * same. "ice" is the default (frost). Add freely: each new skin needs a matching
 * entry in the board's FREEZE_SKINS table. */
export type FreezeSkin =
  | "ice"
  | "glue"
  | "stun"
  | "sleep"
  | "tar"
  | "web"
  | "honey"
  | "vines"
  | "chains"
  | "cement"
  | "slime"
  | "quicksand"
  | "shock"
  | "charm"
  | "roots"
  | "bubble"
  | "petal"
  | "rust"
  | "gum"
  | "stone"
  | "beartrap";

/** The purely visual dressings a `cosmetic` effect can pin to a piece. Each
 * skin names a client painting (Board's COSMETIC_SKINS table); the mechanic
 * is always NOTHING. Overhaul cards use these for their comedy identities:
 * a giant pawn, sunglasses, a name tag, slot reels on a Jackpot Pawn... */
export type CosmeticSkin =
  | "giant"
  | "sunglasses"
  | "nametag"
  | "plush"
  | "wooden"
  | "matryoshka"
  | "slotreels"
  | "vampire"
  | "gilded"
  | "wings"
  | "dunce"
  | "checkers"
  | "pigeon"
  | "hat";

export type ActiveEffect =
  | { kind: "freeze"; sq: Square; owner: Color; turns: number; skin?: FreezeSkin }
  /** Pure visual dressing pinned to a piece: zero gameplay effect, ever.
   * Follows the piece when its owner moves it and dies with the piece
   * (pruned exactly like a freeze). `label` is optional hover text (a name
   * tag's name, a joke caption). Overhaul primitive; see CosmeticSkin. */
  | {
      kind: "cosmetic";
      sq: Square;
      owner: Color;
      turns: number | null;
      skin: CosmeticSkin;
      label?: string;
    }
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
  | { kind: "strike"; squares: Square[]; owner: Color; turns: number }
  /** Purely visual, the comedic twin of `strike`: squares a bonk card just
   * conked (Coconut Bonk, Tung Tung Tung Sahur) show a dropped coconut/log
   * impact until the opponent replies. No gameplay effect of its own; the
   * actual stun is a paired `freeze` on the same square. Kept a separate kind
   * from `strike` so a dropped coconut never renders as a lightning bolt. */
  | { kind: "bonk"; squares: Square[]; owner: Color; turns: number }
  /** Hexed into a walnut (Walnut Queen and friends): a heavy nut that can only
   * shuffle ONE square at a time (a king-step), so it is distinct from a freeze
   * (which cannot move at all) rather than a reskin of it. Paints as a walnut
   * that sinks into the board. Kings are never turned into walnuts. */
  | { kind: "walnut"; sq: Square; owner: Color; turns: number }
  /** Trade-off timer (Borrowed Time and friends): "do X now, pay Y after N of
   * your turns". Ticks on the owner's completed turns; when it reaches zero the
   * piece on `sq` is either removed ("remove") or reverted to `into`
   * ("demote", so a temporary grant can be taken back). `sq` follows the piece
   * as its owner moves it, and the effect is pruned if the piece is captured
   * first. Kings are never touched. */
  | {
      kind: "timed_loss";
      owner: Color;
      sq: Square;
      turns: number;
      then: "remove" | "demote";
      into?: PieceType;
    }
  /** Berserker's hangover: the owner may only make one-square (king-step) moves
   * for `turns` of their own turns. King captures stay exempt (winning is king
   * capture) and legalMoves relaxes it rather than ever leaving the owner with
   * zero moves. */
  | { kind: "short_leash"; owner: Color; turns: number };

/** Which side's completed moves tick this effect's timer down. */
export function effectTickColor(e: ActiveEffect): Color {
  switch (e.kind) {
    case "freeze":
    case "walnut":
    case "nerf_suspended":
    case "timed_loss":
    case "short_leash":
    case "cosmetic":
      return e.owner;
    case "shield":
    case "king_safe":
    case "strike":
    case "bonk":
      return e.owner === "w" ? "b" : "w";
    case "barred":
    case "no_pawn_advance":
    case "king_only":
      return e.against;
  }
}

// --- Clock manipulation ------------------------------------------------------
// A match-clock adjustment a buff asks the game server to make (Time Thief,
// Deadline, Overtime Whistle...). All times are in SECONDS. These are pure
// intent: the authoritative clocks live on the match record in the Durable
// Object, not on the engine state, so the DO resolves each request against the
// real clocks and clamps so no clock is ever driven below a small floor (a card
// pressures the opponent's time but never instantly flags them). The list is
// transient bookkeeping on BuffMatchState: never persisted, never sent to
// clients, regenerated and discarded on every rebuild (the DO only drains it on
// the live apply path). The clock change then reaches both clients through the
// existing clock frames, so no client change is needed.

export interface ClockRequest {
  /** The card holder: gains time from `addSelfSec` and from any steal. */
  caster: Color;
  /** Seconds added to the caster's own clock. */
  addSelfSec?: number;
  /** Seconds removed from the opponent's clock (clamped to the floor). */
  subOppSec?: number;
  /** Steal a fraction (0..1) of the opponent's remaining clock... */
  stealFractionOfOpp?: number;
  /** ...and/or a flat number of seconds; whichever is larger is taken. */
  stealFlatSec?: number;
  /** Cap on the stolen amount, in seconds. Whatever is actually removed from
   * the opponent (after flooring) is added to the caster. */
  stealCapSec?: number;
}

// --- Draft state -------------------------------------------------------------

export interface DraftFlags {
  /** Prep: your next draft offers three cards instead of two. */
  prepThree?: boolean;
  /** Banked a skipped draft: next offer rolls one tier higher. Caps at 1. */
  bankBonus?: number;
  /** The offer just banked CONTAINED a tier-8 card: the banked roll may deal an
   * apex (tier 9/10) offer as the reward for skipping that tier-8. Set by
   * bankOffer, consumed by rollOffer. */
  bankedTier8?: boolean;
  /** "Stacked draft" preset: a persistent tier lift applied to EVERY one of
   * this player's offers (unlike bankBonus it is not consumed). Set once when
   * the match is created so a friend receiving a surprise game drafts strong,
   * high-tier cards throughout. Capped in rollOffer so tiers never exceed 8. */
  stackBoost?: number;
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
  /** How many times this same offer has been rerolled (fresh cards at the
   * same tiers). Starts absent; a reroll bumps it. Its only job is to give the
   * client a value that changes so the deal animation replays even though the
   * offer index stays put. */
  rerolled?: number;
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
  /** Crazyhouse-style pocket: pieces granted by cards (grantInventory) that
   * this player may DROP onto an empty square on a later turn, spending that
   * turn. Never holds a king. Part of the synced draft state so a drop replays
   * identically on both clients (see draftStateFor / mergeDraftState). */
  inventory?: Partial<Record<PieceType, number>>;
  /** Draft rerolls left: each one discards the current offer and rolls a
   * fresh one at the SAME tiers off the deterministic RNG. Starts at 1; draft
   * cards grant more. Server-authoritative in online games (the DO owns the
   * reroll and broadcasts the new offer), so it can never desync. */
  rerollsLeft: number;
  /** The resolved pool tier of each card slot in the current offer, kept so a
   * reroll rolls fresh cards at exactly the same tiers (banked/boosted lifts
   * were already folded in and their flags consumed at the first roll). Not
   * sent to clients; rebuilt on replay when the offer is rolled. */
  offerTiers?: Tier[];
  /** LEGACY (fair-RNG overhaul): decline tracking was removed; these two
   * fields remain only so saved states that carry them still parse. Never
   * written with real values anymore and never read by the draft. */
  lastNerfOffered?: string[];
  /** LEGACY: see lastNerfOffered. */
  nerfDeclines?: number;
}

export interface BuffMatchState {
  /** Game section this draft game runs under; absent = legacy merged rules. */
  mode?: DraftMode;
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
  /** Present while a Chess Diff sub-game is running (see ChessDiffState).
   * Persistent engine state: snapshots keep it and replays rebuild it. */
  diff?: ChessDiffState;
  players: { w: PlayerBuffState; b: PlayerBuffState };
  /**
   * Set once a buff mutates the board directly (summon, removal, teleport…).
   * The board can then no longer be reproduced by replaying move history, so
   * replay-based checks (threefold repetition) must be skipped.
   */
  historyDiverged?: boolean;
  /**
   * Transient bookkeeping (never persisted, never sent to clients: the match
   * store keeps only moves + actions, and draftStateFor picks its fields by
   * hand). Bumped by every direct board mutation made through the BuffApi, so
   * apply paths can tell whether a hook observably changed the board.
   */
  mutations?: number;
  /**
   * Transient: the held buffs whose onMovePlayed hook observably fired
   * (mutated the board or added an effect) during the most recent playMove,
   * as (owner color, index into that player's buff list). The game server
   * reveals those cards to every replica: a replica that does not know a
   * card's identity cannot replay its hook, and a board mutation it skips is
   * a permanent desync (dtState never carries the board).
   */
  lastHookMutations?: { color: Color; index: number }[];
  /**
   * Transient: match-clock adjustments buffs requested during the current
   * apply cycle (see ClockRequest). Never persisted and never sent to clients;
   * the game server drains it on the live apply path, applies the clamped
   * deltas to the authoritative match clocks, and clears it. A rebuild
   * regenerates these from the replayed picks and simply discards them.
   */
  clockFx?: ClockRequest[];
}

export function newPlayerBuffState(cadence: number): PlayerBuffState {
  return {
    buffs: [],
    draftsTaken: 0,
    nextDraftAt: cadence,
    offer: null,
    flags: {},
    revived: {},
    inventory: {},
    rerollsLeft: 1,
  };
}

export function newBuffMatchState(seed: number, cadence: number, mode?: DraftMode): BuffMatchState {
  return {
    ...(mode ? { mode } : {}),
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
  | {
      kind: "square";
      label: string;
      squares: Square[];
      /** The picks so far already form a complete effect: the player may
       * stop here (the UI offers Done) instead of picking further targets. */
      finishable?: boolean;
    }
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
  /** Effect randomness. Seeded deterministically from the synced public state
   * (ply + board + acting color; see fxRng in game.ts), so a random effect
   * replayed from the public action record removes / picks the SAME squares on
   * the server, both clients, and spectators. Draw from it only inside init /
   * effect / onMovePlayed — the paths every replica replays — never inside
   * targets() or status(), which the UI calls speculatively. */
  rng: RNG;
  /** Piece counts the opponent has captured from me (revivable pool). */
  capturedFromMe: Record<PieceType, number>;
  /** Piece counts I have captured from the opponent (their revivable pool). */
  capturedByMe: Record<PieceType, number>;
  place: (sq: Square, type: PieceType, color: Color) => void;
  /** Clear a square. By default the piece counts as captured by the other
   * side (a buff destroying a piece is a real loss). Pass `uncounted` for
   * board rewrites and summoned-piece expiry, where nothing was actually
   * lost and the revive pools must stay untouched. */
  removePiece: (sq: Square, opts?: { uncounted?: boolean }) => void;
  relocate: (from: Square, to: Square) => void;
  setPieceType: (sq: Square, type: PieceType) => void;
  setPieceColor: (sq: Square, color: Color) => void;
  /** Restore my castling rights (Castle Early). */
  restoreCastling: () => void;
  /** Permanently remove my nerf (Nerf Breaker). */
  removeMyNerf: () => void;
  /** Ask the game server to adjust the match clocks (Time Thief, Deadline,
   * Overtime Whistle...). Times are in seconds; the caster is filled in as the
   * card holder, and the DO clamps so no clock drops below a small floor. A
   * no-op in an untimed game. */
  adjustClock: (req: Omit<ClockRequest, "caster">) => void;
}

// Declarative board-visual hint for constraint cards whose mechanics are
// opaque move filters: names WHICH pieces the curse touches and the motif the
// board draws on them while it runs. Display metadata only; never consulted
// by move generation, so it cannot desync anything.
export interface CardFx {
  /**
   * Constraints (drawn on the CURSED side's pieces):
   * jail      — piece cannot move (chains)
   * muzzle    — piece cannot capture
   * anchor    — movement range shortened
   * blindfold — vision / targeting restricted, or square access barred
   * slow      — tempo restrictions (delays, skips, cadence)
   * Empowerments (drawn on the CASTER's own pieces, visible to both sides):
   * empower   — piece gained movement or powers (regalia badge; see moveAs)
   * ward      — piece is protected (small ward ring; shields proper already
   *             paint via the shield effect, use ward for subtler guards)
   * rally     — tempo / extra-action boons on the army
   */
  motif: "jail" | "muzzle" | "anchor" | "blindfold" | "slow" | "empower" | "ward" | "rally";
  /** Piece types the card touches; "all" = the whole army (kings included
   * only when the mechanic truly touches the king). Omit for effects that
   * are not piece-scoped (draft locks etc.); those show no board motif. */
  pieces?: PieceType[] | "all";
  /** empower only: the piece type whose movement was granted. The badge on
   * the empowered piece draws THIS silhouette (a rook that moves like a king
   * wears a small king mark; an amazon-style knight wears a crown-knight). */
  moveAs?: PieceType;
  /** The fx lands on the card OWNER's pieces (grants/wards), not the
   * opponent's. Defaults to false: constraint motifs target the cursed side. */
  self?: boolean;
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  /** One-line flavor text, shown quoted at the foot of the full card. */
  flavor?: string;
  /** Optional per-card icon (a lucide-react icon name, e.g. "Bomb", "Snail").
   * When set it overrides the category glyph on the card face, so cards that
   * share a category can still each look distinct. */
  icon?: string;
  /** Board motif drawn on affected pieces while this card's constraint is
   * active (see CardFx). Only meaningful for opponent-facing constraints. */
  fx?: CardFx;
  /** Library tier; drafts may roll the card at a nearby tier. */
  tier: Tier;
  /** Apex cards (all of tier 9) are flagged special: they are NEVER offered by
   * the normal draft roll and can only be obtained through a dedicated grant
   * (the gambling Jackpot card or banking at the top tier). */
  special?: boolean;
  category: BuffCategory;
  /** Part of nerf mode's boon pool. Category "nerf" cards are boons
   * implicitly (see isBoon); light general cards flagged here round the
   * pool out to roughly half nerf-relief, half small supportive effects. */
  boon?: boolean;
  /**
   * Piece-type eligibility for the DRAFT POOL: the caster must own at least
   * one piece of one of these types (on the board) for this card to be
   * offered. Cards whose whole effect targets the caster's own pieces of a
   * specific type ("your knights become amazons", "your rooks strike first")
   * are DEAD DRAFTS when the caster has none of that piece, so the draft roll
   * drops them from the pool (see rollCards / inMode in draft.ts). A pure,
   * deterministic read of the synced board, so it can never desync. Leave
   * unset for cards that work regardless of your pieces (global effects,
   * pocket grants, king-only cards, enemy-targeting cards). */
  requires?: PieceType[];
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

// --- Turn cost ---------------------------------------------------------------
// Whether playing a card spends the holder's turn. Every card falls into one of
// four buckets, derived from the SAME fields the engine uses to decide whether
// to pass the turn (see game.ts passTurnAfterBuff and Buff.freeAction), so the
// label a player sees can never disagree with what the game actually does.
//   turn    - activated: using the card IS your move this turn
//   free    - activated but a free action: resolves within your turn
//   instant - applies the moment you draft it; nothing to activate
//   passive - always on while held; nothing to activate
export type TurnCost = "turn" | "free" | "instant" | "passive";

export function turnCost(b: Pick<Buff, "kind" | "freeAction">): TurnCost {
  if (b.kind === "activated") return b.freeAction ? "free" : "turn";
  if (b.kind === "instant") return "instant";
  return "passive";
}

/** Nerfs are secret passive handicaps: never activated, so always passive. */
export const NERF_TURN_COST: TurnCost = "passive";
