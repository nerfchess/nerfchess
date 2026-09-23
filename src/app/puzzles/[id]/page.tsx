"use client";

// A single puzzle by id: the shareable, linkable form of everything the daily
// serves. The archive on /puzzles links here, and "Next puzzle" walks the
// corpus from wherever you are.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { PuzzleRunner } from "@/components/puzzles/PuzzleRunner";
import {
  PuzzleConnectionNotice,
  PuzzleSkeleton,
  PuzzleStates,
} from "../_components/PuzzleStates";
import { SiteHeader } from "@/components/SiteHeader";
import { NotFoundPanel } from "@/app/_components/NotFoundPanel";
import { NOT_FOUND_COPY } from "@/app/_components/notFoundCopy";
import type { Puzzle, PuzzleFormat } from "@/lib/puzzles/types";
import { usePuzzleCorpus } from "@/lib/puzzles/useCorpus";

const TITLE: Record<PuzzleFormat, (p: Puzzle) => string> = {
  "king-hunt": (p) =>
    p.movesToWin === 1 ? "Capture the king in one" : `Capture the king in ${p.movesToWin}`,
  "only-move": () => "Find the only move your rule allows",
  "card-choice": () => "Two cards. Which one wins?",
};

export default function PuzzleByIdPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const corpus = usePuzzleCorpus();

  const index = useMemo(
    () => corpus.puzzles.findIndex((p) => p.id === id),
    [corpus.puzzles, id],
  );
  const puzzle = index >= 0 ? corpus.puzzles[index] : null;
  const next =
    corpus.puzzles.length > 1
      ? corpus.puzzles[(Math.max(0, index) + 1) % corpus.puzzles.length]
      : null;

  // An id that is not in the corpus gets the site's shared not-found panel and
  // copy (F040), the same words the root 404 uses for /puzzles/<anything>.
  if (corpus.status === "ready" && !puzzle && id) {
    const copy = NOT_FOUND_COPY.puzzle;
    return (
      <NotFoundPanel title={copy.title} detail={copy.detail} action={copy.action} secondary={copy.secondary} />
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/lobby" />
      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <p className="text-[13px] text-parchment-400">
          <Link href="/puzzles" className="hover:text-gold-leaf">
            Daily puzzle
          </Link>
        </p>
        <h1 className="page-title mt-1">
          {puzzle ? TITLE[puzzle.format](puzzle) : "Puzzle"}
        </h1>
        {/* The tag line is always in the flow: it used to mount with the
            corpus and push the board down a line (F015). Before the puzzle is
            known it holds one invisible line of the same text, so the line box
            is the real font's, not a guessed height. */}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-parchment-300">
          {puzzle ? (
            <>
              {puzzle.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
              <span className="font-mono tabular-nums text-parchment-400">
                Difficulty {puzzle.difficulty}/5
              </span>
            </>
          ) : (
            <span className="invisible font-mono tabular-nums" aria-hidden>
              Difficulty 0/5
            </span>
          )}
        </p>

        <div className="mt-4">
          <PuzzleConnectionNotice corpus={corpus} />
          {corpus.status !== "ready" ? (
            <PuzzleStates corpus={corpus} />
          ) : puzzle ? (
            <PuzzleRunner
              key={puzzle.id}
              puzzle={puzzle}
              nextHref={next ? `/puzzles/${next.id}` : undefined}
            />
          ) : (
            <PuzzleSkeleton />
          )}
        </div>
      </section>
    </main>
  );
}
