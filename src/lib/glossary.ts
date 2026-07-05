// Plain-language definitions for chess and NerfChess jargon that shows up in
// rule and card descriptions. Keys are lowercase; matching is case-insensitive
// and whole-word only (see GlossaryText). Variant spellings (promote /
// promotion, castle / castling) get their own keys pointing at the same gloss
// so either form underlines. Keep every definition to one short sentence.

export const GLOSSARY: Record<string, string> = {
  // --- Chess jargon ---------------------------------------------------------
  "en passant":
    "A special pawn capture of an enemy pawn that just moved two squares, taken as if it had moved only one.",
  promote:
    "When a pawn reaches the far side of the board and turns into a stronger piece, usually a queen.",
  promotion:
    "When a pawn reaches the far side of the board and turns into a stronger piece, usually a queen.",
  castle:
    "A single move where the king and a rook shift together to tuck the king safely away.",
  castling:
    "A single move where the king and a rook shift together to tuck the king safely away.",
  file: "A vertical column of squares on the board, labeled a through h.",
  rank: "A horizontal row of squares on the board, numbered 1 through 8.",
  rim: "The outer edge of the board (the a- and h-files, or the 1st and 8th ranks).",
  check: "A direct threat to capture the king that must be answered at once.",
  capture: "Taking an enemy piece by moving onto its square.",
  "back rank":
    "The row nearest a player where the pieces start, a classic spot for checkmate.",
  "minor piece": "A bishop or a knight.",
  "major piece": "A rook or a queen.",
  "double-step":
    "A pawn's opening option to advance two squares at once from its starting row.",
  "home rank": "The back row where a player's pieces begin the game.",

  // --- NerfChess terms ------------------------------------------------------
  nerf: "A secret handicap rule that weakens one player for the whole game.",
  buff: "A helpful bonus a player can draft to gain an edge.",
  hex: "A curse-style card that hampers the opponent, drawn from the darker part of the pool.",
  boon: "A beneficial card a player holds and can spend during the game.",
  item: "A one-use card that grants a small effect when you spend it.",
  draft:
    "The pick-and-choose phase where players select their cards before playing.",
  bank: "Skipping a draft pick to save its value for a later choice (skip and bank).",
  tier: "A card's power or difficulty level, from I (mild) up to VIII (extreme).",
  walnut:
    "A hexed piece that is sealed and cannot move for a set number of turns, then frees itself.",
  freeze: "An effect that locks a piece in place so it cannot move for a time.",
  shield: "A protection that blocks one of your pieces from being captured.",
  barred: "Blocked from doing something, such as a square or move being off-limits.",
  suspend: "To temporarily pause a nerf's effect (suspend nerf).",
  "king-only": "A restriction where you may only move your king.",
  "no-pawn-advance": "A restriction that stops your pawns from moving forward.",
};

// Build a single case-insensitive regex that matches any glossary term as a
// whole word or phrase. Terms are sorted longest-first so multi-word phrases
// (for example "back rank") win over the shorter words they contain. Hyphens
// and word characters both count as boundaries, so "rank" never matches inside
// "prankster" and "king-only" is not split at the hyphen. Compiled once at
// module load.
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GLOSSARY_REGEX = new RegExp(
  `(?<![A-Za-z0-9-])(${TERMS.map(escapeRegExp).join("|")})(?![A-Za-z0-9-])`,
  "gi",
);

/** Look up a matched term (any casing) and return its definition, if any. */
export function lookupTerm(term: string): string | undefined {
  return GLOSSARY[term.toLowerCase()];
}
