// The post kit: pure string assembly for the "paste it into the caption box"
// moment. A hook, a one-line game summary derived from the same scene data
// the reel drew, the site URL, and exactly 15 hashtags mixing the fixed brand
// tags with tags derived from the payoff. No network, no randomness, and no
// em dashes in any generated text (house rule).

import type { GameResult } from "@/engine/game";
import type { PieceType } from "@/engine/types";
import type { ClipAutoPlan, ClipSigMeta, ClipTimeline } from "./clipReplay";
import { PIECE_WORD } from "./clipScene";

export interface PostKit {
  /** The full post caption: hook, summary line, URL. */
  caption: string;
  /** Exactly 15 tags, each with its leading #. */
  hashtags: string[];
}

export interface PostKitInput {
  hookText: string;
  names: { w: string; b: string };
  result: GameResult | null | undefined;
  /** Whether the reel's window actually reaches the game's final ply. */
  coversEnd: boolean;
  timeline: ClipTimeline;
  autoPlan: ClipAutoPlan | null;
  /** The payoff card shown in the reel (scene.outroCard), if any. */
  card: ClipSigMeta | null;
  /** Total plies in the full game (not just the window). */
  totalPlies: number;
}

const HASHTAG_COUNT = 15;
const FIXED_TAGS = ["chess", "chessvariant", "nerfchess"];
// Evergreen fill pool: appended in order until the count lands on 15.
const FILL_TAGS = [
  "chesstok",
  "chessclips",
  "chessmoves",
  "chessreels",
  "cardgame",
  "boardgames",
  "strategygames",
  "tactics",
  "brilliantmove",
  "chesspunks",
  "gamingclips",
  "chesshighlights",
  "endgame",
  "chessonline",
];

/** Lowercase alphanumeric slug for a card name ("Royal Decree" -> royaldecree). */
export function hashtagSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

function fullMoves(plies: number): number {
  return Math.max(1, Math.ceil(plies / 2));
}

/** The one-line game summary. Reads the verdict when the reel covers the
 *  finish; otherwise sells the payoff (card or capture) as a cliffhanger. */
function summaryLine(inp: PostKitInput): string {
  const { result, names, card, autoPlan, coversEnd } = inp;
  const moves = fullMoves(inp.totalPlies);
  const cardBit = card ? ` Tier ${ROMAN[card.tier - 1] ?? card.tier} ${card.name} sealed it.` : "";
  if (result && coversEnd) {
    if (result.winner === "draw") {
      return `${names.w} and ${names.b} fought to a draw in ${moves} moves.`;
    }
    if (result.winner === "w" || result.winner === "b") {
      const winner = names[result.winner];
      const loser = names[result.winner === "w" ? "b" : "w"];
      const mate = result.reason === "no legal moves" || result.reason === "king captured";
      return mate
        ? `${winner} checkmated ${loser} in ${moves} moves.${cardBit}`
        : `${winner} beat ${loser} in ${moves} moves.${cardBit}`;
    }
  }
  if (card) {
    return `${card.name} went off on move ${moves} and the board never recovered.`;
  }
  if (autoPlan?.kind === "capture" && autoPlan.captured) {
    const piece = PIECE_WORD[autoPlan.captured].toLowerCase();
    return `A ${piece} vanished and the whole game turned on it.`;
  }
  return `${names.w} vs ${names.b}, ${moves} moves of chess where the cards fight back.`;
}

/** Build the post kit. Pure function of the scene data; call-site memoizes. */
export function buildPostKit(inp: PostKitInput): PostKit {
  const summary = summaryLine(inp);
  const caption = `${inp.hookText.trim()}\n\n${summary} Play it free at nerfchess.com`;

  // Derived tags, most specific first.
  const derived: string[] = [];
  if (inp.card) {
    const slug = hashtagSlug(inp.card.name);
    if (slug) derived.push(slug);
  }
  const mate =
    !!inp.result &&
    inp.coversEnd &&
    (inp.result.winner === "w" || inp.result.winner === "b") &&
    (inp.result.reason === "no legal moves" || inp.result.reason === "king captured");
  if (mate) derived.push("checkmate");
  if (inp.result?.winner === "draw" && inp.coversEnd) derived.push("draw");
  if (inp.autoPlan?.kind === "capture" && inp.autoPlan.captured) {
    derived.push(`${PIECE_WORD[inp.autoPlan.captured].toLowerCase()}takes`);
  }
  const capturedPiece: PieceType | null = inp.autoPlan?.captured ?? null;
  if (capturedPiece === "q") derived.push("queensacrifice");
  if (inp.card && inp.card.tier >= 8) derived.push("apexcard");

  const tags: string[] = [];
  const push = (t: string) => {
    if (t && !tags.includes(t) && tags.length < HASHTAG_COUNT) tags.push(t);
  };
  for (const t of FIXED_TAGS) push(t);
  for (const t of derived) push(t);
  for (const t of FILL_TAGS) push(t);

  return { caption, hashtags: tags.map((t) => `#${t}`) };
}
