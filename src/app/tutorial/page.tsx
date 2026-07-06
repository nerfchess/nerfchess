import { SiteHeader } from "@/components/SiteHeader";
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
    d: "In Nerf mode you see yours but never your opponent's; infer it from their play. Buff mode has no nerfs at all.",
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

const CARD_TYPES = [
  {
    tag: "Nerf",
    who: "handicaps you",
    d: "Your secret rule in Nerf mode, chosen from two cards before the first move. It restricts how you are allowed to play, or invents a fresh way for you to lose. You always see your own nerf; your opponent never does. Example: \"You can't capture queens.\" The drawback is yours to carry all game.",
    example: null,
  },
  {
    tag: "Buff",
    who: "helps you",
    d: "A straight power-up, and the whole of Buff mode: both players draft one every 5 moves and build the stronger army. Some work quietly while you hold them, some fire the instant you pick them, and some wait until you spend them. Nobody is handicapped in Buff mode.",
    example: null,
  },
  {
    tag: "Hex",
    who: "handicaps your opponent",
    d: "The offensive card, and the most common thing your Nerf-mode draft offers. A nerf hurts you; a hex is a curse you cast on the other player. You pick it, they suffer it, and they only learn it landed when the effect shows up on their board. It is a temporary handicap you inflict, not one you take.",
    example: "Cold Feet: your opponent's pawns cannot capture for their next 3 turns. You spend your draft to tie their hands, then press the attack while they are stuck.",
  },
  {
    tag: "Boon",
    who: "softens your own nerf",
    d: "A rarer draft pick that turns your handicap down. Where a hex is aimed at your opponent, a boon is aimed at your own nerf: it suspends the rule, removes part of it, or waits for a condition and then lifts it. It is the only card that gives you relief from the drawback you started with.",
    example: "Reprieve suspends your nerf for your next 2 turns, so you can make the move it normally forbids. Others are conditional: Small Mercies waits until your opponent captures your pieces, then suspends your nerf on the turns that follow.",
  },
];

export default function TutorialPage() {
  return (
    <main className="min-h-screen pb-20">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 pt-4">
        <div className="smallcaps text-[11px] text-parchment-400">how to play</div>
        <h1 className="font-display text-5xl sm:text-6xl mt-1">House rules</h1>
        <p className="mt-5 text-[16px] leading-[1.7] text-parchment-200">
          Nerf Chess is chess, until it isn&apos;t. The five rules below are everything you need to know.
          Everything else depends on your mode: in Nerf mode, your secret handicap and the hexes,
          boons, and items you draft; in Buff mode, the buff cards both players draft every 5 moves.
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
        <div className="mt-14">
          <div className="smallcaps text-[11px] text-parchment-400">the four cards</div>
          <h2 className="font-display text-3xl sm:text-4xl mt-1">Nerf, buff, hex, boon</h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-parchment-200">
            Every card in the game is one of these four. The trick is who each one lands on: a nerf and
            a boon act on your side of the board, while a hex acts on your opponent&apos;s. Buffs belong
            to Buff mode; the other three shape a Nerf-mode game.
          </p>
          <div className="mt-6 space-y-3">
            {CARD_TYPES.map((c) => (
              <div key={c.tag} className="plate p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-2xl text-gold-leaf">{c.tag}</span>
                  <span className="smallcaps text-[11px] text-parchment-400">{c.who}</span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-parchment-200/90">{c.d}</p>
                {c.example && (
                  <p className="mt-3 text-[14px] leading-relaxed text-parchment-200/80 border-l border-gold-leaf/40 pl-3">
                    <span className="smallcaps text-[10px] text-parchment-400">for example</span>
                    <br />
                    {c.example}
                  </p>
                )}
              </div>
            ))}
          </div>
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
