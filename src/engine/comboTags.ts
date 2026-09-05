// Exclusive combo-tag families for the draft's oppressive-combination guard.
//
// This is a LEAF module on purpose: plain data, no engine imports. The draft
// roll (engine/draft.ts) reads it to filter offers, and the card face
// (components/BuffCard.tsx) reads it to print the exclusivity line. Keeping it
// out of draft.ts means a card face never drags the full card library into
// its chunk just to name a family.
//
// Some effects are fine alone but oppressive when a player holds several at
// once: chained turn-skips leave the victim never taking a normal turn,
// stacked draft denial locks them out of the card game entirely, and layered
// board-wide freezes remove every response. Rather than nerfing each card,
// the draft refuses to OFFER a card while the caster already HOLDS an
// unspent, un-nullified card sharing one of its combo tags - a deterministic
// pool filter over synced state, so every replica rolls identically
// (desync-safe), and replays are unaffected (the filter only shapes new
// rolls).
//
// This is a visible rule, not a silent one: BuffCard renders the exclusivity
// line (via COMBO_TAG_LABELS) in the card details, so a player always knows
// why the family is one-at-a-time. Spending the held card re-opens the
// family on the NEXT roll - the guard caps simultaneous possession, it never
// bans a strategy outright.
// ---------------------------------------------------------------------------

/** card id -> exclusive families it belongs to. A card may carry several. */
export const COMBO_TAGS: Record<string, readonly string[]> = {
  // Turn theft: the opponent skips a turn. Two held at once = back-to-back
  // skips, the "opponent never gets a normal turn" loop.
  time_skip: ["turn-theft"],
  time_lock: ["turn-theft", "draft-denial"],
  time_freeze: ["turn-theft", "mass-freeze"],
  unshackled_wrath: ["turn-theft"],
  grand_malediction: ["turn-theft", "draft-denial"],
  lost_weekend: ["turn-theft"],
  throne_and_silence: ["turn-theft", "draft-denial"],
  wc_red_tape: ["turn-theft"],
  // Draft denial: skips/blocks the opponent's drafts. Stacked, it removes
  // the opponent from the card game for long stretches.
  patch_notes: ["draft-denial"],
  absolute_nullify: ["draft-denial"],
  dead_letter: ["draft-denial"],
  draft_seize: ["draft-denial"],
  draft_supremacy: ["draft-denial"],
  suppress: ["draft-denial"],
  riddle_game: ["draft-denial"],
  burned_dispatches: ["draft-denial"],
  empty_handed: ["draft-denial"],
  lost_fortnight: ["draft-denial"],
  sealed_archive: ["draft-denial"],
  sacked_capital: ["draft-denial"],
  time_out: ["draft-denial"],
  // Mass freeze: board-wide immobilization. One at a time is a tempo swing;
  // two make the whole army unplayable for several turns.
  mass_freeze: ["mass-freeze"],
};

/** Human-readable family names for the card-details exclusivity line. */
export const COMBO_TAG_LABELS: Record<string, string> = {
  "turn-theft": "Turn theft",
  "draft-denial": "Draft denial",
  "mass-freeze": "Mass freeze",
};
