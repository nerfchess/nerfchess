// Where a card's effect belongs on the board, derived rather than judged.
//
// THE RULE, as stated: if the effect is general it is centralized; if it lands
// directly on a few pieces, laser them down.
//
//   board  the effect covers the whole board, both armies, a global rule, or
//          has no board location at all (draft, clock, information). It stays
//          centred, because centring IS correct for it.
//   aim    the effect lands on a named set of pieces. The art reaches toward
//          the victims along --fx-len and fires in the real victim order.
//   cast   the effect lands on one square or one piece.
//
// WHY IT IS DERIVED
//
// There are 2,448 cards. Deciding each one by hand does not finish, and worse,
// it does not stay decided: the next card added gets whatever its author felt
// like. A derivation finishes by construction and holds for cards not written
// yet.
//
// WHAT IT DOES AND DOES NOT CLAIM
//
// This returns the SET of anchors that are defensible for a card, not a single
// verdict. That distinction is the whole honesty of it: the 58-category
// taxonomy is mechanical but not infinitely fine, and several categories hold
// both single-target and army-wide cards (capture-denial covers "your queen
// cannot be captured" and "no piece may capture this turn" alike). Forcing one
// answer there would mean overruling correct art with a coin flip.
//
// So the category sets a base, the rule text refines it, and the gate fails
// only a card whose declared anchor is OUTSIDE the set. That still catches the
// failure the user actually reported - a single-piece card declaring "board"
// and blossoming in the middle of the board instead of at the piece - while
// never demanding a change it cannot justify.

export type Anchor = "cast" | "aim" | "board";

const ALL: readonly Anchor[] = ["cast", "aim", "board"];

/**
 * Categories whose scope is fixed by what the category IS.
 *
 * A card in one of these cannot reasonably want another anchor: a mass freeze
 * is not a single square, and a draft reroll has no square at all.
 */
const BY_CATEGORY: Record<string, readonly Anchor[]> = {
  // --- Global by construction: a rule change, or the whole army -----------
  "mass-freeze": ["board"],
  "mass-removal": ["board"],
  "mass-shield": ["board"],
  "mass-army-spawn": ["board"],
  "self-movement-restriction": ["board"],
  "enemy-movement-restriction": ["board"],
  "piece-class-lockdown": ["board"],
  "direction-geometry-lock": ["board"],
  "board-geometry-warp": ["board"],
  "check-rule-change": ["board"],
  "special-rule-grant": ["board"],
  "special-rule-denial": ["board"],
  "capture-condition": ["board"],
  "capture-permission": ["board"],
  "alt-win-loss-condition": ["board"],
  "move-budget-change": ["board"],

  // --- Genuinely mixed: the category alone does not decide ----------------
  //
  // Left open on purpose and resolved from the rule text below. "Your pawns
  // promote to knights" and "one pawn promotes now" share a category, and
  // saying "any anchor" for both is more honest than picking one for all 55.
  "promotion-grant": ALL,
  "promotion-denial": ALL,
  "randomness-gamble": ALL,
  "capture-denial": ALL,
  "delayed-contract": ALL,

  // --- No board location at all: draft, clock, turn order, information ----
  //
  // These are the cards where "centralized" is not a compromise but the only
  // truthful staging. Nothing happens at a square, so nothing may claim one.
  "draft-advantage": ["board"],
  "draft-denial": ["board"],
  "card-tutor-gain": ["board"],
  "nerf-relief": ["board"],
  "clock-gain-self": ["board"],
  "clock-drain-enemy": ["board"],
  "extra-turn-theft": ["board"],
  "turn-skip-enemy": ["board"],
  "info-reveal": ["board"],
  "info-denial": ["board"],
  "no-op-cosmetic": ["board"],

  // --- Regions: a zone is neither one square nor the whole board ----------
  //
  // Zone art is staged in the board frame (so it lands on the real region) but
  // is not aimed at pieces, so both readings are defensible.
  "zone-denial": ["board", "cast"],
  "zone-buff": ["board", "cast"],
  "zone-lock-in": ["board", "cast"],
  "terrain-hazard": ["board", "cast"],

  // --- One square, one piece ---------------------------------------------
  //
  // "cast" and "aim" are BOTH right here and the choice belongs to the art.
  // Landing on the victim's square and lasering it down from the caster are
  // two readings of the same single-target card; what is never right is
  // "board", which is the failure this whole rule exists to catch.
  "single-piece-freeze": ["cast", "aim"],
  "single-piece-shield": ["cast", "aim"],
  "instant-piece-spawn": ["cast", "aim"],
  "instant-piece-removal": ["cast", "aim"],
  "piece-revival": ["cast", "aim"],
  "piece-mind-control": ["cast", "aim"],
  "piece-upgrade-transform": ["cast", "aim"],
  "piece-downgrade-transform": ["cast", "aim"],
  "target-marking": ["cast", "aim"],
  "king-protection": ["cast", "aim"],

  // --- Source to destination: the vector IS the card ----------------------
  //
  // A relocation that does not travel from somewhere to somewhere has thrown
  // away its own subject, so "board" is never right for these.
  "piece-swap": ["aim", "cast"],
  "teleport-relocate": ["aim", "cast"],
  "piece-nudge-reposition": ["aim", "cast"],
  "forced-move": ["aim", "cast"],
  "movement-phase-jump": ["aim", "cast"],
  "extra-move": ["aim", "cast"],
  "movement-upgrade": ["aim", "cast"],

  // --- A named few: laser them down ---------------------------------------
  // Not a bare ["aim"]: a standing trap that freezes whatever wanders into a
  // region is a zone, and leaving this with a single option gave a card whose
  // art could not honestly aim nowhere to go.
  "multi-piece-freeze": ["aim", "cast"],
  "forced-sacrifice": ["aim", "cast"],
  "conditional-piece-removal": ["aim", "cast"],
  "capture-punishment": ["aim", "cast"],
  "retaliation-damage": ["aim", "cast"],

};

/**
 * Text that says the effect touches an OPEN set, whatever kind of effect the
 * category says it is.
 *
 * This exists because the taxonomy files a card by its most distinctive hook,
 * not by its scope, and the two genuinely come apart. Shield Wall ("any of
 * your pawns that stands beside another cannot be captured") is filed
 * single-piece-shield and is army-wide. Great Return ("every captured piece of
 * both sides returns at once") is filed single-piece-freeze, for its one
 * trailing clause about the biggest returner. Demanding "cast" from either
 * would be the derivation overruling the card.
 *
 * So a category says what KIND of effect this is, and the text says HOW MANY
 * it touches. When the text says "an open set", "board" is re-admitted no
 * matter what the category thought. Deliberately narrower than the markers
 * used for narrowing below: this one can only ever add an option, but it is
 * the one that has to survive contact with 2,448 hand-written rules.
 */
const OPEN_SET_MARKERS = [
  /\bany of (?:your|their|the)\b/,
  /\ball (?:your|their|enemy|friendly)\b/,
  /\bevery\b/,
  /\beach of (?:your|their)\b/,
  /\bnone of (?:your|their)\b/,
  /\bno (?:piece|pieces) (?:may|can)\b/,
  // "visible to both players" is an AUDIENCE, not a scope: a card that shows
  // something to everyone is not thereby board-wide.
  /(?<!visible to )\bboth (?:players|armies|sides)\b/,
  // Real card text writes the possessive, and the apostrophe-s sits exactly
  // where the plural-class pattern below expects the noun. Without this,
  // "Your opponent's pawns are rooted in salted ground" -- an army-wide freeze
  // -- resolved to cast/aim with NO board option, so the gate would have
  // actively failed the correct staging.
  /\b(?:your |the )?opponent's (?:pieces|pawns|knights|bishops|rooks|queens)\b/,
  // Clause material can sit between the subject and its verb: Eternal Keep
  // says "your pieces standing on your first rank cannot be captured", and
  // warding a whole rank of the army is not a single square.
  /\byour (?:pieces|pawns)\b[^.]{0,48}?\b(?:cannot|can't|are)\b/,
  /\b(?:your|their) captured pieces\b/,
  // A bare plural piece class is a whole class: Eclipse blinding "their
  // bishops and queen" is piece-class-lockdown wearing another category's
  // name. Guarded by the singular check below, so "one of your knights" does
  // not reach here.
  /\b(?:your|their|enemy) (?:pawns|knights|bishops|rooks|queens)\b/,
];

/**
 * The payload is a clock or a draft, whatever the category says.
 *
 * The taxonomy files a card by its most distinctive hook, and for a handful
 * that hook is the TRIGGER rather than the EFFECT. Coronation Bonus is filed
 * promotion-grant and pays "+30 seconds on your clock"; Blood Price is filed
 * capture-punishment and takes 12 seconds and a reroll. The rule's own
 * doctrine already sends clock and draft cards to "board" because they happen
 * nowhere on the board, so a card whose payload is one of those gets the same
 * option no matter which door it came in through.
 */
const META_PAYLOAD_MARKERS = [
  /\bseconds (?:on|from|to) (?:your|their|the)\b/,
  /\bon your clock\b/,
  /\bdraft (?:reroll|offer|rerolls)\b/,
  /\bdrafts? (?:is|are) skipped\b/,
  /\bnext draft\b/,
];

/** "all your knights", "every piece", "each enemy pawn", "the whole board". */
const GLOBAL_MARKERS = [
  /\ball (?:your|their|enemy|friendly|of)\b/,
  /\bevery\b/,
  /\beach (?:of your|of their|enemy|friendly|player)\b/,
  /\bboth (?:players|armies|sides|kings)\b/,
  /\b(?:the )?(?:whole|entire) (?:board|game)\b/,
  /\byour (?:pieces|pawns|knights|bishops|rooks|queens)\b/,
  /\benemy (?:pieces|pawns|knights|bishops|rooks|queens)\b/,
  /\b(?:your |the )?opponent's (?:pieces|pawns|knights|bishops|rooks|queens)\b/,
  /\bfor the rest of the game\b/,
  /\bno (?:piece|pieces|one) (?:may|can)\b/,
  /\bboard\b/,
];

/** "one of your", "a single", "choose a knight", "the enemy queen". */
const SINGLE_MARKERS = [
  // "every one of your pieces" contains "one of your". Without the lookbehind
  // that substring made three whole-army tableaux read as single-target, and
  // the rule went on to demand they be staged on one square.
  /(?<!every )\bone of (?:your|their|the)\b/,
  // "a single PIECE", not "a single move": the bare form vetoed the "none of
  // their pieces" open-set marker in the very same sentence.
  /\ba single (?:piece|pawn|knight|bishop|rook|queen|king|square)\b/,
  /\bchoose (?:a|an|one)\b/,
  /\bthe (?:enemy|opposing) (?:king|queen|rook|bishop|knight|pawn)\b/,
  /\bthat (?:piece|pawn|square)\b/,
  /(?<!every )\bone (?:enemy|friendly|of)\b/,
];

/**
 * "two of your knights", "up to four enemy pawns", "the 3 nearest".
 *
 * A count only names a few TARGETS when a piece noun follows it. Counting
 * anything else and calling it a target list is how "turn every enemy knight,
 * bishop, rook and queen to stone **for 3 of their turns**" came to be filed
 * as a few-target card: the duration clause matched, vetoed the open-set
 * widening the first clause had earned, and the rule then demanded that a
 * whole-army petrification stage itself on one square. "May slide diagonally
 * **up to two squares**" (a movement range) and "**up to five in all**" (a
 * pocket count) failed the same way.
 */
const COUNT = "(?:two|three|four|five|2|3|4|5)";
const PIECE_NOUN = "(?:pieces|pawns|knights|bishops|rooks|queens|minors|majors)";
const FEW_MARKERS = [
  new RegExp(`\\b${COUNT} (?:of (?:your|their|the) )?(?:enemy |friendly |random )?${PIECE_NOUN}\\b`),
  new RegExp(`\\bup to ${COUNT} (?:of (?:your|their|the) )?(?:enemy |friendly |random )?${PIECE_NOUN}\\b`),
  /\bthe (?:two|three|four|2|3|4) (?:nearest|closest|weakest|strongest)\b/,
];

function matchesAny(text: string, res: RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

/**
 * The anchors that are defensible for this card.
 *
 * Never returns an empty set: if the category is unknown and the rule text is
 * silent about scope, every anchor is allowed, because a gate that fails on
 * "I could not tell" is a gate that gets switched off.
 */
export function allowedAnchors(category: string, rule: string): readonly Anchor[] {
  const base = BY_CATEGORY[category] ?? ALL;
  const text = rule.toLowerCase();

  // An explicit count or an explicit singular always beats a bare plural, and
  // both are settled first so nothing below can widen past them. "Choose one
  // of your knights" must not read as a whole class just because it contains
  // the words "your knights".
  // Scope is declared in the FIRST sentence; later sentences qualify it.
  //
  // Verdant Shield reads "all of your pawns cannot be captured... Any enemy
  // pawn directly in front of one of your pawns is rooted." Scanning the whole
  // text at once let the subordinate "one of your pawns" veto the "all of
  // your pawns" that opens the card, and the rule then demanded a one-square
  // staging for an army-wide ward. An open set stated up front wins outright.
  // The first sentence resolves with the SAME precedence as the whole text, or
  // it would smuggle past the guard the plural-class marker needs: "freeze two
  // of their knights" contains "their knights", and only the count standing in
  // front of it says that is two targets rather than a class.
  const head = text.split(/(?<=\.)\s/)[0] ?? text;
  // An explicit quantifier outranks a later back-reference. Gravebloom says
  // "EVERY square where they capture becomes a grave-garden ... no enemy piece
  // may move onto THAT square": the "that square" is anaphora pointing back at
  // the set the sentence just quantified, not a second, singular target. Left
  // to the ordinary precedence it vetoed the quantifier and turned a standing
  // board rule into a one-square effect.
  //
  // The time exclusion matters: "every 3 turns" and "every time" quantify a
  // CADENCE, not a set of pieces.
  const decisive = /\bevery (?!turn|time|other|second|third|fourth|\d)/.test(head);
  const headOpen =
    decisive ||
    (!matchesAny(head, FEW_MARKERS) &&
      !matchesAny(head, SINGLE_MARKERS) &&
      matchesAny(head, OPEN_SET_MARKERS));
  const few = !headOpen && matchesAny(text, FEW_MARKERS);
  const single = !headOpen && matchesAny(text, SINGLE_MARKERS);
  const openSet = headOpen || (!few && !single && matchesAny(text, OPEN_SET_MARKERS));
  const meta = matchesAny(text, META_PAYLOAD_MARKERS);

  // Scope beats kind. A card whose text names an open set, or whose payload is
  // a clock or a draft, is board-scale even when its category says
  // single-target, so "board" is re-admitted rather than the card being told
  // its own art is wrong.
  //
  // Order matters here, and it carries the difference between the two ways a
  // card can reach "board". allowedAnchors is read twice: the gate asks
  // whether a declared anchor is a MEMBER (order irrelevant), and
  // preferredAnchor asks what to AUTHOR (order decides).
  //
  // An open set means the card IS army-wide, so "board" goes first and becomes
  // what gets authored. Appending it instead was a real bug: a card the
  // derivation had just concluded was army-wide still got authored as "cast",
  // which is the exact staging failure this rule exists to prevent.
  //
  // A meta payload is weaker evidence and only ever PERMITS "board". Such a
  // card often has a board-side trigger and an off-board payload at once --
  // "one knight may make a longer leap, and you gain a draft reroll" -- and
  // both stagings are truthful, so the art keeps the choice. Making it
  // preferred here would have thrown one-square effects across the board.
  if (!base.includes("board")) {
    if (openSet) return ["board", ...base];
    if (meta) return [...base, "board"];
  }

  // Narrowing, unlike the widening above, resolves only what the category left
  // OPEN. Where the category already gave a narrowed answer, that answer
  // stands: a zone card saying "no piece may enter" trips the global markers,
  // but a zone is still a region rather than the whole board, and letting the
  // text override would replace a considered answer with a keyword match.
  if (base !== ALL) return base;

  // A board-side TRIGGER with an off-board payload can honestly be staged
  // either way: Coronation Bonus fires when a pawn promotes and pays a clock
  // bonus, so both the promoting square and a centred flourish are truthful.
  // Narrowing it on the trigger alone would forbid the one that matches what
  // the card is actually for.
  if (meta) return ALL;

  if (few) return ["aim", "cast"];
  if (single) return ["cast", "aim"];
  if (matchesAny(text, GLOBAL_MARKERS)) return ["board"];
  return base;
}

/** The anchor to author when writing a card from scratch. */
export function preferredAnchor(category: string, rule: string): Anchor {
  return allowedAnchors(category, rule)[0];
}
