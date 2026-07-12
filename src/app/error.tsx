"use client";

import Link from "next/link";

// Route-level error boundary: any client exception in a page renders this
// panel inside the normal layout instead of white-screening the site.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="plate w-full max-w-sm p-6 text-center">
        <div className="smallcaps text-[10px] text-parchment-400">Well, that broke</div>
        <h1 className="font-display text-2xl text-parchment mt-1">Something went wrong</h1>
        <p className="mt-2 text-sm text-parchment-300">
          The page hit an unexpected error. Your game state is saved locally.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-3 py-2 btn-ghost text-xs font-display tracking-wide"
          >
            Back to the game
          </Link>
          <button
            onClick={reset}
            className="px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 transition text-xs font-display font-semibold tracking-wide"
          >
            Reload
          </button>
        </div>
      </div>
    </main>
  );
}
