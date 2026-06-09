import Link from "next/link";

const RULES = [
  {
    n: "I",
    t: "No checkmate. No stalemate.",
    d: "The game ends only when a king is physically captured, a nerf triggers a loss, or a player resigns.",
  },
  {
    n: "II",
    t: "The king is a real piece.",
    d: "He can be captured like anything else. He can move into attacked squares. He can castle through, into, or out of check.",
  },
  {
    n: "III",
    t: "Nerfs are secret.",
    d: "You see yours. You do not see your opponent's. Infer it from their play.",
  },
  {
    n: "IV",
    t: "Illegal-by-nerf moves are pre-filtered.",
    d: "The board only highlights moves you are actually allowed to make. Lose-condition nerfs still trigger on their own.",
  },
  {
    n: "V",
    t: "Distances are Chebyshev.",
    d: "When a nerf talks about distance, count the larger of file-difference and rank-difference. Not Euclidean.",
  },
];

export default function TutorialPage() {
  return (
    <main className="min-h-screen pb-20">
      <nav className="flex items-center justify-between px-10 py-7">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <Link href="/play" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">Play</Link>
      </nav>
      <section className="max-w-3xl mx-auto px-6 pt-4">
        <div className="smallcaps text-[11px] text-parchment-400">how to play</div>
        <h1 className="font-display text-5xl sm:text-6xl mt-1">House rules</h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-parchment-200">
          Nerf Chess is chess, until it isn't. The five rules below are everything you need to know.
          Everything else is in your secret rule.
        </p>
        <div className="mt-9 space-y-3">
          {RULES.map((r) => (
            <div key={r.n} className="plate p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-display font-bold text-gold-leaf text-2xl tabular-nums w-8 shrink-0">{r.n}.</span>
                <div className="font-display text-2xl text-parchment leading-tight">{r.t}</div>
              </div>
              <p className="mt-2 ml-11 text-[15px] leading-relaxed text-parchment-200/90">{r.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/tutorial/walkthrough"
            className="px-6 py-3 rounded-full btn-leaf font-display"
          >
            Try the interactive lessons
          </Link>
          <Link
            href="/play"
            className="px-6 py-3 rounded-full btn-ghost font-display"
          >
            Skip and play
          </Link>
          <Link
            href="/codex"
            className="px-6 py-3 rounded-full btn-ghost font-display"
          >
            Browse all rules
          </Link>
        </div>
      </section>
    </main>
  );
}
