// OPENERS, part two: the info, rider, draft-perk, and cosmetic families of
// the opener set (see openers.ts for the design rules and the reference
// families). Same contract: tiny one-tempo-at-most effects, curated names,
// ids op_<snake>, all randomness through api.rng inside effect/onMovePlayed.
//
// Import cycle note: this module imports the opener factory from openers.ts,
// and openers.ts imports buildOpeners2 from here. Nothing in this module
// calls opener() at module-evaluation time; the banks below are plain data
// and every builder runs inside buildOpeners2, which openers.ts invokes only
// while assembling OPENER_CARDS (after both modules have evaluated), so the
// cycle resolves cleanly under both ESM and CJS loading.

import {
  Buff,
  BuffApi,
  Color,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  advancePawn,
  advanceablePawns,
  attackersOf,
  attacksSquare,
  emptySquares,
  flashSquares,
  fwdOf,
  inBoard,
  inHalf,
  instant,
  kingSquare,
  mySquares,
  oppFilter,
  ownRank,
  pinCosmetic,
  relRank,
  tickTurns,
  timedOppFilter,
  turnsLeft,
  undefendedPieces,
} from "./shared";
import { OpenerMeta, opener } from "./openers";

const CENTER4: Square[] = [27, 28, 35, 36];
const FILE_NAMES = "abcdefgh";

/** 1-turn shield on one of my squares (uncapturable on the opponent's next turn). */
function shield1(api: BuffApi, sq: Square) {
  addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 1 });
}

/** Strip finite-duration (temporary) shields owned by `owner` from the given
 * squares. Permanent shields (turns == null) and whole-army shields (squares
 * == null) are left intact; a square-scoped shield simply drops the listed
 * squares, going inert once empty. */
function stripTempShields(api: BuffApi, squares: Square[], owner: Color) {
  for (const e of api.bs.effects) {
    if (e.kind === "shield" && e.owner === owner && e.turns != null && e.squares != null) {
      e.squares = e.squares.filter((s) => !squares.includes(s));
    }
  }
}

/** Enemy squares the piece on `from` can currently capture (geometric reach). */
function capturesFrom(api: BuffApi, from: Square, victimColor: Color): Square[] {
  return mySquares(api.board, victimColor).filter((sq) => attacksSquare(api.board, from, sq));
}

/** The 8 squares around `sq` that exist on the board. */
function ringAround(sq: Square): Square[] {
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = FILE(sq) + df, r = RANK(sq) + dr;
      if (inBoard(f, r)) out.push(SQ(f, r));
    }
  }
  return out;
}

/** My pawn closest to promotion (first one on ties); null with no pawns. */
function vanguardPawn(api: BuffApi): Square | null {
  let best: Square | null = null, bestRank = -1;
  for (const sq of mySquares(api.board, api.me, "p")) {
    const r = relRank(api.me, sq);
    if (r > bestRank) { best = sq; bestRank = r; }
  }
  return best;
}

/** My queen's square, falling back to the king when she is gone. */
function crownSquare(api: BuffApi): Square | null {
  for (const sq of mySquares(api.board, api.me, "q")) return sq;
  return kingSquare(api.board, api.me);
}

// ---------------------------------------------------------------------------
// FAMILY: Weather Omens. Pure garnish with a 3-second sliver of time: a sign
// flashes over a themed patch of board and your clock breathes once. These
// six are most of the opener set's whole time budget, kept deliberately tiny.
// ---------------------------------------------------------------------------

const WEATHER_OMENS: Array<OpenerMeta & { squares: (api: BuffApi) => Square[]; where: string }> = [
  { id: "red_sky_morning", name: "Red Sky at Morning", flavor: "Sailors take warning. Everyone else takes the center.", icon: "Sunrise", where: "the four center squares", squares: () => [...CENTER4] },
  { id: "first_frost", name: "First Frost", flavor: "The king's window is the prettiest and the coldest.", icon: "Snowflake", where: "your king's square", squares: (api) => { const k = kingSquare(api.board, api.me); return k == null ? [] : [k]; } },
  { id: "four_winds", name: "Four Winds", flavor: "Each corner of the board reports a different forecast.", icon: "Wind", where: "the four corners", squares: () => [0, 7, 56, 63] },
  { id: "halo_moon", name: "Halo Round the Moon", flavor: "A ring of weather about her majesty means rain, or glory.", icon: "Moon", where: "your queen's square", squares: (api) => { const q = crownSquare(api); return q == null ? [] : [q]; } },
  { id: "distant_thunder", name: "Distant Thunder", flavor: "It is always rumbling over somebody else's palace.", icon: "CloudLightning", where: "the enemy king's square", squares: (api) => { const k = kingSquare(api.board, api.opp); return k == null ? [] : [k]; } },
  { id: "barometer_falling", name: "Barometer Falling", flavor: "The towers feel the pressure change first.", icon: "Gauge", where: "your rooks", squares: (api) => mySquares(api.board, api.me, "r") },
];

function weatherOmen(entry: (typeof WEATHER_OMENS)[number]): Buff {
  return opener(
    entry,
    `An omen flashes over ${entry.where} until your opponent replies, and you gain 3 seconds on your clock.`,
    instant((_inst, api) => {
      flashSquares(api, entry.squares(api), true);
      api.adjustClock({ addSelfSec: 3 });
    }),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Lucky Charms. A free-action coin flip on the seeded rng: heads
// pays a very small prize, tails pays a sheepish flash on your own king.
// ---------------------------------------------------------------------------

const LUCKY_CHARMS: Array<OpenerMeta & { win: string; prize: (api: BuffApi) => void }> = [
  { id: "rabbits_foot", name: "Rabbit's Foot", flavor: "Lucky for you. Less so for the rabbit.", icon: "Rabbit", win: "gain a draft reroll", prize: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "tea_leaves", name: "Tea Leaves", flavor: "The dregs spell out a single, smug number.", icon: "Coffee", win: "learn the tier of your opponent's next draft offer", prize: (api) => { api.mine.flags.seeOppTier = true; } },
  { id: "crystal_ball", name: "Crystal Ball", flavor: "Slightly scratched, mostly honest.", icon: "Eye", win: "see the cards in your opponent's next draft offer", prize: (api) => { api.mine.flags.seeOppCards = true; } },
  { id: "wishbone", name: "Wishbone", flavor: "You got the bigger half. Probably.", icon: "Bone", win: "your next draft is dealt from tier 2", prize: (api) => { api.mine.flags.forceTier = 2; } },
  { id: "four_leaf_clover", name: "Four Leaf Clover", flavor: "Three leaves for the lawn, one for the draft table.", icon: "Clover", win: "your next draft offers three cards, rolled one tier higher", prize: (api) => { api.mine.flags.prepThree = true; api.mine.flags.bankBonus = 1; } },
  { id: "grandfathers_watch", name: "Grandfather's Watch", flavor: "It runs slow, in your favor.", icon: "Watch", win: "gain 4 seconds on your clock", prize: (api) => api.adjustClock({ addSelfSec: 4 }) },
  { id: "evil_eye_bead", name: "Evil Eye Bead", flavor: "Blue glass, unblinking, pinned to the royal hem.", icon: "Gem", win: "your queen cannot be captured during your opponent's next 2 turns", prize: (api) => { const q = mySquares(api.board, api.me, "q")[0]; if (q != null) addEffect(api, { kind: "shield", owner: api.me, squares: [q], turns: 2 }); } },
  { id: "dowsing_rod", name: "Dowsing Rod", flavor: "It twitches at hanging pieces instead of water.", icon: "Wand", win: "every currently undefended enemy piece flashes until your opponent replies, and you gain a draft reroll", prize: (api) => { flashSquares(api, undefendedPieces(api.board, api.opp)); api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "horseshoe_nail", name: "Horseshoe Nail", flavor: "For want of a nail, a whole tier was won.", icon: "Magnet", win: "your next draft offer rolls one tier higher and you gain a draft reroll", prize: (api) => { api.mine.flags.bankBonus = 1; api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "fools_gold", name: "Fool's Gold", flavor: "Worthless, gorgeous, and yours.", icon: "Coins", win: "your king is gilded, purely cosmetically, forever", prize: (api) => { const k = kingSquare(api.board, api.me); if (k != null) pinCosmetic(api, k, api.me, "gilded", null); } },
  { id: "guardian_sprite", name: "Guardian Sprite", flavor: "It adopts whichever pawn has wandered furthest from home.", icon: "Sparkle", win: "your most advanced pawn cannot be captured during your opponent's next turn", prize: (api) => { const p = vanguardPawn(api); if (p != null) shield1(api, p); } },
  { id: "gossip_charm", name: "Gossip Charm", flavor: "By sundown the whole board knows her as Susan.", icon: "MessageCircle", win: "a random enemy piece is named Susan, purely cosmetically, forever", prize: (api) => { const c = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k"); if (c.length > 0) pinCosmetic(api, c[api.rng.int(c.length)], api.opp, "nametag", null, "Susan"); } },
];

function luckyCharm(entry: (typeof LUCKY_CHARMS)[number]): Buff {
  return opener(
    entry,
    `Use once as a free action: flip a fair coin. Heads: ${entry.win}. Tails: nothing but a sheepish flash on your king.`,
    {
      ...activatedSimple((inst, api) => {
        const heads = api.rng.next() < 0.5;
        inst.state.result = heads ? "heads" : "tails";
        if (heads) {
          entry.prize(api);
        } else {
          const k = kingSquare(api.board, api.me);
          if (k != null) flashSquares(api, [k], true);
        }
      }),
      freeAction: true,
    },
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Field Reports. A free-action one-shot glimpse: a themed set of
// enemy squares flashes on the board until your opponent replies.
// ---------------------------------------------------------------------------

const FIELD_REPORTS: Array<OpenerMeta & { what: string; squares: (api: BuffApi) => Square[] }> = [
  { id: "margin_notes", name: "Margin Notes", flavor: "Someone before you penciled in every loose piece.", icon: "BookOpen", what: "every currently undefended enemy piece", squares: (api) => undefendedPieces(api.board, api.opp) },
  { id: "siege_survey", name: "Siege Survey", flavor: "Mark the big engines first. The rest is carpentry.", icon: "Binoculars", what: "every enemy queen and rook", squares: (api) => [...mySquares(api.board, api.opp, "q"), ...mySquares(api.board, api.opp, "r")] },
  { id: "field_sketch", name: "Field Sketch", flavor: "Quick charcoal lines: horses here, clergy there.", icon: "Pencil", what: "every enemy knight and bishop", squares: (api) => [...mySquares(api.board, api.opp, "n"), ...mySquares(api.board, api.opp, "b")] },
  { id: "portrait_of_a_lady", name: "Portrait of a Lady", flavor: "One subject, one sitting, one very bright frame.", icon: "Frame", what: "the enemy queen", squares: (api) => mySquares(api.board, api.opp, "q") },
  { id: "palace_floor_plan", name: "Palace Floor Plan", flavor: "The interesting rooms are always next to the throne.", icon: "Map", what: "every enemy piece adjacent to the enemy king", squares: (api) => { const k = kingSquare(api.board, api.opp); return k == null ? [] : ringAround(k).filter((sq) => api.board.pieces[sq]?.color === api.opp); } },
  { id: "day_census", name: "Day Census", flavor: "Everyone standing in the sun, raise a hand.", icon: "Sun", what: "every enemy piece on a light square", squares: (api) => mySquares(api.board, api.opp).filter((sq) => (FILE(sq) + RANK(sq)) % 2 === 1) },
  { id: "night_census", name: "Night Census", flavor: "Everyone lurking in the shade gets a lantern anyway.", icon: "MoonStar", what: "every enemy piece on a dark square", squares: (api) => mySquares(api.board, api.opp).filter((sq) => (FILE(sq) + RANK(sq)) % 2 === 0) },
  { id: "left_bank_atlas", name: "Left Bank Atlas", flavor: "Everything west of the d-file, lovingly overexplained.", icon: "Compass", what: "every enemy piece on files a through d", squares: (api) => mySquares(api.board, api.opp).filter((sq) => FILE(sq) <= 3) },
  { id: "starboard_chart", name: "Starboard Chart", flavor: "The e-through-h waters, soundings included.", icon: "Anchor", what: "every enemy piece on files e through h", squares: (api) => mySquares(api.board, api.opp).filter((sq) => FILE(sq) >= 4) },
  { id: "threat_ledger", name: "Threat Ledger", flavor: "Double-entry bookkeeping: their attacks on the left, your worries on the right.", icon: "FileText", what: "every enemy piece currently attacking one of your pieces", squares: (api) => { const mine = mySquares(api.board, api.me); return mySquares(api.board, api.opp).filter((sq) => mine.some((t) => attacksSquare(api.board, sq, t))); } },
  { id: "border_report", name: "Border Report", flavor: "Stamped twice, filed once, alarming throughout.", icon: "Flag", what: "every enemy piece currently in your half", squares: (api) => mySquares(api.board, api.opp).filter((sq) => inHalf(api.me, sq)) },
  { id: "fresh_footprints", name: "Fresh Footprints", flavor: "You can tell a lot from which pawns left their beds.", icon: "Footprints", what: "every enemy pawn that has left its starting square", squares: (api) => mySquares(api.board, api.opp, "p").filter((sq) => relRank(api.opp, sq) !== 2) },
];

function fieldReport(entry: (typeof FIELD_REPORTS)[number]): Buff {
  return opener(
    entry,
    `Use once as a free action: ${entry.what} flashes on the board until your opponent replies.`,
    {
      ...activatedSimple((_inst, api) => {
        flashSquares(api, entry.squares(api));
      }),
      freeAction: true,
    },
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Shop Perks. One instant draft-table courtesy, applied on pick.
// ---------------------------------------------------------------------------

const SHOP_PERKS: Array<OpenerMeta & { what: string; apply: (api: BuffApi) => void }> = [
  { id: "store_credit", name: "Store Credit", flavor: "No expiry date, no fine print, no shame.", icon: "Receipt", what: "Gain one extra draft reroll.", apply: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "carbon_copy", name: "Carbon Copy", flavor: "Press hard, third sheet is theirs.", icon: "Copy", what: "You will see the cards in your opponent's next draft offer.", apply: (api) => { api.mine.flags.seeOppCards = true; } },
  { id: "price_check", name: "Price Check", flavor: "A crackly intercom announces exactly one number.", icon: "Tag", what: "You will learn the tier of your opponent's next draft offer.", apply: (api) => { api.mine.flags.seeOppTier = true; } },
  { id: "special_order", name: "Special Order", flavor: "It arrives in a plain box marked TIER TWO.", icon: "ClipboardList", what: "Your next draft is dealt from tier 2.", apply: (api) => { api.mine.flags.forceTier = 2; } },
  { id: "sampler_platter", name: "Sampler Platter", flavor: "Three little toothpicks, one decision.", icon: "UtensilsCrossed", what: "Your next draft offers three cards instead of two.", apply: (api) => { api.mine.flags.prepThree = true; } },
  { id: "layaway_plan", name: "Layaway Plan", flavor: "Pay nothing now, collect a nicer shelf later.", icon: "PiggyBank", what: "Your next draft offer rolls one tier higher.", apply: (api) => { api.mine.flags.bankBonus = 1; } },
];

function shopPerk(entry: (typeof SHOP_PERKS)[number]): Buff {
  return opener(entry, entry.what, instant((_inst, api) => entry.apply(api)));
}

// ---------------------------------------------------------------------------
// FAMILY: Slow Seasons. A delayed gift that ripens after your Nth move,
// complementing the First Steps reference family with board-side payouts.
// ---------------------------------------------------------------------------

const SLOW_SEASONS: Array<
  OpenerMeta & {
    after: number;
    what: string;
    pay: (api: BuffApi) => void;
    /** Announce the pending reward one of your moves before it lands. */
    revealEarly?: boolean;
    /** The (single-use) reward lapses if unused after this many of your drafts. */
    expireAfterDrafts?: number;
  }
> = [
  { id: "title_deed", name: "Title Deed", flavor: "The clerk finds the castle paperwork behind a radiator.", icon: "ScrollText", after: 8, what: "your castling rights are restored if you had lost them", pay: (api) => api.restoreCastling() },
  { id: "ripe_for_picking", name: "Ripe for Picking", flavor: "The orchard tells you exactly which branches sag.", icon: "Apple", after: 5, what: "every currently undefended enemy piece flashes until your opponent replies", pay: (api) => flashSquares(api, undefendedPieces(api.board, api.opp)) },
  { id: "early_sprout", name: "Early Sprout", flavor: "One green number pokes out of the draft soil.", icon: "Sprout", after: 4, what: "you learn the tier of your opponent's next draft offer", pay: (api) => { api.mine.flags.seeOppTier = true; }, expireAfterDrafts: 2 },
  { id: "bumper_crop", name: "Bumper Crop", flavor: "Some years the cart simply comes back fuller.", icon: "Wheat", tier: 2, after: 7, what: "your next draft offers three cards instead of two", pay: (api) => { api.mine.flags.prepThree = true; }, revealEarly: true },
  { id: "compost_heap", name: "Future Compost", flavor: "Give it seven moves. Good things rot upward.", icon: "Recycle", after: 7, what: "your next draft offer rolls one tier higher", pay: (api) => { api.mine.flags.bankBonus = 1; }, revealEarly: true },
  { id: "trellis", name: "Trellis", flavor: "The climbing pawn gets one lattice of protection.", icon: "Fence", after: 6, what: "your most advanced pawn cannot be captured during your opponent's next turn", pay: (api) => { const p = vanguardPawn(api); if (p != null) shield1(api, p); } },
  { id: "late_bloom", name: "Late Bloom", flavor: "Ten moves of patience, one burst of gold leaf.", icon: "Flower", after: 10, what: "your queen is gilded, purely cosmetically, forever", pay: (api) => { const q = mySquares(api.board, api.me, "q")[0]; if (q != null) { pinCosmetic(api, q, api.me, "gilded", null); flashSquares(api, [q], true); } } },
  { id: "second_harvest", name: "Second Harvest", flavor: "The field you already reaped owes you two more rows.", icon: "Tractor", after: 12, what: "gain 2 draft rerolls", pay: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2; } },
];

function slowSeason(entry: (typeof SLOW_SEASONS)[number]): Buff {
  let desc = `After your ${entry.after}th move, ${entry.what}.`;
  if (entry.revealEarly) desc += " You are shown the pending reward one of your moves before it lands.";
  if (entry.expireAfterDrafts != null)
    desc += ` If left unused, the reveal lapses after ${entry.expireAfterDrafts} of your drafts.`;
  return opener(entry, desc, {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = entry.after;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.me) return;
      if (!inst.state.paid) {
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        entry.pay(api);
        if (entry.expireAfterDrafts == null) {
          inst.spent = true;
          return;
        }
        // Keep the card alive to enforce the reveal's expiry window.
        inst.state.paid = true;
        inst.state.draftMark = api.mine.draftsTaken + entry.expireAfterDrafts;
        return;
      }
      if (api.mine.draftsTaken >= (inst.state.draftMark as number)) {
        if (api.mine.flags.seeOppTier) api.mine.flags.seeOppTier = false;
        inst.spent = true;
      }
    },
    status: (inst) => {
      if (entry.revealEarly && !inst.state.paid && turnsLeft(inst) === 1) {
        return `ready next move: ${entry.what}`;
      }
      return `ripens in ${turnsLeft(inst)} of your moves`;
    },
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Fine Print. En-passant insurance, underwritten by district: the
// covered pawns can never be captured en passant. Rarely relevant, always
// soothing, exactly the right size for an opener.
// ---------------------------------------------------------------------------

const FINE_PRINT: Array<
  OpenerMeta & { files: number[] | null; who: string; delay?: boolean }
> = [
  { id: "full_coverage", name: "Full Coverage", flavor: "Clause 1: no funny business in passing. Clause 2: see clause 1.", icon: "ShieldCheck", tier: 2, files: null, who: "pawns", delay: true },
  { id: "homestead_clause", name: "Homestead Clause", flavor: "West of the d-file, passing trades are void.", icon: "House", files: [0, 1, 2, 3], who: "pawns on files a through d" },
  { id: "harborside_rider", name: "Harborside Rider", flavor: "Kingside cargo may not be seized mid-voyage.", icon: "Anchor", files: [4, 5, 6, 7], who: "pawns on files e through h" },
  { id: "downtown_premium", name: "Downtown Premium", flavor: "Central property, central protections.", icon: "Building2", tier: 2, files: [2, 3, 4, 5], who: "pawns on files c through f", delay: true },
  { id: "frontier_waiver", name: "Frontier Waiver", flavor: "Out past the b- and g-files, the usual tolls do not apply.", icon: "Signpost", tier: 2, files: [0, 1, 6, 7], who: "pawns on the outer files a, b, g and h", delay: true },
  { id: "crown_indemnity", name: "Crown Indemnity", flavor: "The d- and e-pawns march under royal seal.", icon: "Landmark", tier: 2, files: [3, 4], who: "d- and e-file pawns" },
];

function finePrint(entry: (typeof FINE_PRINT)[number]): Buff {
  const covered = (m: Move) =>
    m.isEnPassant &&
    m.capturedSquare != null &&
    (entry.files == null || entry.files.includes(FILE(m.capturedSquare)));
  if (!entry.delay) {
    return opener(
      entry,
      `Your ${entry.who} can never be captured en passant.`,
      oppFilter((moves, _inst, _api) => moves.filter((m) => !covered(m))),
    );
  }
  // Delayed cover: inactive on the opponent's first reply, then in force.
  return opener(
    entry,
    `Starting after your opponent's next turn, your ${entry.who} can never be captured en passant.`,
    {
      kind: "passive",
      init: (inst) => {
        inst.state.started = false;
      },
      filterOpponentMoves: (moves, inst, _api) =>
        inst.state.started ? moves.filter((m) => !covered(m)) : moves,
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp) inst.state.started = true;
      },
      status: (inst) => (inst.state.started ? "in force" : "arms after their next turn"),
    },
  );
}

// ---------------------------------------------------------------------------
// FAMILY: First Blood Rites. A tiny rider on your FIRST capture of the game.
// One use, automatic.
// ---------------------------------------------------------------------------

const FIRST_BLOOD: Array<OpenerMeta & { what: string; ride: (move: Move, api: BuffApi) => void }> = [
  { id: "victory_lap", name: "Victory Lap", flavor: "Jog the perimeter, wave to the pawns.", icon: "Trophy", what: "the capturing piece cannot be captured during your opponent's next turn", ride: (move, api) => shield1(api, move.to) },
  { id: "champions_shades", name: "Champion's Shades", flavor: "The forecast is 100 percent glare.", icon: "Glasses", what: "the capturing piece puts on sunglasses, purely cosmetically, forever", ride: (move, api) => pinCosmetic(api, move.to, api.me, "sunglasses", null) },
  { id: "stoppage_time", name: "Stoppage Time", flavor: "The referee checks his watch and shrugs generously.", icon: "Timer", what: "gain 4 seconds on your clock", ride: (_move, api) => api.adjustClock({ addSelfSec: 4 }) },
  { id: "coachs_whistle", name: "Coach's Whistle", flavor: "One sharp blast and the whole defense is on the tactics board.", icon: "Megaphone", what: "every currently undefended enemy piece flashes until your opponent replies, and any temporary shield protecting one of them is removed", ride: (_move, api) => { const sqs = undefendedPieces(api.board, api.opp); flashSquares(api, sqs); stripTempShields(api, sqs, api.opp); } },
  { id: "transfer_window", name: "Transfer Window", flavor: "A vacancy opens on the roster. Scouts descend.", icon: "RefreshCw", what: "gain a draft reroll", ride: (_move, api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "opposition_research", name: "Opposition Research", flavor: "The captured piece had a very informative diary.", icon: "Search", what: "you learn the tier of your opponent's next draft offer", ride: (_move, api) => { api.mine.flags.seeOppTier = true; } },
  { id: "locker_room_nickname", name: "Locker Room Nickname", flavor: "Score once and the name sticks for the season.", icon: "Medal", what: "the capturing piece is named Champ, purely cosmetically, forever", ride: (move, api) => pinCosmetic(api, move.to, api.me, "nametag", null, "Champ") },
  { id: "ticker_tape", name: "Ticker Tape", flavor: "Someone has been saving shredded gamescores for this.", icon: "PartyPopper", what: "the square is showered in confetti until your opponent replies, and nothing else happens", ride: (move, api) => flashSquares(api, [move.to], true) },
];

function firstBlood(entry: (typeof FIRST_BLOOD)[number]): Buff {
  return opener(entry, `When you make your first capture of the game, ${entry.what}. One use.`, {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me || !move.captured) return;
      entry.ride(move, api);
      inst.spent = true;
    },
    status: () => "awaiting your first capture",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Overtures. A tiny rider on the first time YOU give check. One use,
// automatic, detected after your move lands.
// ---------------------------------------------------------------------------

const OVERTURES: Array<OpenerMeta & { what: string; ride: (move: Move, api: BuffApi) => void }> = [
  { id: "opening_chord", name: "Opening Chord", flavor: "The hall goes quiet. The clock does not, but it slows.", icon: "Music", what: "gain 3 seconds on your clock", ride: (_move, api) => api.adjustClock({ addSelfSec: 3 }) },
  { id: "stage_armor", name: "Stage Armor", flavor: "Prop steel, real confidence.", icon: "Shield", what: "the piece that gave check cannot be captured during your opponent's next turn", ride: (move, api) => shield1(api, move.to) },
  { id: "golden_aria", name: "Golden Aria", flavor: "Hit the high note, keep the costume.", icon: "Star", what: "the piece that gave check is gilded, purely cosmetically, forever, every enemy piece it can capture flashes until your opponent replies, and you gain 5 seconds", ride: (move, api) => { pinCosmetic(api, move.to, api.me, "gilded", null); const caps = capturesFrom(api, move.to, api.opp); if (caps.length > 0) flashSquares(api, caps); api.adjustClock({ addSelfSec: 5 }); } },
  { id: "understudy_list", name: "Understudy List", flavor: "Know exactly who is covering the lead tonight.", icon: "Drama", what: "every enemy piece defending the enemy king's square flashes until your opponent replies", ride: (_move, api) => { const k = kingSquare(api.board, api.opp); if (k != null) flashSquares(api, attackersOf(api.board, api.opp, k)); } },
  { id: "intermission", name: "Intermission", flavor: "Stretch your legs, revisit the merchandise stand.", icon: "Ticket", what: "gain a draft reroll", ride: (_move, api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "house_lights_up", name: "House Lights Up", flavor: "Suddenly everyone can see exactly where the exits are.", icon: "Lamp", what: "every square around the enemy king flashes until your opponent replies", ride: (_move, api) => { const k = kingSquare(api.board, api.opp); if (k != null) flashSquares(api, ringAround(k)); } },
];

function overture(entry: (typeof OVERTURES)[number]): Buff {
  return opener(entry, `The first time you give check, ${entry.what}. One use.`, {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me) return;
      const k = kingSquare(api.board, api.opp);
      if (k == null || attackersOf(api.board, api.me, k).length === 0) return;
      entry.ride(move, api);
      inst.spent = true;
    },
    status: () => "awaiting your first check",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Housewarmings. A tiny rider on the moment you castle. One use.
// ---------------------------------------------------------------------------

const HOUSEWARMINGS: Array<
  OpenerMeta & {
    what: string;
    ride: (move: Move, api: BuffApi) => void;
    /** If you have not castled by this many of your moves, convert the unused
     * charge into one draft reroll instead. */
    fallbackBy?: number;
  }
> = [
  { id: "housewarming_gift", name: "Housewarming Gift", flavor: "A small casserole of seconds, still warm.", icon: "Gift", what: "gain 4 seconds on your clock", ride: (_move, api) => api.adjustClock({ addSelfSec: 4 }) },
  { id: "new_locks", name: "New Locks", flavor: "First night in the new place, deadbolt thrown.", icon: "Lock", what: "your king cannot be captured during your opponent's next turn", ride: (move, api) => shield1(api, move.to) },
  { id: "gilded_doorknob", name: "Gilded Doorknob", flavor: "Purely decorative. Devastatingly tasteful.", icon: "KeyRound", what: "your king is gilded, purely cosmetically, forever; since that reveals nothing you could act on, you also gain a draft reroll and learn the tier of your next draft offer", ride: (move, api) => { pinCosmetic(api, move.to, api.me, "gilded", null); api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; api.mine.flags.seeOppTier = true; } },
  { id: "meet_the_neighbors", name: "Meet the Neighbors", flavor: "Know exactly which houses on the street keep siege engines.", icon: "Binoculars", what: "every enemy queen and rook flashes until your opponent replies", ride: (_move, api) => flashSquares(api, [...mySquares(api.board, api.opp, "q"), ...mySquares(api.board, api.opp, "r")]) },
  { id: "change_of_address", name: "Change of Address", flavor: "The draft catalogue gets forwarded with a bonus stamp.", icon: "Mailbox", what: "gain a draft reroll", ride: (_move, api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; }, fallbackBy: 12 },
  { id: "home_office", name: "Home Office", flavor: "The rook finally gets a desk by the king.", icon: "Briefcase", what: "the castled rook is named Home Office, purely cosmetically, forever", ride: (move, api) => { const rookSq = move.castle === "k" ? move.to - 1 : move.to + 1; pinCosmetic(api, rookSq, api.me, "nametag", null, "Home Office"); } },
];

function housewarming(entry: (typeof HOUSEWARMINGS)[number]): Buff {
  const desc =
    entry.fallbackBy != null
      ? `When you castle, ${entry.what}. If you have not castled by your ${entry.fallbackBy}th move, gain a draft reroll instead. One use.`
      : `When you castle, ${entry.what}. One use.`;
  return opener(entry, desc, {
    kind: "passive",
    init: (inst) => {
      if (entry.fallbackBy != null) inst.state.turns = entry.fallbackBy;
    },
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me) return;
      if (move.castle) {
        entry.ride(move, api);
        inst.spent = true;
        return;
      }
      if (entry.fallbackBy != null) {
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) {
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          inst.spent = true;
        }
      }
    },
    status: () => "awaiting your castle",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Wardrobe Department. Pure-cosmetic dressings pinned to one piece.
// Zero gameplay effect, maximum personality; the free action costs nothing.
// ---------------------------------------------------------------------------

const WARDROBE: Array<
  OpenerMeta & {
    type: "p" | "n" | "b" | "r";
    skin: "plush" | "wooden" | "matryoshka" | "pigeon" | "wings" | "checkers" | "dunce" | "slotreels" | "nametag";
    label?: string;
    line: string;
  } | (OpenerMeta & { royal: "k" | "q"; skin: "hat" | "sunglasses" | "vampire"; line: string; type?: never })
> = [
  { id: "plush_pony", name: "Plush Pony", flavor: "Machine washable. Battle ready.", icon: "Heart", type: "n", skin: "plush", line: "One of your knights is revealed to be a plush toy. This changes nothing at all." },
  { id: "driftwood_tower", name: "Driftwood Tower", flavor: "Weathered, salt-cured, structurally identical.", icon: "TreePine", type: "r", skin: "wooden", line: "One of your rooks turns out to be carved driftwood. This changes nothing at all." },
  { id: "nesting_doll", name: "Nesting Doll", flavor: "There is a smaller pawn inside. Do not ask how far down it goes.", icon: "Layers", type: "p", skin: "matryoshka", line: "One of your pawns becomes a nesting doll. This changes nothing at all." },
  { id: "roof_pigeon", name: "Roof Pigeon", flavor: "Every tower has one. Yours is official now.", icon: "Bird", type: "r", skin: "pigeon", line: "A pigeon settles on one of your rooks. This changes nothing at all." },
  { id: "sunday_best", name: "Sunday Best", flavor: "A hat says: I have plans after this war.", icon: "Shirt", royal: "k", skin: "hat", line: "Your king puts on his good hat. This changes nothing at all." },
  { id: "choir_wings", name: "Choir Wings", flavor: "Strictly decorative, per diocesan regulations.", icon: "Feather", type: "b", skin: "wings", line: "One of your bishops is issued ceremonial wings. This changes nothing at all." },
  { id: "wrong_game_night", name: "Wrong Game Night", flavor: "It showed up flat, round, and ready to be kinged.", icon: "Gamepad2", type: "p", skin: "checkers", line: "One of your pawns arrives dressed for checkers. This changes nothing at all." },
  { id: "queens_holiday", name: "Queen's Holiday", flavor: "Incognito, insofar as a queen can be.", icon: "Sun", royal: "q", skin: "sunglasses", line: "Your queen puts on holiday sunglasses. This changes nothing at all." },
  { id: "back_to_school", name: "Back to School", flavor: "Somebody moved to f4 without developing first.", icon: "GraduationCap", type: "b", skin: "dunce", line: "One of your bishops wears the dunce cap. Purely cosmetic, mildly humbling." },
  { id: "night_court", name: "Night Court", flavor: "She holds audiences after dusk now. The docket is long.", icon: "Moon", royal: "q", skin: "vampire", line: "Your queen adopts a tasteful vampiric wardrobe. This changes nothing at all." },
  { id: "penny_slots", name: "Penny Slots", flavor: "It never pays out. It never stops spinning.", icon: "Dices", type: "p", skin: "slotreels", line: "One of your pawns grows tiny slot reels. This changes nothing at all." },
  { id: "meet_kevin", name: "Meet Kevin", flavor: "Kevin has a family, a mortgage, and one square of ambition.", icon: "Tag", type: "p", skin: "nametag", label: "Kevin", line: "One of your pawns is named Kevin, permanently. This changes nothing at all." },
];

function wardrobe(entry: (typeof WARDROBE)[number]): Buff {
  if ("royal" in entry && entry.royal) {
    return opener(entry, `${entry.line} Free action.`, {
      ...activatedSimple((_inst, api) => {
        const sq = entry.royal === "k" ? kingSquare(api.board, api.me) : mySquares(api.board, api.me, "q")[0];
        if (sq != null) pinCosmetic(api, sq, api.me, entry.skin, null);
      }),
      freeAction: true,
    });
  }
  const names: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook" };
  return opener(
    entry,
    `${entry.line} Free action; pick the ${names[entry.type!]}.`,
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: `Choose the ${names[entry.type!]}`,
              squares: mySquares(api.board, api.me, entry.type!),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        pinCosmetic(api, sq, api.me, entry.skin, null, "label" in entry ? entry.label : undefined);
      },
      { freeAction: true },
    ),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Watchtower Ledger. One-shot tripwires: the first time the enemy
// does a named thing, the culprit is marked on the board until you reply
// (one entry pays a reroll instead of ink).
// ---------------------------------------------------------------------------

const WATCHTOWER: Array<
  OpenerMeta & {
    what: string;
    mark: (move: Move, api: BuffApi) => Square[] | null;
    comedic?: boolean;
    perk?: (api: BuffApi, marked: Square[]) => void;
  }
> = [
  { id: "tripwire_bell", name: "Tripwire Bell", flavor: "One thread of catgut across the whole border.", icon: "BellRing", what: "The first enemy piece to end a move in your half is marked until you reply", mark: (move, api) => (inHalf(api.me, move.to) ? [move.to] : null) },
  { id: "hoofbeat_log", name: "Hoofbeat Log", flavor: "Entry one: hooves. Entry two: see entry one.", icon: "PawPrint", what: "The first enemy knight to move is marked until you reply", mark: (move) => (move.piece === "n" ? [move.to] : null) },
  { id: "chaperone", name: "Chaperone", flavor: "Approach her majesty and a throat clears meaningfully.", icon: "Eye", what: "The first enemy piece to move into an attack on your queen is marked until you reply, and you gain a draft reroll", mark: (move, api) => { const q = mySquares(api.board, api.me, "q")[0]; return q != null && attacksSquare(api.board, move.to, q) ? [move.to] : null; }, perk: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "gate_ledger", name: "Gate Ledger", flavor: "Every siege engine signs out at the gate.", icon: "ScrollText", what: "The first enemy bishop, rook, or queen to leave its back rank is marked until you reply, and any temporary shield protecting it is removed", mark: (move, api) => ((move.piece === "b" || move.piece === "r" || move.piece === "q") && relRank(api.opp, move.from) === 1 ? [move.to] : null), perk: (api, marked) => stripTempShields(api, marked, api.opp) },
  { id: "border_stamp", name: "Border Stamp", flavor: "Passport, please. Purpose of visit: menace.", icon: "Stamp", what: "The first enemy pawn to reach its fifth rank is marked until you reply; since that mark changes no legal decision, you also gain a draft reroll and learn the tier of your next draft offer", mark: (move, api) => (move.piece === "p" && relRank(api.opp, move.to) === 5 ? [move.to] : null), perk: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; api.mine.flags.seeOppTier = true; } },
  { id: "town_square_sentry", name: "Town Square Sentry", flavor: "Loitering in the center is noted in triplicate.", icon: "MapPin", what: "The first enemy piece to end a move on the four center squares is marked until you reply", mark: (move) => (CENTER4.includes(move.to) ? [move.to] : null) },
  { id: "harbor_horn", name: "Harbor Horn", flavor: "One long blast means company on the kingside water.", icon: "Megaphone", what: "The first enemy piece to enter your half on the kingside files (e through h) is marked until you reply, and you gain a draft reroll", mark: (move, api) => (inHalf(api.me, move.to) && FILE(move.to) >= 4 ? [move.to] : null), perk: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "postern_watch", name: "Postern Watch", flavor: "The small queenside door has the most attentive guard.", icon: "DoorClosed", what: "The first enemy piece to enter your half on the queenside files (a through d) is marked until you reply", mark: (move, api) => (inHalf(api.me, move.to) && FILE(move.to) <= 3 ? [move.to] : null) },
  { id: "incident_report", name: "Incident Report", flavor: "Filed while the dust is still airborne.", icon: "FileText", what: "When the enemy makes their first capture, the capturer and every one of your pieces attacking it are marked until you reply", mark: (move, api) => (move.captured ? [move.to, ...attackersOf(api.board, api.me, move.to)] : null) },
  { id: "alarm_lantern", name: "Alarm Lantern", flavor: "It only lights for royalty in distress.", icon: "Flashlight", what: "The first time the enemy gives check, every checking piece is marked until you reply", mark: (_move, api) => { const k = kingSquare(api.board, api.me); if (k == null) return null; const checkers = attackersOf(api.board, api.opp, k); return checkers.length > 0 ? checkers : null; } },
  { id: "keys_copied", name: "Keys Copied", flavor: "They moved into a castle. You made arrangements.", icon: "KeyRound", what: "When your opponent castles, you gain a draft reroll", mark: (move) => (move.castle ? [move.to] : null), comedic: true, perk: (api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "regina_dossier", name: "Regina Dossier", flavor: "Page one: she moved. Page two: worry.", icon: "BookMarked", what: "The first time the enemy queen moves, she is marked until you reply", mark: (move) => (move.piece === "q" ? [move.to] : null) },
];

function watchtower(entry: (typeof WATCHTOWER)[number]): Buff {
  return opener(entry, `${entry.what}. One use.`, {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.opp) return;
      const squares = entry.mark(move, api);
      if (!squares || squares.length === 0) return;
      flashSquares(api, squares, entry.comedic);
      entry.perk?.(api, squares);
      inst.spent = true;
    },
    status: () => "watching",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: House Rules. A free-action one-shot: cordon off ONE empty square
// from a themed zone; enemy pieces cannot end a move there for a turn or two.
// ---------------------------------------------------------------------------

const HOUSE_RULES: Array<
  OpenerMeta & { turns: number; where: string; zone: (api: BuffApi) => Square[] }
> = [
  { id: "reserved_table", name: "Reserved Table", flavor: "The little brass sign has repelled entire armies.", icon: "Utensils", turns: 1, where: "an empty square in your half", zone: (api) => emptySquares(api.board, (sq) => inHalf(api.me, sq)) },
  { id: "private_booth", name: "Private Booth", flavor: "The king dines undisturbed, one chair over.", icon: "Sofa", turns: 1, where: "an empty square next to your king", zone: (api) => { const k = kingSquare(api.board, api.me); return k == null ? [] : ringAround(k).filter((sq) => !api.board.pieces[sq]); } },
  { id: "closed_for_cleaning", name: "Closed for Cleaning", flavor: "The mop bucket outranks the cavalry for two turns.", icon: "Paintbrush", turns: 2, where: "an empty square on your back rank", zone: (api) => emptySquares(api.board, (sq) => RANK(sq) === ownRank(api.me, 0)) },
  { id: "wet_floor_sign", name: "Wet Floor Sign", flavor: "Yellow, plastic, legally binding.", icon: "TrafficCone", turns: 1, where: "an empty square directly in front of one of your pawns", zone: (api) => { const out: Square[] = []; const fwd = fwdOf(api.me); for (const sq of mySquares(api.board, api.me, "p")) { const to = sq + fwd; if (to >= 0 && to <= 63 && !api.board.pieces[to] && !out.includes(to)) out.push(to); } return out; } },
  { id: "chairs_on_tables", name: "Chairs on Tables", flavor: "The center is closing early tonight.", icon: "Armchair", turns: 1, where: "an empty center square (d4, d5, e4 or e5)", zone: (api) => CENTER4.filter((sq) => !api.board.pieces[sq]) },
  { id: "do_not_disturb", name: "Do Not Disturb", flavor: "Housekeeping respects the sign. So, briefly, does the enemy.", icon: "BellOff", turns: 2, where: "an empty square on your second rank", zone: (api) => emptySquares(api.board, (sq) => RANK(sq) === ownRank(api.me, 1)) },
];

function houseRule(entry: (typeof HOUSE_RULES)[number]): Buff {
  return opener(
    entry,
    `Use once as a free action: choose ${entry.where}. Enemy pieces cannot end a move there for your opponent's next ${entry.turns === 1 ? "turn" : `${entry.turns} turns`}.`,
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose the square to cordon off", squares: entry.zone(api) },
      (_inst, api, picks) => {
        if (picks[0]?.square == null) return;
        addEffect(api, { kind: "barred", squares: [picks[0].square], against: api.opp, turns: entry.turns });
      },
      { freeAction: true },
    ),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Graduations. The first time one of YOUR pieces reaches a small
// personal milestone, it earns a tiny automatic reward. One use.
// ---------------------------------------------------------------------------

const GRADUATIONS: Array<
  OpenerMeta & { what: string; cond: (move: Move, api: BuffApi) => boolean; pay: (move: Move, api: BuffApi) => void }
> = [
  { id: "first_day_badge", name: "First Day Badge", flavor: "Rank four! The pin is enormous on so small a chest.", icon: "BadgeCheck", what: "The first of your pawns to reach your fourth rank cannot be captured during your opponent's next turn", cond: (move, api) => move.piece === "p" && relRank(api.me, move.to) === 4, pay: (move, api) => shield1(api, move.to) },
  { id: "honor_roll", name: "Honor Roll", flavor: "Fifth rank, first honors, gold trim.", icon: "Award", what: "The first of your pawns to reach your fifth rank is gilded, purely cosmetically, forever", cond: (move, api) => move.piece === "p" && relRank(api.me, move.to) === 5, pay: (move, api) => { pinCosmetic(api, move.to, api.me, "gilded", null); flashSquares(api, [move.to], true); } },
  { id: "riding_certificate", name: "Riding Certificate", flavor: "Licensed for forward operations at last.", icon: "FileCheck", what: "The first of your knights to land on your fourth rank or beyond cannot be captured during your opponent's next turn", cond: (move, api) => move.piece === "n" && relRank(api.me, move.to) >= 4, pay: (move, api) => shield1(api, move.to) },
  { id: "exchange_student", name: "Exchange Student", flavor: "First semester abroad comes with an escort.", icon: "Backpack", what: "The first of your pieces to enter the enemy half cannot be captured during your opponent's next turn", cond: (move, api) => inHalf(api.opp, move.to), pay: (move, api) => shield1(api, move.to) },
  { id: "debutante_ball", name: "Debutante Ball", flavor: "Her first appearance is, by decree, uninterruptible.", icon: "Sparkles", what: "When your queen makes her first move, she cannot be captured during your opponent's next turn", cond: (move) => move.piece === "q", pay: (move, api) => shield1(api, move.to) },
  { id: "tower_inspection", name: "Tower Inspection", flavor: "Freshly certified: one tower, structurally smug.", icon: "Castle", what: "When your first rook moves, it cannot be captured during your opponent's next turn", cond: (move) => move.piece === "r" && !move.castle, pay: (move, api) => shield1(api, move.to) },
  { id: "ordination_day", name: "Ordination Day", flavor: "The diagonal is a calling, formally answered.", icon: "Church", what: "When your first bishop moves, it cannot be captured during your opponent's next turn", cond: (move) => move.piece === "b", pay: (move, api) => shield1(api, move.to) },
  { id: "morning_constitutional", name: "Morning Constitutional", flavor: "A king who walks before breakfast earns his hat.", icon: "Footprints", what: "When your king makes his first non-castling move, he earns a hat, purely cosmetically, forever", cond: (move) => move.piece === "k" && !move.castle, pay: (move, api) => { pinCosmetic(api, move.to, api.me, "hat", null); flashSquares(api, [move.to], true); } },
];

function graduation(entry: (typeof GRADUATIONS)[number]): Buff {
  return opener(entry, `${entry.what}. One use, automatic.`, {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me) return;
      if (!entry.cond(move, api)) return;
      entry.pay(move, api);
      inst.spent = true;
    },
    status: () => "awaiting the milestone",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Old Superstitions. A rider judged on your VERY FIRST move of the
// game: if it matches the omen, a small blessing lands; either way the card
// is spent when move one is played.
// ---------------------------------------------------------------------------

const SUPERSTITIONS: Array<
  OpenerMeta & { what: string; cond: (move: Move) => boolean; pay: (move: Move, api: BuffApi) => void }
> = [
  { id: "threshold_blessing", name: "Threshold Blessing", flavor: "Cross boldly and the doorframe looks after you.", icon: "DoorOpen", what: "If your first move is a pawn double-step, that pawn cannot be captured during your opponent's next turn", cond: (move) => !!move.isDoublePawn, pay: (move, api) => shield1(api, move.to) },
  { id: "lucky_stirrup", name: "Lucky Stirrup", flavor: "Mount from the left and the horse forgives everything.", icon: "Medal", what: "If your first move is a knight move, that knight becomes a plush toy, purely cosmetically, forever", cond: (move) => move.piece === "n", pay: (move, api) => { pinCosmetic(api, move.to, api.me, "plush", null); flashSquares(api, [move.to], true); } },
  { id: "hearth_blessing", name: "Hearth Blessing", flavor: "Feed the center fire first and the house stays warm.", icon: "Flame", what: "If your first move is a d- or e-pawn move, the four center squares flash until your opponent replies", cond: (move) => move.piece === "p" && (FILE(move.from) === 3 || FILE(move.from) === 4), pay: (_move, api) => flashSquares(api, [...CENTER4], true) },
  { id: "widdershins", name: "Widdershins", flavor: "Counterclockwise round the church, straight into luck.", icon: "RotateCcw", what: "If your first move starts on the queenside files (a through d), gain a draft reroll", cond: (move) => FILE(move.from) <= 3, pay: (_move, api) => { api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1; } },
  { id: "sunwise_turn", name: "Sunwise Turn", flavor: "With the sun, with the tide, with a peek at the ledger.", icon: "Sun", what: "If your first move starts on the kingside files (e through h), you learn the tier of your opponent's next draft offer", cond: (move) => FILE(move.from) >= 4, pay: (_move, api) => { api.mine.flags.seeOppTier = true; } },
  { id: "prophecy_fulfilled", name: "Prophecy Fulfilled", flavor: "The scroll named no names, so any move qualifies.", icon: "ScrollText", what: "Whatever your first move is, that piece is named The Chosen One, purely cosmetically, forever", cond: () => true, pay: (move, api) => { pinCosmetic(api, move.to, api.me, "nametag", null, "The Chosen One"); flashSquares(api, [move.to], true); } },
];

function superstition(entry: (typeof SUPERSTITIONS)[number]): Buff {
  return opener(entry, `${entry.what}. Judged once, on your first move.`, {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent || move.color !== api.me) return;
      if (entry.cond(move)) entry.pay(move, api);
      inst.spent = true;
    },
    status: () => "awaiting your first move",
  });
}

// ---------------------------------------------------------------------------
// FAMILY: Night Watch. A short timed patrol: for your next few turns, any
// enemy piece ending a move in the watched place is marked until you reply.
// ---------------------------------------------------------------------------

const NIGHT_WATCH: Array<
  OpenerMeta & { turns: number; where: string; cond: (to: Square, api: BuffApi) => boolean }
> = [
  { id: "ladys_escort", name: "Lady's Escort", flavor: "Two paces behind the queen, eyes everywhere.", icon: "Moon", turns: 4, where: "next to your queen", cond: (to, api) => { const q = mySquares(api.board, api.me, "q")[0]; return q != null && ringAround(q).includes(to); } },
  { id: "curfew_patrol", name: "Curfew Patrol", flavor: "After the bell, every visitor gets a lantern in the face.", icon: "Flashlight", turns: 5, where: "in your half", cond: (to, api) => inHalf(api.me, to) },
  { id: "wall_sentries", name: "Wall Sentries", flavor: "The back two ranks are walked all night, boots echoing.", icon: "BrickWall", turns: 6, where: "on your back two ranks", cond: (to, api) => relRank(api.me, to) <= 2 },
  { id: "plaza_lantern", name: "Plaza Lantern", flavor: "The town square is lit whether the town likes it or not.", icon: "Lamp", turns: 4, where: "on the four center squares", cond: (to) => CENTER4.includes(to) },
  { id: "tower_torches", name: "Tower Torches", flavor: "Anything that sidles up to a rook gets torchlight and questions.", icon: "Flame", turns: 4, where: "next to one of your rooks", cond: (to, api) => mySquares(api.board, api.me, "r").some((r) => ringAround(r).includes(to)) },
  { id: "kings_road_watch", name: "King's Road Watch", flavor: "The file the king stands on is a royal road, and patrolled like one.", icon: "Eye", turns: 5, where: "on your king's file", cond: (to, api) => { const k = kingSquare(api.board, api.me); return k != null && FILE(k) === FILE(to); } },
];

function nightWatch(entry: (typeof NIGHT_WATCH)[number]): Buff {
  return opener(
    entry,
    `For your next ${entry.turns} turns, any enemy piece that ends a move ${entry.where} is marked until you reply.`,
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = entry.turns;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.opp && entry.cond(move.to, api)) flashSquares(api, [move.to]);
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} of your turns left`,
    },
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Velvet Ropes. A single-turn point of etiquette: on your opponent's
// NEXT turn only, one small class of arrival is simply not received.
// ---------------------------------------------------------------------------

const VELVET_ROPES: Array<
  OpenerMeta & { rule: string; keep: (move: Move, api: BuffApi) => boolean }
> = [
  { id: "no_horses_on_lawn", name: "No Horses on the Lawn", flavor: "The groundskeeper's glare stops cavalry cold.", icon: "PawPrint", rule: "enemy knights cannot end a move in your half", keep: (m, api) => !(m.piece === "n" && inHalf(api.me, m.to)) },
  { id: "walking_pace", name: "Walking Pace, Please", flavor: "This is a respectable board, not a racetrack.", icon: "Snail", rule: "enemy pawns cannot make two-square moves", keep: (m) => !m.isDoublePawn },
  { id: "fresh_sod", name: "Fresh Sod", flavor: "The groundsman just laid the center. Walk around it.", icon: "Sprout", rule: "enemy pieces cannot end a move on the four center squares", keep: (m) => !CENTER4.includes(m.to) },
  { id: "personal_space", name: "Personal Space", flavor: "His majesty requires one full square of polite distance.", icon: "CircleSlash", rule: "enemy pieces cannot end a move next to your king", keep: (m, api) => { const k = kingSquare(api.board, api.me); return k == null || !ringAround(k).includes(m.to); } },
  { id: "quiet_cloister", name: "Quiet Cloister", flavor: "Visiting clergy may not sermonize on this side of the board.", icon: "Church", rule: "enemy bishops cannot end a move in your half", keep: (m, api) => !(m.piece === "b" && inHalf(api.me, m.to)) },
  { id: "invitation_only", name: "Invitation Only", flavor: "The back two ranks are a private function.", icon: "Ticket", rule: "enemy pieces cannot end a move on your back two ranks", keep: (m, api) => relRank(api.me, m.to) > 2 },
];

function velvetRope(entry: (typeof VELVET_ROPES)[number]): Buff {
  return opener(
    entry,
    `On your opponent's next turn, ${entry.rule}.`,
    timedOppFilter(1, (moves, _inst, api) => moves.filter((m) => entry.keep(m, api))),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Spring Thaw. A delayed sprout: after your Nth move, one pawn from
// a named district (picked by the seeded rng among those that can) advances
// one square on its own.
// ---------------------------------------------------------------------------

const SPRING_THAW: Array<OpenerMeta & { after: number; files: number[] | null; who: string }> = [
  { id: "snowdrop", name: "Snowdrop", flavor: "The first green thing on the queenside every year.", icon: "Flower2", after: 6, files: [0, 1, 2, 3], who: "queenside (files a through d)" },
  { id: "first_robin", name: "First Robin", flavor: "It lands kingside and declares the season open.", icon: "Bird", after: 6, files: [4, 5, 6, 7], who: "kingside (files e through h)" },
  { id: "river_breakup", name: "River Breakup", flavor: "When the center ice cracks, something always floats forward.", icon: "Waves", after: 7, files: [2, 3, 4, 5], who: "central (files c through f)" },
  { id: "hedgerow_buds", name: "Hedgerow Buds", flavor: "The outer lanes green up when nobody is looking.", icon: "Leaf", after: 8, files: [0, 1, 6, 7], who: "outer-file (a, b, g or h)" },
  { id: "sap_run", name: "Sap Run", flavor: "Tap the two center trunks and stand back.", icon: "Droplet", after: 5, files: [3, 4], who: "d- or e-file" },
  { id: "late_spring", name: "Late Spring", flavor: "It always comes. It just files the paperwork slowly.", icon: "Sunrise", after: 9, files: null, who: "(any file)" },
];

function springThaw(entry: (typeof SPRING_THAW)[number]): Buff {
  return opener(
    entry,
    `After your ${entry.after}th move, one of your ${entry.who} pawns with an empty square ahead, chosen at random, advances one square automatically.`,
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = entry.after;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        const candidates = advanceablePawns(api).filter(
          (sq) => entry.files == null || entry.files.includes(FILE(sq)),
        );
        if (candidates.length > 0) advancePawn(api, candidates[api.rng.int(candidates.length)]);
        inst.spent = true;
      },
      status: (inst) => `sprouts in ${turnsLeft(inst)} of your moves`,
    },
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Hired Help. A free-action one-shot: one named retainer wraps one
// of your pieces in a 1-turn shield.
// ---------------------------------------------------------------------------

const HIRED_HELP: Array<
  OpenerMeta & ({ who: string; squares: (api: BuffApi) => Square[]; royal?: never } | { royal: true; who?: never; squares?: never })
> = [
  { id: "doorman", name: "Doorman", flavor: "He guards whichever pawn stands closest to the boss.", icon: "DoorClosed", who: "one of your pawns adjacent to your king", squares: (api) => { const k = kingSquare(api.board, api.me); return k == null ? [] : mySquares(api.board, api.me, "p").filter((sq) => ringAround(k).includes(sq)); } },
  { id: "hired_muscle", name: "Hired Muscle", flavor: "Discreet, broad-shouldered, excellent references.", icon: "Dumbbell", who: "one of your knights or bishops", squares: (api) => [...mySquares(api.board, api.me, "n"), ...mySquares(api.board, api.me, "b")] },
  { id: "parasol_bearer", name: "Parasol Bearer", flavor: "Rain, sun, or rooks: nothing touches her majesty today.", icon: "Umbrella", royal: true },
  { id: "night_custodian", name: "Night Custodian", flavor: "He locks one tower and pockets the only key.", icon: "KeyRound", who: "one of your rooks", squares: (api) => mySquares(api.board, api.me, "r") },
  { id: "bricklayer", name: "Bricklayer", flavor: "One queenside pawn gets a fresh course of masonry.", icon: "BrickWall", who: "one of your queenside pawns (files a through d)", squares: (api) => mySquares(api.board, api.me, "p").filter((sq) => FILE(sq) <= 3) },
  { id: "harbor_pilot", name: "Harbor Pilot", flavor: "One kingside pawn is steered clear of every reef for a turn.", icon: "Ship", who: "one of your kingside pawns (files e through h)", squares: (api) => mySquares(api.board, api.me, "p").filter((sq) => FILE(sq) >= 4) },
];

function hiredHelp(entry: (typeof HIRED_HELP)[number]): Buff {
  if (entry.royal) {
    return opener(
      entry,
      "Use once as a free action: your queen cannot be captured during your opponent's next turn.",
      {
        ...activatedSimple((_inst, api) => {
          const q = mySquares(api.board, api.me, "q")[0];
          if (q != null) shield1(api, q);
        }),
        freeAction: true,
      },
    );
  }
  return opener(
    entry,
    `Use once as a free action: ${entry.who} cannot be captured during your opponent's next turn.`,
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : { kind: "square", label: "Choose who gets the guard", squares: entry.squares!(api) },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) shield1(api, picks[0].square);
      },
      { freeAction: true },
    ),
  );
}

// ---------------------------------------------------------------------------
// FAMILY: Grand Gestures. Pure ceremony, applied on pick: a flash, a title,
// a photograph. Absolutely nothing else, and proudly so.
// ---------------------------------------------------------------------------

const GRAND_GESTURES: Array<OpenerMeta & { line: string; act: (api: BuffApi) => void }> = [
  { id: "ribbon_cutting", name: "Ribbon Cutting", flavor: "The center is hereby declared open. It was already open.", icon: "Scissors", line: "The four center squares are ceremonially inaugurated with a flash. Nothing else happens.", act: (api) => flashSquares(api, [...CENTER4], true) },
  { id: "the_management", name: "The Management", flavor: "Complaints may be addressed to the crown directly.", icon: "Briefcase", line: "Your king is named The Management, purely cosmetically, forever.", act: (api) => { const k = kingSquare(api.board, api.me); if (k != null) pinCosmetic(api, k, api.me, "nametag", null, "The Management"); } },
  { id: "team_photo", name: "Team Photo", flavor: "The pawns in front, kneeling. The rooks refuse to smile.", icon: "Camera", line: "Your whole army flashes for one commemorative photograph. Nothing else happens.", act: (api) => flashSquares(api, mySquares(api.board, api.me), true) },
  { id: "follow_spot", name: "Follow Spot", flavor: "Wherever she stands is, by definition, downstage center.", icon: "Lightbulb", line: "A spotlight marks your queen until your opponent replies. Nothing else happens.", act: (api) => { const q = crownSquare(api); if (q != null) flashSquares(api, [q]); } },
  { id: "pep_talk", name: "Pep Talk", flavor: "Gentlemen: there are sixty-four squares and we only need one.", icon: "Megaphone", line: "Your king's square is thumped encouragingly. Nothing else happens.", act: (api) => { const k = kingSquare(api.board, api.me); if (k != null) flashSquares(api, [k], true); } },
  { id: "roll_call", name: "Roll Call", flavor: "Everyone on the back rank answers HERE except the knight, who whinnies.", icon: "ClipboardList", line: "Your back-rank pieces flash as their names are read out. Nothing else happens.", act: (api) => flashSquares(api, mySquares(api.board, api.me).filter((sq) => RANK(sq) === ownRank(api.me, 0)), true) },
];

function grandGesture(entry: (typeof GRAND_GESTURES)[number]): Buff {
  return opener(entry, entry.line, instant((_inst, api) => entry.act(api)));
}

// ---------------------------------------------------------------------------
// Assembly. Called from openers.ts while it builds OPENER_CARDS; never at
// this module's top level (see the cycle note in the header).
// ---------------------------------------------------------------------------

export function buildOpeners2(): Buff[] {
  return [
    ...WEATHER_OMENS.map(weatherOmen),
    ...LUCKY_CHARMS.map(luckyCharm),
    ...FIELD_REPORTS.map(fieldReport),
    ...SHOP_PERKS.map(shopPerk),
    ...SLOW_SEASONS.map(slowSeason),
    ...FINE_PRINT.map(finePrint),
    ...FIRST_BLOOD.map(firstBlood),
    ...OVERTURES.map(overture),
    ...HOUSEWARMINGS.map(housewarming),
    ...WARDROBE.map(wardrobe),
    ...WATCHTOWER.map(watchtower),
    ...HOUSE_RULES.map(houseRule),
    ...GRADUATIONS.map(graduation),
    ...SUPERSTITIONS.map(superstition),
    ...NIGHT_WATCH.map(nightWatch),
    ...VELVET_ROPES.map(velvetRope),
    ...SPRING_THAW.map(springThaw),
    ...HIRED_HELP.map(hiredHelp),
    ...GRAND_GESTURES.map(grandGesture),
  ];
}
