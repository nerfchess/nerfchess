// Fine-grained MECHANICAL classification of every card in the library: what does
// this card actually do to the board, the clock, or the draft?
//
// Why this exists on top of `BuffCategory`: the authored category (movement /
// pieces / tempo / protection / attack / draft / info / hex / item / nerf) mixes
// theme with mechanic and is far too coarse to balance against. "Pieces" holds
// both "three of your pawns become queens" and "one enemy pawn cannot move for a
// turn". A balance pass needs to ask "show me every card that instantly deletes a
// piece" and get an answer, so this module sorts all ~2450 cards into ~60 buckets
// keyed on effect, not flavour.
//
// Two rules shape the design:
//
//  1. DERIVED, NOT AUTHORED. Same contract as src/lib/nerfCategories.ts: the
//     classification is computed from the static library, so adding a card needs
//     no manual tagging. Tuning the taxonomy is a single edit to
//     EFFECT_CATEGORY_DEFS. The escape hatch for cards the ladder reads wrong is
//     EFFECT_CATEGORY_OVERRIDES, kept deliberately small.
//  2. EXACTLY ONE BUCKET PER CARD. The ladder is priority-ordered and
//     first-match-wins, so a card that freezes a queen AND grants 5 seconds lands
//     in the freeze bucket, not the clock bucket. Order is therefore
//     load-bearing: loudest, most board-changing effects first, incidental riders
//     last. Read the ladder top to bottom as "what is this card FOR".
//
// Kept out of the UI on purpose (like nerfCategories): today this feeds
// docs/card-registry.json and docs/card-categories.md via
// scripts/gen-card-registry.ts and scripts/gen-card-categories.ts, both gated in
// CI so the taxonomy can never drift from the engine.

import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";

/** Stable, kebab-case identifier. Also the doc's anchor and the registry value. */
export type EffectCategoryId = string;

/** The narrow shape both Buff and Nerf project onto for classification. */
export interface ClassifiableCard {
  id: string;
  kind: "buff" | "nerf";
  name: string;
  description: string;
  /** BuffCategory for buffs, "nerf" for nerfs. Carried for rungs that need it. */
  category: string;
  /** Buff.kind for buffs, "passive-rule" for nerfs. */
  mechanic: "passive" | "instant" | "activated" | "passive-rule";
  tier: number;
  /**
   * Which engine hooks the card implements. Structural truth, so it beats prose
   * when the text is ambiguous: `augmentMoves` means the card grants its owner
   * moves, `filterOpponentMoves` / `filterMoves` means it takes moves away.
   */
  hooks: readonly string[];
}

export interface EffectCategoryDef {
  id: EffectCategoryId;
  /** Human label, as it appears as a heading in docs/card-categories.md. */
  label: string;
  /** One line: what belongs in this bucket. */
  blurb: string;
  /** Matched against `${name}. ${description}` lowercased. Any hit counts. */
  patterns: RegExp[];
  /** Extra structural condition; must also hold for the patterns to count. */
  when?: (c: ClassifiableCard) => boolean;
}

/** Cards that resolve the moment they are drafted or used, versus while held. */
const isImmediate = (c: ClassifiableCard) =>
  c.mechanic === "instant" || c.mechanic === "activated";

/**
 * "Your opponent cannot draft manipulation buffs next draft" (suppress) is a
 * card-economy card, not a movement restriction. Both catch-all restriction
 * buckets sit above the draft buckets, so they have to stand aside for it.
 */
const restrictsDraftOnly = (c: ClassifiableCard) =>
  /(cannot|can(no|')t|may not) draft/.test(text(c));

/**
 * Tells that a card described as cosmetic is actually doing something. Used
 * only by the no-op bucket, which sits first in the ladder and would otherwise
 * swallow every card carrying a "purely decorative" flourish.
 */
const MECHANICAL_RIDERS = [
  /rerolls?\b/,
  /tier higher/,
  /shows three cards/,
  /learn the tier/,
  /\d+ seconds?/,
  /be captured/,
  /uncapturable/,
  /\bfreez/,
  /\bfrozen\b/,
  /drafted card arrives nullified/,
  /(is|are) removed/,
  /skips? (their|a|one) turn/,
  /becomes? a (queen|rook|bishop|knight)\b/,
];
const hasMechanicalRider = (c: ClassifiableCard) =>
  MECHANICAL_RIDERS.some((p) => p.test(text(c)));

// ---------------------------------------------------------------------------
// The ladder. Order is the classification priority; see rule 2 above.
// ---------------------------------------------------------------------------

export const EFFECT_CATEGORY_DEFS: readonly EffectCategoryDef[] = [
  // --- Nothing at all -------------------------------------------------------
  {
    id: "no-op-cosmetic",
    label: "Purely cosmetic, no mechanical effect",
    blurb: "Flashes, ceremonies and jokes that change nothing about the game.",
    patterns: [
      /nothing else happens/,
      /changes nothing at all/,
      /purely (cosmetic|decorative)/,
      /\bit does nothing\b/,
      /no other effect/,
      /has no effect on (the game|play)/,
    ],
    // A cosmetic clause is usually only PART of the card: "your king wears a
    // paper crown (purely decorative), and you gain 1 draft reroll" is a draft
    // card, and "a party hat, forever (purely decorative). If it is one of
    // yours, it cannot be captured" is a shield. Only file a card here when the
    // rest of its text carries no mechanical clause. Same for the gambling and
    // draft-nullify cards, whose "nothing happens" is one branch of a real
    // effect, not the whole card.
    when: (c) => !hasMechanicalRider(c),
  },

  // --- Game-ending ----------------------------------------------------------
  {
    id: "alt-win-loss-condition",
    label: "Changes how the game is won or lost",
    blurb: "Adds, removes or rewrites a win, loss or draw condition.",
    patterns: [
      /you (instantly |immediately )?win\b/,
      /wins? the game/,
      /you lose the game/,
      /you (instantly |immediately )?lose\b/,
      /the game (immediately )?ends/,
      /counts as (a )?(check)?mate/,
      /is (a )?(instant |immediate )?(win|loss|draw)/,
      /claim (a|the) (win|draw)/,
      /(win|lose) (instead|by)/,
      /\bstalemate\b/,
      /can(no|')t lose/,
      /\blose if\b/,
      /agreed draw/,
    ],
  },

  // --- Turn economy ---------------------------------------------------------
  {
    id: "extra-turn-theft",
    label: "Grants a whole extra turn",
    blurb: "The holder takes a second full turn: the strongest tempo effect there is.",
    patterns: [
      /extra turn/,
      /another (full )?turn/,
      /two (moves|turns) in a row/,
      /move twice/,
      /take (a|an) (additional|second) turn/,
      /back-to-back turns/,
    ],
  },
  {
    id: "turn-skip-enemy",
    label: "Makes the opponent lose a turn",
    blurb: "The opponent's turn is skipped, forfeited or passed for them.",
    patterns: [
      /skips? (their|your opponent's|a|one|the) (next |following )?turns?/,
      /(they|your opponent) lose(s)? (their|a|one) (next |following )?turns?/,
      /forfeits? (their|a|one) turn/,
      /(their|your opponent's) turn is (skipped|lost|passed)/,
      /misses? (their|a) turn/,
    ],
  },

  // --- Removal --------------------------------------------------------------
  {
    id: "forced-sacrifice",
    label: "Costs you one of your own pieces",
    blurb:
      "The price of the card is a piece of the holder's own army. Sits above the removal buckets: a card that spends a piece is a sacrifice card even when it also kills one of theirs.",
    patterns: [
      /sacrific/,
      /you must give up/,
      /one of your (own )?\w+ is (removed|destroyed|captured|lost)/,
      /at the cost of (a|one of your)/,
      /give up (a|one of your)/,
      /(destroy|remove|tear down|hand|send|spend)\w* one of your (own )?/,
      /it is removed and truly lost/,
      /in payment remove one of your/,
    ],
  },
  {
    id: "mass-removal",
    label: "Removes several pieces at once",
    blurb: "Board-wide or multi-piece destruction, not a single kill.",
    patterns: [
      /(all|every|each|both|two|three|four) [^.]{0,50}(are|is) (removed|destroyed|captured|erased)/,
      /(remove|destroy|erase|wipe)[sd]? (all|every|each|two|three|four|both) /,
      /(all|every|each) [^.]{0,40}(vanish|explode|die|perish|are swept)/,
      /wipes? the board/,
      /every (enemy |their )?(pawn|knight|bishop|rook|piece)s? [^.]{0,120}(removed|destroyed|captured|blown off|swept off|banned from the board)/,
      /(up to )?(two|three|four) [^.]{0,40}(are|is) (permanently )?banned from the board/,
      /(clear|clears|sweep|sweeps|purge|purges|destroy|destroys)\w* (all|every|each|up to)/,
      /(remov|destroy|eras|clear|wip|captur|kill)\w* up to (two|three|four|five|\d+)/,
      /wink out of existence/,
      /devour/,
      /every [^.]{0,120}(is|are) consumed/,
    ],
  },
  {
    id: "instant-piece-removal",
    label: "Instantly deletes a piece",
    blurb: "Take a piece off the board right now, no capture and no move required.",
    patterns: [
      /(remove|destroy|erase|delete|obliterate|banish)[sd]? (one|a|an|the|any|that|target|your|their|its|enemy|his|chosen)/,
      /(is|are) (removed|destroyed|erased|obliterated|banished) (from the board|at once|immediately)/,
      /taken? off the board/,
      /(vanish|vanishes|evaporates|disintegrates) (at once|immediately|on the spot)/,
      /kill(s)? (one|a|an|the|any|target)/,
      /(is|are) (permanently )?banned from the board/,
      /blown off the board/,
    ],
    when: isImmediate,
  },
  {
    id: "conditional-piece-removal",
    label: "Deletes a piece on a trigger",
    blurb: "A piece leaves the board later, when some condition fires.",
    patterns: [
      /(remove|destroy|erase|delete|obliterate|banish)[sd]? (one|a|an|the|any|that|target|your|their|its|enemy|chosen)/,
      /(is|are) (removed|destroyed|erased|obliterated|banished)/,
      /taken? off the board/,
      /(vanish|vanishes|evaporates|disintegrates)/,
      /(is|are) (permanently )?banned from the board/,
      /blown off the board/,
      /crumbles to rubble/,
      /(is|are) (consumed|swallowed|devoured)/,
    ],
  },
  {
    id: "retaliation-damage",
    label: "Punishes the piece that captures",
    blurb: "Capturing this card's pieces costs the capturer something.",
    patterns: [
      /retaliat/,
      /(explodes?|detonat)/,
      /the capturing piece/,
      /whoever captures/,
      /takes? (it|them|the piece) with (it|them)/,
      /counter-?(attack|strike)/,
      /avenge/,
    ],
  },

  // --- Spawning and resurrection -------------------------------------------
  {
    id: "mass-army-spawn",
    label: "Instantly spawns several pieces",
    blurb: "More than one piece joins the board at once.",
    patterns: [
      /(two|three|four|five|several|a rank of|a row of) [^.]{0,30}(pawns|knights|bishops|rooks|queens|pieces) (appear|are placed|spawn|join|arrive|rise)/,
      /(summon|spawn|place|conjure)[sd]? (two|three|four|five|several|a rank of)/,
      /(all|every) [^.]{0,25}(your )?(captured|fallen) [^.]{0,20}return/,
      /full resurrection/,
      /(a|an) (army|legion|host) (of|appears|rises|joins)/,
      /(two|three|four|five) (new |fresh |bee )?pawns? (land|drop|slip|appear|join)/,
      /(two|three|four|five) [^.]{0,30}(join|land in) your pocket/,
      /(a|an) \w+ and a \w+ join your pocket/,
      /swarm of \d+/,
    ],
  },
  {
    id: "instant-piece-spawn",
    label: "Instantly spawns a piece",
    blurb: "A brand new piece appears on the board out of nothing.",
    patterns: [
      /summon(s|ed)?\b/,
      /(spawn|conjure)[sd]?\b/,
      /a (fresh|new|spare|extra) \w+ (appears|arrives|joins|is placed|lands|takes|occupies|claims|reports)/,
      /(place|placing) (a|an|one) (new |fresh |extra |spare )?(pawn|knight|bishop|rook|queen)/,
      /gain (a|an) (extra |additional |second )?(pawn|knight|bishop|rook|queen)\b/,
      /(a|one) (pawn|knight|bishop|rook|queen) (appears|arrives|materialis|materializ)/,
      /(slip|slips|land|lands|drop|drops|go|goes) into your pocket/,
      /(ready to be )?drop(ped)? onto empty squares/,
      /(golem|elemental|familiar|homunculus|construct)\w* (serves|joins|answers|rises|stands)/,
      /serves as a (pawn|knight|bishop|rook|queen)/,
      /splits in two/,
      /(exact |identical )?twin on an empty square/,
      /(raise|raises|raising) (a|an) (pawn|knight|bishop|rook|queen)/,
      /(appears|arrives) and fights/,
      /fights (beside|for|as) (you|a|an)/,
      /\b(hire|hires|conscript|conscripts|recruit|recruits)\b/,
      /invades [^.]{0,40}as a (pawn|knight|bishop|rook|queen)/,
      /(pawn|piece|knight|bishop|rook) sprouts/,
      /(airlifted|into your reserves)/,
      /serves like the real thing/,
      /fights like the real thing/,
      /(into|to) your pocket/,
      /joins your pocket/,
      /(a|an|one) (pawn|knight|bishop|rook|queen) joins/,
      /place (a|an|one|two|three|them|it) [^.]{0,60}(on|onto) (an? |two |empty)/,
      /march(es)? in from/,
    ],
  },
  {
    id: "piece-revival",
    label: "Brings a captured piece back",
    blurb: "A piece already taken off the board returns to play.",
    patterns: [
      /(revive|resurrect|reincarnat)/,
      /(captured|fallen|lost|dead) [^.]{0,70}(returns?|comes? back|is restored|rejoins?)/,
      /returns? (at once |immediately )?to (the board|an empty square|the square|your)/,
      /best captured piece/,
      /(comes?|comes back) back (to|from) (the board|the dead)/,
      /from the graveyard/,
      /(return|returns|restore|restores)\w* (up to )?(one|two|three|five|\d+)? ?(of )?(your )?captured/,
      /your queen returns/,
      /bring (back |it |them |your )?[^.]{0,40}(captured|back)/,
    ],
  },

  // --- Promotion ------------------------------------------------------------
  {
    id: "promotion-grant",
    label: "Promotes a pawn early or for free",
    blurb: "A pawn becomes a bigger piece without walking to the last rank.",
    patterns: [
      /promot/,
      /knighted/,
      /transmute/,
      /queening/,
      /becomes? (a )?(queen|knight|rook|bishop)\b/,
      /pawns? [^.]{0,30}(become|turn into) (a )?(queen|knight|rook|bishop)/,
    ],
    when: (c) => !/can(no|')t promot|may not promot|never promot|no longer promot/.test(text(c)),
  },
  {
    id: "promotion-denial",
    label: "Blocks or taxes promotion",
    blurb: "Promotion itself is forbidden, delayed, downgraded or made conditional.",
    // A bare /last rank/ is NOT promotion denial. Almost every teleport, swap
    // and army-shuffle card carries the legality footnote "Pawns cannot land on
    // a first or last rank" (bn4_ghost_walk, warp_cataclysm, total_warp,
    // bw2_carnival_of_masks, ov_player_trade...), because a pawn may not legally
    // stand there. That rider is rules plumbing, not the card's mechanic, and it
    // was filing 12 of this bucket's 14 cards. The prohibition has to be about
    // promoting.
    patterns: [
      /(cannot|can(no|')t|may not|must not|never|no longer) promot/,
      /promotions? (is|are) (forbidden|blocked|denied|impossible|off|barred)/,
      /(no|without) promotion/,
      /(promot|queening)[^.]{0,40}(costs?|instead of|only if|only when|must first|is delayed)/,
      /(promot|queening)\w*[^.]{0,30}(taxed?|denied|blocked|refused)/,
    ],
  },

  // --- Transformation -------------------------------------------------------
  {
    id: "piece-upgrade-transform",
    label: "Turns your piece into something stronger",
    blurb: "One of the holder's pieces changes type or gains another piece's powers.",
    patterns: [
      /your [^.]{0,30}(becomes?|turns? into|is now) (a|an) /,
      /(becomes?|turns? into) (a|an) (queen|amazon|archbishop|chancellor|dragon|titan|colossus)/,
      /also moves? (as|like) (a|an)/,
      /gains? (the )?(powers?|movement|abilities) of/,
      /transform/,
      /(both|two|three|all|any two) [^.]{0,30}become (queens|rooks|bishops|knights|nightrooks|amazons|chancellors|archbishops)/,
      /become (nightrooks|amazons|chancellors|archbishops|dragons)/,
      /grows into/,
    ],
    when: (c) => !/(enemy|their|opponent's)/.test(text(c)),
  },
  {
    id: "piece-downgrade-transform",
    label: "Turns a piece into something weaker",
    blurb:
      "A piece is demoted, petrified into scenery or reduced in kind. Usually an enemy piece; on a nerf it is your own.",
    patterns: [
      /(their|enemy|opponent's|her|his|she|he) [^.]{0,40}(becomes?|turns? into|is now) (a|an)/,
      /demot/,
      /(turns? (in)?to|becomes?) (a )?(walnut|statue|stone|pebble|frog|duck|chicken|sheep|rock|shrub|dunce)/,
      /loses? its (\w+ )?(powers|moves|abilities)/,
      /reduced to (a )?pawn/,
      /(she|he|it) is (now )?a (pawn|knight|bishop|rook)/,
      /(copy|copies) of that piece/,
      /wither/,
      /(queen to rook|rook to bishop|bishop to knight|queen to bishop)/,
    ],
  },
  {
    id: "piece-mind-control",
    label: "Takes control of an enemy piece",
    blurb: "A piece changes sides, permanently or on loan.",
    patterns: [
      /(mind|thought) control/,
      /take control of/,
      /to your (colour|color|side)\b/,
      /(fights|serves|works) for you/,
      /(dominate|subjugate|enthral|enthrall|suborn)/,
      /(becomes?|is) yours (for|until)/,
      /reverts to your opponent/,
      /issuing the order/,
      /(order|orders|command|commands) (one|an|the) enemy/,
      /defect/,
      /reforged as your own/,
      /added to your army/,
    ],
  },
  {
    id: "piece-swap",
    label: "Swaps two pieces",
    blurb: "Two pieces trade squares, or a piece trades identity with another.",
    patterns: [
      /\bswap/,
      /(exchange|trade|switch)[sd]? (places|squares|positions)/,
      /change places/,
      /trade their (entire )?contents/,
      /(types|places) (are|is) shuffled among/,
    ],
  },

  // --- Immobilize -----------------------------------------------------------
  {
    id: "freeze-cleanse",
    label: "Frees your own frozen pieces",
    blurb:
      "Thaws, cleanses and jailbreaks: the counterplay to the freeze family, not a member of it.",
    // Sits above the freeze rungs on purpose. Every one of these was filed as
    // APPLYING a freeze because its text is full of freeze words, which meant a
    // buff to the freeze family would have buffed its own answer alongside it.
    patterns: [
      /(one|every one|all|any) of your (own )?[^.]{0,40}(frozen|stuck|petrified|freeze)/,
      /(thaw|thaws|cleanse|cleanses|unfreeze|unfreezes)\w* (one|every|all|any|your)/,
      /free all of your own/,
      /pieces? thaws? at once/,
    ],
    // A nerf is a handicap: it never hands its owner the cure.
    when: (c) => c.kind === "buff",
  },
  {
    id: "mass-freeze",
    label: "Freezes the whole enemy army",
    blurb: "Board-wide immobilization: every enemy piece, or every piece of a class.",
    patterns: [
      /(all|every|each|both|the whole|the entire) [^.]{0,110}(frozen|freezes|freeze|petrified|turned? to stone|stuck|locked in place|cannot move|can(no|')t move)/,
      /(freeze|petrif)\w* (all|every|each|the whole|the entire)/,
      /nothing (they own|of theirs) can move/,
      /(their|enemy) (army|whole army|entire army) (is|are) (frozen|stuck|immobil)/,
      /(all|every|each) [^.]{0,50}(pinned down|held fast|immobilis|immobiliz)/,
    ],
  },
  {
    id: "multi-piece-freeze",
    label: "Freezes several pieces",
    blurb: "Two or more named pieces are held in place, but not the whole army.",
    patterns: [
      /(two|three|four) [^.]{0,40}(are|is) (frozen|petrified|stuck|immobil)/,
      /(freeze|petrif)\w* (two|three|four)/,
      /every (enemy )?piece [^.]{0,30}(next to|adjacent|beside) [^.]{0,20}(is|are) frozen/,
    ],
  },
  {
    id: "single-piece-freeze",
    label: "Freezes one piece",
    blurb: "A single piece cannot move at all for a spell.",
    patterns: [
      /\bfreez(e|es|ing)?\b/,
      /\bfroze(n)?\b/,
      /petrif/,
      /\bstun(s|ned|ning)?\b/,
      /stuck fast/,
      /too dazed to move/,
      /refuses to (leave|move|budge)/,
      /(cannot|can(no|')t) move (at all|on|for|during|until)/,
      /(is|are) (immobil|rooted|pinned in place|held fast|paralys|paralyz)/,
      /may not move at all/,
      /pinned down/,
      /must rest (a|one|\d+) turn/,
      /before moving again/,
      /falls? asleep/,
      /in irons/,
      /(shackle|fetter|chained)/,
      /locked in place/,
      /to stone\b/,
      /a heavy walnut/,
    ],
  },

  // --- Movement grants ------------------------------------------------------
  {
    id: "extra-move",
    label: "Grants an extra move inside your turn",
    blurb: "A bonus move on top of your normal one: the card hands you board actions, not just a cheap activation.",
    // "Free action" is deliberately NOT a pattern here. In this engine a free
    // action is the ACTIVATION MODE (Buff.freeAction, turnCost() === "free"): the
    // card resolves inside your turn instead of spending it. That is orthogonal
    // to what the card does, and matching it filed 58 of this bucket's 92 cards
    // by their activation cost alone - nerf suspensions, scouting flashes, pawn
    // shields and coin flips that grant no move whatsoever.
    patterns: [
      /(extra|additional|bonus) moves?\b/,
      /take a second move/,
      /without (using|spending|costing) your turn/,
      /does not (use|cost|spend) your turn/,
      /marches a free/,
      /advances a free/,
      // The mover has to be YOU. A bare /move again/ also caught "the next piece
      // they move is left so groggy it must move again" (jet_lag, an enemy
      // restriction) and "cannot move again" on the quicksand nerf; a bare
      // "second move" caught "starting on your second move" (vampiric,
      // solar_flare), which is a timing phrase, not a bonus action.
      /(lets|let) you (immediately )?move again/,
      /you (immediately |then )?move again/,
      /you take (an|one|two|three) (extra|bonus|more) move/,
    ],
    // A nerf is a handicap: it never hands its owner a bonus action.
    when: (c) => c.kind === "buff",
  },
  {
    id: "teleport-relocate",
    label: "Teleports a piece",
    blurb: "A piece is picked up and put down somewhere else, ignoring movement rules.",
    patterns: [
      /teleport/,
      /to any empty square/,
      /to any square/,
      /\bhoist/,
      /relocat/,
      /(place|put|move) (it|the piece|one piece|that piece) (anywhere|on any)/,
      /\bblink\b|warps? to/,
      /an empty square on its own file/,
      /rides the current/,
      /blinks? away/,
      /is moved to the empty square/,
    ],
  },
  {
    id: "piece-nudge-reposition",
    label: "Shoves a piece without a move",
    blurb:
      "A piece is dragged, bounced or advanced a square by the card itself, not by its owner playing a move.",
    patterns: [
      // The shove verb has to act on something on the BOARD. Bare /push|pull/
      // also caught the gambling and draft cards, whose push is a betting idiom:
      // "Push your chips in, half and half" (gm_double_down_draft), "Push it all
      // onto the next hand" (bw3_double_down), "Push everything to the center"
      // (all_in), plus "Pull of the Center" (pull_of_the_center), whose only
      // shove is in its NAME.
      /(drag|drags|dragged|shove|shoves|push|pushes|pull|pulls|nudge|nudges|bounce|bounced|yank|yanks|haul|hauls)\w* (it|them|one|two|three|every|each|all|the|that|any|up to|your|their|its|back|off) /,
      /(advance|advances|sidesteps?|marches|slides?|steps?|retreats?) one square (at random|immediately|back|inward|toward)/,
      /each advance one square immediately/,
      /(is|are) (sent|carried|returned|bounced) back to/,
      /slips one square back/,
      /(one|two|three) pawns? each advance/,
      /back to an empty home/,
      /\b(rake|rakes|raked)\b/,
      /(is|are|gets|get) (raked|shoved|bonked|driven|booted|dragged)/,
      /(pushed|swept|lured|carried|forced|herded) (one|two|three) squares?/,
      /(falls? back|advances?|retreats?|steps? back) one square/,
    ],
    // The betting cards say push too: "Push your chips in", "Push it all
    // onto the next hand", "Push your queen across the felt". None of them
    // shoves a piece a square.
    when: (c) => !/(\bchips?\b|\bfelt\b|the next hand|\ball in\b|everything to the)/.test(text(c)),
  },
  {
    id: "movement-phase-jump",
    label: "Lets a piece jump or pass through pieces",
    blurb: "Movement that ignores blockers: leaping, phasing, sliding through.",
    patterns: [
      /(jump|leap)\w* (over|exactly|through)/,
      /(slide|move|pass|step|slip)\w* (straight |right )?through/,
      /passing through/,
      /pass(es)? over/,
      /ignores? (blockers|pieces in the way|obstruction)/,
      /(may|can) jump\b/,
      /\bleap\b/,
    ],
    when: (c) => c.kind === "buff",
  },
  {
    id: "special-rule-grant",
    label: "Restores or widens a special chess rule",
    blurb: "Castling rights, en passant or the pawn double-step handed back or extended.",
    patterns: [
      /(castling|castle)\w* (right|is restored|again|even if|on both sides)/,
      /right to castle/,
      /and castle toward/,
      /castle[^.]{0,60}even if your (king|rook)/,
      /(may|can) (still )?castle/,
      /en passant/,
      /double-?step/,
    ],
    when: (c) => !/(cannot|can(no|')t|may not|no longer|never) (castle|double)/.test(text(c)),
  },
  {
    id: "special-rule-denial",
    label: "Takes a special chess rule away",
    blurb: "Castling rights, en passant or the pawn double-step withdrawn.",
    patterns: [
      /(cannot|can(no|')t|may not|must not|no longer|never) (castle|double-?step)/,
      /(castling|castle|en passant|double-?step)[^.]{0,50}(cannot|can(no|')t|may not|denied|forbidden|lost|blocked|barred|is gone)/,
      /loses? (its|their|the) two-square first move/,
      /(castling|en passant) rights? (are|is) (lost|gone|revoked)/,
    ],
  },
  {
    id: "movement-upgrade",
    label: "Widens how your pieces move",
    blurb: "New directions, longer strides or a borrowed movement pattern for the holder.",
    patterns: [
      /(may|can|could) (also |now |still |each |once |each once )?(move|slide|step|spring|sidestep|advance|retreat|shuffle|travel|walk|glide|dash|slip|hop|creep|drift|vault)/,
      /moves? (also )?(as|like)\b/,
      /gains? \w+ movement/,
      /moves? (one|two|three) squares?/,
      /\d-\d leap/,
      /(may|can) (move|go) (backward|sideways|diagonally)/,
      /\balso (slides?|moves?|steps?|jumps?|leaps?|strides?|glides?|springs?|marches)/,
      /next move may be/,
      /(diagonal|straight) glide/,
      /adding [^.]{0,40}(steps|moves)/,
      /(may|can) (lunge|stride|march|glide)/,
    ],
    // A nerf never GRANTS movement, so a nerf that happens to say "may still
    // move within it" (thunderdome) must fall through to the denial buckets.
    when: (c) =>
      c.kind === "buff" &&
      !/(can|may|could) (move|slide|step|travel|go|advance) only\b/.test(text(c)) &&
      !/only (one|a single) square/.test(text(c)) &&
      (c.hooks.includes("augmentMoves") || !/(enemy|their|opponent's|opponent)/.test(text(c))),
  },

  // --- Capture rules --------------------------------------------------------
  {
    id: "capture-permission",
    label: "Grants an unusual way to capture",
    blurb: "New capture geometry, capture at range, or capturing what is normally safe.",
    patterns: [
      /(may|can) capture/,
      /captures? (at range|from a distance|without moving|sideways|backward)/,
      /(may|can) take (its own|your own)/,
      /gains? both (forward-)?diagonal captures/,
      /gains? the ability to capture/,
      /reopening a side/,
      /capturing the first enemy piece in its path/,
      /(may|can) also capture/,
    ],
    // Only a GRANT: a card whose capture clause is a prohibition belongs in the
    // denial buckets below, even though it also contains "capture".
    when: (c) =>
      c.kind === "buff" && !/(cannot|can(no|')t|may not|must not|only) captur/.test(text(c)),
  },
  {
    id: "capture-punishment",
    label: "Taxes captures",
    blurb: "Capturing is still legal but comes with a cost, a debt or a delayed penalty.",
    patterns: [
      /(the )?(next|first) (\d+ )?times? [^.]{0,40}captur[^.]{0,60}(lose|pay|debt|suspend|frozen|removed|seconds)/,
      /whenever [^.]{0,30}captur[^.]{0,60}(lose|pay|debt|frozen|removed|seconds)/,
      /debt comes due/,
      /blood price/,
      /(after|each time) (you|they) captur[^.]{0,50}(lose|pay|frozen|removed)/,
    ],
  },
  {
    id: "capture-denial",
    label: "Forbids capturing",
    blurb: "A piece, class or side simply may not capture for a while.",
    patterns: [
      /(cannot|can(no|')t|may not|must not|refuses to|will not) captur/,
      /no captures/,
      /capture[sd]? (are|is) (forbidden|banned|impossible|not allowed)/,
      /never capture/,
      /too \w+ to capture/,
    ],
  },
  {
    id: "capture-condition",
    label: "Puts a condition on capturing",
    blurb: "Capturing is allowed only when some extra requirement is met.",
    patterns: [
      /can only capture/,
      /(may|can) capture only/,
      /only capture if/,
      /captur\w+ only (if|when|while)/,
      /must (be attacked|have moved)[^.]{0,30}captur/,
      /capture at most/,
      /unable to capture/,
      /only your \w+ (may|can) capture/,
      /only (your )?king (may|can) capture/,
    ],
  },

  // --- Protection -----------------------------------------------------------
  {
    id: "king-protection",
    label: "Shields the king specifically",
    blurb: "The king alone gets safety: escapes, check relief or capture immunity.",
    patterns: [
      /your king (cannot|can(no|')t|may not) be (captured|taken)/,
      /king (is|becomes) (safe|immune|invulnerable|untouchable)/,
      /king escapes?/,
      /while your king is in check/,
      /(bolt|postern|escape) (hole|gate|hatch)/,
    ],
  },
  {
    id: "mass-shield",
    label: "Shields many pieces at once",
    blurb: "A whole class or the whole army becomes hard or impossible to capture.",
    patterns: [
      /(none|no|all|every|each) of (your|their)[^.]{0,60}(cannot|can(no|')t|may not) be captured/,
      /(all|every|each|none of|no) (your |of your )?\w+ (cannot|can(no|')t|may not) be captured/,
      /(all|every|each) (your |of your )?[^.]{0,25}(are|is) (immune|shielded|protected|uncapturable)/,
      /your (whole |entire )?army (is|becomes) (immune|shielded|protected)/,
      /army shield/,
      /(shield|ward|protect)\w* (all|every|each) /,
      /(none|no) of your (pawns|pieces|knights|bishops|rooks)[^.]{0,60}be captured/,
      /nothing of yours [^.]{0,60}be captured/,
    ],
  },
  {
    id: "single-piece-shield",
    label: "Makes one piece hard to capture",
    blurb: "One piece is uncapturable, shielded or warded for a spell.",
    patterns: [
      /uncapturable/,
      /(cannot|can(no|')t|may not) be captured/,
      /\bimmune\b/,
      /\bshield/,
      /\bward\b|\bwarded\b/,
      /(is|becomes) (invulnerable|untouchable|protected|armoured|armored)/,
      /\bsafe from capture/,
    ],
  },
  // --- Distance -------------------------------------------------------------
  {
    id: "move-budget-change",
    label: "Caps or extends how far a move may go",
    blurb: "Distance, not direction: a limit or bonus on squares travelled per move.",
    patterns: [
      /(more|further|farther) than \d+ squares?/,
      /at most \d+ squares?/,
      /no more than \d+ squares?/,
      /travel more than/,
      /(limited|capped) to \d+ squares?/,
      /(one|two|three) (extra )?squares? (further|farther|more)/,
      /distance (is |of )?(≤|<=|at most|no more)/,
      /reach grows/,
      /at most (one|two|three|four) squares?/,
      /(must be|are) distance (exactly )?\d+/,
      /squares? of reach/,
    ],
  },
  // --- Terrain and zones ----------------------------------------------------
  {
    id: "terrain-hazard",
    label: "Puts a hazard on the board",
    blurb: "Squares that do something to whichever piece steps on them.",
    patterns: [
      /(the )?first [^.]{0,40}(piece )?to (step|end a move|land|enter|set foot)/,
      /first [^.]{0,40}piece (that|which) (ends|steps|lands|enters|touches)/,
      /any (enemy )?piece that (clicks|steps|lands|ends|enters|touches)/,
      /steps? on (it|them|the|each)/,
      /\b(banana|peel|gum|trap|mine|pit|tar|glue|caltrop|spike)\w*/,
      /\b(flood|lava|water rises|underwater|quicksand|swamp|ice|bog|mud)\w*/,
      /whichever piece (lands|steps|ends)/,
      /that lands (directly )?on/,
      /become voids/,
      /erupts?\b/,
    ],
  },
  {
    id: "zone-lock-in",
    label: "Traps pieces inside a region",
    blurb: "Once inside a zone a piece cannot leave it.",
    patterns: [
      /(can|could) never leave/,
      /(cannot|can(no|')t|may not) leave (the|that|this) (zone|region|area|square|half|box)/,
      /trapped (in|inside|within)/,
      /(is|are) confined to/,
      /(cannot|can(no|')t) (get|come) out/,
    ],
  },
  {
    id: "zone-denial",
    label: "Closes off squares, ranks or files",
    blurb: "Part of the board is off limits: pieces may not enter or pass through it.",
    patterns: [
      /(may not|cannot|can(no|')t|must not) (land|end a move|enter|move|travel|pass|be|step|go)[^.]{0,60}(square|rank|file|half|zone|centre|center|edge|corner|side|board)/,
      /(square|rank|file|half|zone|centre|center|region|band)\w*[^.]{0,80}(may not|cannot|can(no|')t|must not|no move|is closed|are closed|off limits|forbidden)/,
      /(squares?|ranks?|files?|zone|half|centre|center|border|gate|moat|band)s? (is|are) (sealed|walled off|closed|blocked off|barred)/,
      /no piece may (enter|cross)/,
      /(cannot|can(no|')t|may not|must not) (end a move|land|stop|settle|be) (there|on it|on them|on that)/,
      /impassable/,
      /no (piece|pawn|knight|bishop|rook|queen|king) may be on/,
      /home row/,
      /cross only via/,
    ],
  },
  {
    id: "zone-buff",
    label: "Makes squares grant something",
    blurb: "Standing in a region gives a bonus rather than taking something away.",
    patterns: [
      /while (it |they |your \w+ )?(is |are )?(on|in|inside) (the|that|this|your) [^.]{0,30}(gains?|may|can|is safe)/,
      /(pieces|piece)\w* (on|in) (the|that) [^.]{0,30}(gain|are stronger|move further)/,
      /\b(sanctuary|sanctum|haven|holy ground|blessed square|safe square)\b/,
      /(zone|region|squares?) (grants?|gives?|blesses)/,
    ],
  },
  {
    id: "board-geometry-warp",
    label: "Changes the shape of the board",
    blurb: "Wrapping edges, portals, rotations: the geometry itself stops being 8x8.",
    patterns: [
      /wraps? (around|to the other side)/,
      /\bportal/,
      /board (shrinks|grows|rotates|tilts|folds|flips)/,
      /off (the|one) edge [^.]{0,20}(reappear|return|emerge)/,
      /(files?|ranks?) (a and h|1 and 8) (are|become) adjacent/,
      /continental drift/,
    ],
  },

  // --- Movement denial ------------------------------------------------------
  {
    id: "piece-class-lockdown",
    label: "Shuts down a whole piece class",
    blurb: "Every knight, every bishop, every pawn: one type of piece stops working.",
    patterns: [
      /(their|enemy|opponent's|your) (knights|bishops|rooks|queens|pawns|kings)[^.]{0,60}(cannot|can(no|')t|may not|must not|never|no longer)/,
      /(all|every|each) (their |enemy |your )?(knights|bishops|rooks|pawns)[^.]{0,50}(cannot|can(no|')t|may not|are frozen|stop)/,
      /(knights|bishops|rooks|queens|pawns) (are|is) (barred|banned|grounded|benched|disabled)/,
    ],
  },
  {
    id: "direction-geometry-lock",
    label: "Locks movement to a direction or colour",
    blurb: "Moves must, or must not, run a particular way: forward only, dark squares only, no repeats.",
    patterns: [
      /(only|may only|must) (land|move|travel|go|end)[^.]{0,40}(dark|light|forward|backward|sideways|toward|away|same (direction|file|rank)|opposite colour|opposite color)/,
      /must land on/,
      /(same|previous) direction as/,
      /(cannot|can(no|')t|may not) (move|travel|go)[^.]{0,30}(backward|sideways|forward|diagonally|toward|away)/,
      /(dark|light) squares? only/,
      /only (on|onto) (dark|light)/,
      /twice in a row/,
      /must (cover|match|mirror) (exactly )?the same/,
      /must (run|slide|travel|go) (as far|the full)/,
      /(none|no) of your [^.]{0,40}(may|can) (move|travel|go) (backward|forward|sideways|diagonally)/,
    ],
  },
  {
    id: "forced-move",
    label: "Forces a specific move",
    blurb: "The holder has no choice: this piece, that square, or this order.",
    patterns: [
      /you must move/,
      /must move (each|every|the|a|one|that|it|onto|to|into|toward|away)/,
      /(is|are) forced to/,
      /must (capture|castle|advance|promote|retreat|reach|play|land|end)/,
      /you must (reach|use|take|make|be)/,
      /has to move/,
      /before moving the same/,
      /must be (a|an|in front of|on|within|at least)/,
      /\bmust\b[^.]{0,30}\bmove\b/,
      /must alternate/,
      /, you must\b/,
      /, it must\b/,
      /must stay/,
      /must go to/,
    ],
  },
  {
    id: "enemy-movement-restriction",
    label: "Narrows how the opponent may move",
    blurb: "The opponent keeps their turn but loses options: a catch-all denial bucket.",
    patterns: [
      /(their|enemy|opposing|opponent's|they)[^.]{0,70}(cannot|can(no|')t|may not|must not|no longer|never|only|refuses)/,
      /your opponent (cannot|can(no|')t|may not|must)/,
      /(none|no) of (their|them|the enemy)/,
      /(no|not a single) enemy \w+ (may|can)/,
      /no piece [^.]{0,60}(may|can|is allowed)/,
      /(they|your opponent) (may|can) only/,
    ],
    when: (c) => c.kind === "buff" && !restrictsDraftOnly(c),
  },
  {
    id: "self-movement-restriction",
    label: "Narrows how you may move",
    blurb: "The holder loses options: the shape most nerfs take.",
    patterns: [
      /(cannot|can(no|')t|may not|must not|can only|may only|no longer|never)/,
      /\bonly (move|within|on|in|to|from)/,
      /(is|are) (barred|banned|forbidden|not allowed)/,
      /(none|no) of your [^.]{0,40}(may|can) (move|travel|go|be|capture)/,
    ],
    when: (c) => !restrictsDraftOnly(c),
  },

  // --- Nerf and card denial -------------------------------------------------
  // Above the clock and draft-advantage buckets on purpose: suspending your own
  // nerf and shutting down the opponent's card economy are headline effects,
  // while seconds and rerolls are usually the rider bolted onto them.
  {
    id: "nerf-relief",
    label: "Suspends or removes your own nerf",
    blurb: "The boon pool's core promise: the holder's hidden handicap goes away for a while.",
    patterns: [
      /nerfs?[^.]{0,40}(suspend|suspends|suspending|suspended|lifted|paused|disabled)/,
      /(suspend|suspends)[^.]{0,20}nerf/,
      /your nerf (ends|stops|is gone|is off|no longer applies|stays)/,
      /(remove|lift|shed|cancel|cut|halve)\w* your nerf/,
      /(you have|there is) no nerf/,
      /nerf (to|at) half/,
    ],
  },
  {
    id: "draft-denial",
    label: "Takes drafts away from the opponent",
    blurb: "The opponent's card economy is skipped, blocked or emptied.",
    patterns: [
      /(their|your opponent's) (next )?drafts? (is|are) (skipped|denied|lost|cancelled|canceled)/,
      /(skip|deny|block|cancel)\w* (their|your opponent's) draft/,
      /(they|your opponent) (cannot|can(no|')t|may not) draft/,
      /(they|your opponent) (draws?|gets?|receives?) no card/,
      /(their|your opponent's) hand is (emptied|discarded|sealed)/,
      /(disable|disables|cancel|cancels|nullif|sever)\w* (one |an |the |two |three )?(enemy|their|your opponent's) (buff|card)/,
      /(they|your opponent) loses? (one|a|their|\d+) (draft )?rerolls?/,
      /(cancel|cancels|nullif|block|blocks)\w* [^.]{0,40}(your opponent|their|enemy)/,
      /(draft|drafts) (is|are) (blocked|skipped|denied)/,
      /(block|blocks|skip|skips) (their|your opponent's) next/,
      /drafted card arrives nullified/,
      /(their|your opponent's) next offer excludes/,
    ],
  },
  // --- Tempo and clock ------------------------------------------------------
  {
    id: "clock-drain-enemy",
    label: "Drains the opponent's clock",
    blurb: "Takes time off the other side.",
    patterns: [
      /(they|your opponent) lose(s)? \d+ seconds?/,
      /(their|your opponent's) clock/,
      /(drain|burn|steal)\w* [^.]{0,20}seconds? from/,
      /lose(s)? \d+ seconds?/,
      /costs? (them|your opponent) \d+ seconds?/,
      /-\d+ seconds?/,
    ],
  },
  {
    id: "clock-gain-self",
    label: "Adds time to your clock",
    blurb: "Pure clock profit for the holder.",
    patterns: [
      /you gain \d+ seconds?/,
      /gain(s|ing)? (you )?\d+ seconds?/,
      /\+\d+ seconds?/,
      /add \d+ seconds? to your/,
      /earns? (you )?\d+ seconds?/,
      /\d+ seconds? (each|back|on your clock)/,
      /refunds? \d+ seconds?/,
      /seconds? (go|goes) (straight )?onto your/,
    ],
  },
  // Information sits above the draft bucket on purpose: a hidden nerf is the
  // single biggest secret in the game, so "see your opponent's nerf, and your
  // next draft rolls a tier higher" is an INFO card with a draft rider, not the
  // other way round. It sits below the clock bucket for the mirror reason: "add
  // 25 seconds, gain a reroll, and learn the tier of their next offer" is a
  // clock card whose info is the rider.
  // --- Information ----------------------------------------------------------
  {
    id: "info-reveal",
    label: "Reveals hidden information",
    blurb: "The holder gets to see something the rules normally keep secret.",
    patterns: [
      /reveal/,
      /(see|read|learn|glimpse|inspect)\w* (your opponent's|their|the enemy's|one of their|the tier)/,
      /(is|are) (shown|revealed) to you/,
      /you (see|learn|know)/,
      /\b(peek|glance|scout|survey|spy)\w*/,
      /lights? up/,
      /(flash|flashes|flag|flags)\b/,
      /a look at the tier/,
      /highlight/,
    ],
  },
  {
    id: "info-denial",
    label: "Hides information from the opponent",
    blurb: "Fog, blindness or secrecy imposed on the other side.",
    patterns: [
      /\bfog\b/,
      /(cannot|can(no|')t|may not) see/,
      /(is|are|becomes?) (hidden|invisible|unseen|concealed|blacked out)/,
      /\bblind/,
      /blackout/,
      /in the dark/,
    ],
  },
  {
    id: "target-marking",
    label: "Marks a piece or square",
    blurb: "A mark, curse or contract attaches to a target and matters later.",
    patterns: [
      /\bmark(ed|s|ing)?\b/,
      /\bcurse/,
      /\bcontract\b/,
      /\bomen\b/,
      /\bbrand(ed|s)?\b/,
      /\bhex(ed|es)?\b/,
      /\bdoom(ed)?\b/,
    ],
  },

  // --- Draft and card economy ----------------------------------------------
  {
    id: "card-tutor-gain",
    label: "Hands you an extra card",
    blurb: "A card arrives directly, without going through a normal draft offer.",
    patterns: [
      /joins your hand/,
      /(gain|draw|receive|add)\w* (a|an|one|two|three) (random )?(tier \d+ )?card/,
      /(a|one) (random )?tier \d+ card/,
      /(copy|copies) (of )?(a|the) card/,
      /(steal|steals|take|takes|plunder|plunders|siphon|siphons)\w* (up to )?(a|one|two|three|\d+)[^.]{0,30}(card|buff)/,
      /(their|your opponent's) (active )?buffs?/,
    ],
  },
  {
    id: "draft-advantage",
    label: "Improves your own drafts",
    blurb: "Rerolls, banking, higher tiers, wider offers: better cards for the holder.",
    patterns: [
      /draft/,
      /reroll/,
      /tier higher/,
      /\bbank\b|\bbanks\b|\bbanking\b/,
      /offer/,
    ],
  },

  // --- Structure ------------------------------------------------------------
  {
    id: "check-rule-change",
    label: "Changes the rules around check",
    blurb:
      "What counts as check, whether it can be ignored, and what giving it is worth.",
    patterns: [
      /(ignore|survive|absorb|shrug off)\w* check/,
      /check does not/,
      /(may|can) (stay|remain|move) (in|into) check/,
      /not (considered|counted as) check/,
      /check is (ignored|suspended|lifted)/,
      /\bcheck\b/,
      /\bchecks\b/,
      /giving check/,
    ],
  },
  {
    id: "randomness-gamble",
    label: "Rolls the dice",
    blurb: "The effect is decided at random: percentages, dice, coins, jackpots.",
    patterns: [
      /\brandom/,
      /\bdice\b|\bdie\b/,
      /\bcoin\b/,
      /\d+%/,
      /\bchance\b/,
      /jackpot/,
      /\broll\b|\brolls\b/,
      /half the time/,
      /(one|two|three) chances? in/,
      /times? in a hundred/,
      /(shove|shoves) all in/,
    ],
  },
  {
    id: "delayed-contract",
    label: "Sets a delayed or conditional payoff",
    blurb: "Nothing happens now: a trigger is armed and pays out later.",
    patterns: [
      /after (your|their) (next )?\d+ turns?/,
      /the (next|first) \d+ times?/,
      /the first time/,
      /\bwhenever\b/,
      /\buntil\b/,
      /(starting|begins) (after|on)/,
      /\d+ uses?\b/,
      /\bonce,/,
      /\bonce\b/,
    ],
  },
];

/** Convenience: the text the ladder matches against. */
function text(c: ClassifiableCard): string {
  return `${c.name}. ${c.description}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Overrides. The ladder reads prose, so a handful of cards land in a bucket
// that is technically a hit but is not what the card is FOR. Keys are
// "buff:<id>" / "nerf:<id>", never a bare id: nine ids are deliberately reused
// across a buff and a nerf (heavy_boots, no_mans_land, pawn_storm, slowpoke,
// anchored_rooks, king_of_the_hill, vertigo, cavalry_charge, scorched_earth),
// so a bare-id map would silently reclassify the wrong card. Same keying as
// src/data/balanceWave1.ts.
//
// Keep this small, and prefer fixing a pattern to listing another card: if one
// pattern needs several overrides, the pattern is wrong. Every entry below is a
// one-off, not a family.
// ---------------------------------------------------------------------------

export const EFFECT_CATEGORY_OVERRIDES: Record<string, EffectCategoryId> = {
  // Flavour NAMES that read as a mechanic the card does not have. The ladder
  // matches "name. description" (same as nerfCategories) because names carry
  // real signal for terse rules text ("Resurrect", "Eternal Freeze",
  // "Pinned Down"), and that is worth a dozen corrections here.
  "buff:withered_hands": "capture-denial", // "Withered" is not a downgrade; nobody may capture.
  "buff:bn4_muddy_boots": "piece-class-lockdown", // "Muddy" is flavour; their pawns cannot advance.
  "buff:hx4_muddy_moat": "zone-denial", // Ditto: the d and e files are shut, no hazard square.
  "buff:lag_spike": "clock-drain-enemy", // "Spike" is not a trap; it takes 30 seconds off them.
  "buff:bn4_promotion_paperwork": "single-piece-shield", // Triggers ON promotion, grants immunity.
  "buff:bn4_flag_on_their_wall": "nerf-relief", // "Flag" is not a reveal; it suspends your nerf.
  "buff:quick_glance": "draft-denial", // "Glance" is not a reveal; it burns their reroll.
  // The 2026-08 balance pass reworded these two from "once" to "twice" and the
  // rewrites slipped out of the movement matchers' verb windows.
  "buff:half_step": "movement-upgrade", // A pawn gains the diagonal non-capture step.
  "buff:vault": "movement-phase-jump", // The rook jumps its own pawn: leaping over a blocker.
  "buff:royal_summons": "forced-move", // A summons, not a summon: they must move their king.
  "buff:hx4_summons_to_court": "enemy-movement-restriction", // Same word, same trap.
  "buff:pawn_push": "movement-upgrade", // "Push" is not a shove; it grants a late double-step.

  // Cards whose own piece leaves the board as the EXPIRY of a grant. The grant
  // is the card; the removal is its price, and it reads as a kill without this.
  "buff:borrowed_time": "single-piece-shield",
  "buff:wc_berserk_pawn": "movement-upgrade",

  // "every piece can move only one square, and those steps cannot capture":
  // the distance cap is the card, the capture ban is how the cap bites.
  "buff:slowpoke": "move-budget-change",
};

/** The bucket a card lands in when nothing in the ladder matches. CI fails on it. */
export const UNCLASSIFIED: EffectCategoryId = "unclassified";

/** Classify one card. First matching rung of the ladder wins. */
export function classifyCardEffect(c: ClassifiableCard): EffectCategoryId {
  const override = EFFECT_CATEGORY_OVERRIDES[`${c.kind}:${c.id}`];
  if (override) return override;
  const t = text(c);
  for (const def of EFFECT_CATEGORY_DEFS) {
    if (def.when && !def.when(c)) continue;
    if (def.patterns.some((p) => p.test(t))) return def.id;
  }
  return UNCLASSIFIED;
}

// --- Projections -------------------------------------------------------------
// The hook names mirror scripts/audit-cards.ts buffSignature(), so both derived
// registries describe a card's structure the same way.

export function buffToClassifiable(b: Buff): ClassifiableCard {
  return {
    id: b.id,
    kind: "buff",
    name: b.name,
    description: b.description ?? "",
    category: b.category,
    mechanic: b.kind,
    tier: b.tier,
    hooks: [
      b.init && "init",
      b.effect && "effect",
      b.targets && "targets",
      b.augmentMoves && "augmentMoves",
      b.filterOpponentMoves && "filterOpponentMoves",
      b.onMovePlayed && "onMovePlayed",
    ].filter((h): h is string => typeof h === "string"),
  };
}

export function nerfToClassifiable(n: Nerf): ClassifiableCard {
  return {
    id: n.id,
    kind: "nerf",
    name: n.name,
    description: n.description ?? "",
    category: "nerf",
    mechanic: "passive-rule",
    tier: n.tier,
    hooks: [
      n.init && "init",
      n.onTurnStart && "onTurnStart",
      n.filterMoves && "filterMoves",
      n.checkLoss && "checkLoss",
    ].filter((h): h is string => typeof h === "string"),
  };
}
