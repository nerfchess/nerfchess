// Titles, descriptions and preview cards for the puzzle pages. The corpus is
// a static file the client fetches (public/puzzle-data/puzzles.json); the
// server reads the same file here so /puzzles/[id] can name its puzzle in the
// title (every puzzle page shared one title before, F237) and a link preview
// can show the actual position.

import type { Metadata } from "next";
import corpusFile from "../../public/puzzle-data/puzzles.json";
import { dailyPuzzle, puzzleNumber, utcDateKey } from "@/lib/puzzles/daily";
import type { Puzzle, PuzzleFile } from "@/lib/puzzles/types";
import { pageMeta } from "@/lib/seo";

const corpus = (corpusFile as unknown as PuzzleFile).puzzles ?? [];
const BY_ID = new Map(corpus.map((p) => [p.id, p]));

const side = (c: string) => (c === "w" ? "White" : "Black");

function baseTitle(p: Puzzle): string {
  if (p.format === "card-choice" && p.cards?.length === 2) return `Pick the card that wins: ${p.cards[0].name} or ${p.cards[1].name}`;
  if (p.format === "only-move") return `Find the one move ${p.rule.name} allows`;
  const n = p.movesToWin;
  return `${side(p.hero)} captures the king in ${n} under ${p.rule.name}`;
}

/** Collision-free titles for the whole corpus (a rule can anchor two puzzles). */
const TITLES = (() => {
  const count = new Map<string, number>();
  for (const p of corpus) count.set(baseTitle(p), (count.get(baseTitle(p)) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const p of corpus) {
    const t = baseTitle(p);
    if ((count.get(t) ?? 0) > 1) {
      const k = (seen.get(t) ?? 0) + 1;
      seen.set(t, k);
      out.set(p.id, `${t} (${k})`);
    } else out.set(p.id, t);
  }
  return out;
})();

export function puzzleById(id: string): Puzzle | null {
  return BY_ID.get(id) ?? null;
}

export function todaysPuzzle(): { puzzle: Puzzle; number: number; key: string } | null {
  const key = utcDateKey();
  const puzzle = dailyPuzzle(corpus, key);
  return puzzle ? { puzzle, number: puzzleNumber(key), key } : null;
}

export function puzzleTitle(p: Puzzle): string {
  return TITLES.get(p.id) ?? baseTitle(p);
}

export function puzzleGoal(p: Puzzle): string {
  if (p.format === "card-choice") return "Two cards are on offer and only one wins the game. Pick it.";
  if (p.format === "only-move") return `Your handicap is ${p.rule.name}. Find the one legal move it leaves you.`;
  return `${side(p.hero)} to play, with the handicap ${p.rule.name}. Capture the king in ${p.movesToWin}.`;
}

export function puzzleMeta(rawId: string): Metadata {
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {}
  const p = puzzleById(id);
  const path = `/puzzles/${encodeURIComponent(id)}`;
  if (!p) {
    return pageMeta({
      title: "Puzzle not found",
      description: "This Nerf Chess puzzle is no longer in the collection. Today's puzzle and the archive are on the puzzles page.",
      path,
      noindex: true,
      image: "segment",
    });
  }
  return pageMeta({
    title: puzzleTitle(p),
    description: `A Nerf Chess puzzle. ${puzzleGoal(p)}${
      p.format === "only-move" ? " Free, with no account." : " There is no checkmate here: the answer ends with the king captured."
    }`,
    path,
    image: "segment",
  });
}
