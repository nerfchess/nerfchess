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
  "multi-piece-freeze": ["aim"],
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
  /\bboth (?:players|armies|sides)\b/,
  /\byour (?:pieces|pawns) (?:cannot|can't|are)\b/,
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
  /\bfor the rest of the game\b/,
  /\bno (?:piece|pieces|one) (?:may|can)\b/,
  /\bboard\b/,
];

/** "one of your", "a single", "choose a knight", "the enemy queen". */
const SINGLE_MARKERS = [
  /\bone of (?:your|their|the)\b/,
  /\ba single\b/,
  /\bchoose (?:a|an|one)\b/,
  /\bthe (?:enemy|opposing) (?:king|queen|rook|bishop|knight|pawn)\b/,
  /\bthat (?:piece|pawn|square)\b/,
  /\bone (?:enemy|friendly|of)\b/,
];

/** "two of", "three enemy", "up to four", "the 3 nearest". */
const FEW_MARKERS = [
  /\b(?:two|three|four|five|2|3|4|5) (?:of|enemy|friendly|your|their|random)\b/,
  /\bup to (?:two|three|four|five|2|3|4|5)\b/,
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

  // Scope beats kind. A card whose text names an open set is board-scale even
  // when its category says single-target, so "board" is re-admitted rather
  // than the card being told its own art is wrong.
  if (!base.includes("board") && matchesAny(text, OPEN_SET_MARKERS)) {
    return [...base, "board"];
  }

  // Narrowing, unlike the widening above, resolves only what the category left
  // OPEN. Where the category already gave a narrowed answer, that answer
  // stands: a zone card saying "no piece may enter" trips the global markers,
  // but a zone is still a region rather than the whole board, and letting the
  // text override would replace a considered answer with a keyword match.
  if (base !== ALL) return base;
  const few = matchesAny(text, FEW_MARKERS);
  const single = matchesAny(text, SINGLE_MARKERS);
  // A count beats a bare plural: "freeze two of their knights" is aimed at two
  // pieces even though "their knights" reads as global.
  const global = !few && !single && matchesAny(text, GLOBAL_MARKERS);

  let refined: readonly Anchor[];
  if (few) refined = ["aim", "cast"];
  else if (single) refined = ["cast", "aim"];
  else if (global) refined = ["board"];
  else return base;

  // The refinement narrows the category's set; it never widens it. A rule that
  // says "all" cannot make a single-piece-shield board-wide.
  const both = base.filter((a) => refined.includes(a));
  return both.length ? both : base;
}

/** The anchor to author when writing a card from scratch. */
export function preferredAnchor(category: string, rule: string): Anchor {
  return allowedAnchors(category, rule)[0];
}
