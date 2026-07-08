"use client";

import { useEffect, useMemo, useState } from "react";
import type { MPDraftState, MPSession } from "@/lib/multiplayer";
import { ALL_BUFFS } from "@/engine/buffs/library";

// The owner "god panel": a far-right column, mounted ONLY for the ilovenewjeans
// account (the real gate is server-side; this is UX). It lists every card the
// server can summon into his own hand and grants one on click. The server
// re-verifies the account and stays silent to the opponent, so nothing here is
// trusted for anything but the browse-and-click convenience.
//
// Design law: 1px corners, no gradient / glow / shadow / emoji; coral/mint/sun
// accents; compact and scrollable; fixed on the far right so it never overlaps
// the board on normal screens (mounted at xl and up only).

// A card is grantable HIDDEN only when it can sit in a hand without revealing
// itself: instants fire the moment they are acquired, and an opponent-move
// filtering passive must be felt by the opponent to keep the boards in sync.
// The server enforces exactly this; the panel mirrors it so every listed card
// is one a click can actually summon.
const GRANTABLE = ALL_BUFFS.filter(
  (b) => b.implemented && b.kind !== "instant" && !(b.kind === "passive" && b.filterOpponentMoves),
);

// Card id -> display name, for rendering the opponent's now-revealed hand.
const BUFF_NAME = new Map(ALL_BUFFS.map((b) => [b.id, b.name] as const));

// One held card in a draft-state frame: either a real card (has `id`) or a
// masked entry (tier only). When "see opponent buffs" is on the server sends
// the opponent's real cards here to this socket only.
type HeldBuff = MPDraftState["players"]["w"]["buffs"][number];

type Props = {
  session: MPSession;
};

export function AdminGodPanel({ session }: Props) {
  const [query, setQuery] = useState("");
  // Start tucked away as a thin edge tab so the panel never overlaps the board
  // on load; the owner clicks the tab to open it.
  const [collapsed, setCollapsed] = useState(true);
  const [lastGranted, setLastGranted] = useState<string | null>(null);

  // Owner "see opponent buffs": a per-viewer reveal toggle. When on, the server
  // sends THIS socket a dtState carrying the opponent's real held cards (his
  // eyes only); we capture them off the draft-state stream and list them below.
  // Nothing here is authoritative: the server re-verifies the account and stays
  // silent to the opponent, so this is a browse-only mirror of already-synced
  // state.
  const [seeOpp, setSeeOpp] = useState(false);
  const [oppBuffs, setOppBuffs] = useState<HeldBuff[]>([]);

  useEffect(() => {
    const off = session.on((e) => {
      if (e.type !== "draft-state") return;
      const mine = session.color;
      if (!mine) return;
      const opp = mine === "w" ? "b" : "w";
      setOppBuffs(e.state.players[opp]?.buffs ?? []);
    });
    return off;
  }, [session]);

  function toggleSeeOpp() {
    const next = !seeOpp;
    session.seeOppBuffs(next);
    setSeeOpp(next);
    // Clear immediately when hiding; the re-masked dtState follows from the
    // server but the list should vanish on click.
    if (!next) setOppBuffs([]);
  }

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? GRANTABLE.filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q) ||
            b.category.toLowerCase().includes(q),
        )
      : GRANTABLE;
    // High tiers first (the owner mainly wants tier 4-8), then by name.
    return [...list].sort((a, b) => (b.tier as number) - (a.tier as number) || a.name.localeCompare(b.name));
  }, [query]);

  function grant(id: string, name: string) {
    if (session.adminGrant(id)) setLastGranted(name);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 rounded-l-[1px] border border-coral/40 bg-ink-950 px-1.5 py-3 text-[10px] font-semibold text-coral-glow [writing-mode:vertical-rl] xl:block"
        title="Open god panel"
      >
        god panel
      </button>
    );
  }

  // Only real cards (masked entries carry a tier but no id) are nameable; when
  // the reveal is off the opponent's cards arrive masked and this stays empty.
  const revealedOpp = oppBuffs.filter((b) => "id" in b) as Array<{ id: string; tier: number }>;

  return (
    <aside className="fixed right-0 top-0 z-30 hidden h-dvh w-[248px] flex-col border-l border-white/10 bg-ink-950 xl:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="smallcaps text-[11px] font-semibold text-coral-glow">god panel</span>
        <span className="smallcaps ml-auto text-[9px] text-parchment-400">{cards.length}</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded-[1px] border border-white/12 px-1 text-[11px] leading-none text-parchment-400 hover:border-coral/45 hover:text-coral-glow"
          title="Hide god panel"
          aria-label="Hide god panel"
        >
          ×
        </button>
      </div>

      {/* Owner tools: reveal the opponent's hidden hand (to you only) and the
          -15s clock cheat. Both are server-verified; the client gate is UX. */}
      <div className="space-y-1.5 border-b border-white/10 px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={toggleSeeOpp}
            aria-pressed={seeOpp}
            title="Reveal the opponent's hidden cards to you only"
            className={
              "flex-1 rounded-[1px] border px-2 py-1 text-[10px] font-semibold transition-colors " +
              (seeOpp
                ? "border-mint/60 bg-mint/15 text-mint-glow"
                : "border-white/12 text-parchment-400 hover:border-mint/45 hover:text-mint-glow")
            }
          >
            {seeOpp ? "hiding opp buffs" : "see opp buffs"}
          </button>
          <button
            type="button"
            onClick={() => session.adjustOppClock(true)}
            title="Take 15 seconds from your opponent's clock"
            className="flex-1 rounded-[1px] border border-coral/40 bg-coral/10 px-2 py-1 text-[10px] font-semibold text-coral-glow transition-colors hover:bg-coral/20"
          >
            -15s clock
          </button>
        </div>
        {seeOpp && (
          <div className="space-y-1 pt-0.5">
            {revealedOpp.length === 0 ? (
              <p className="text-[10px] text-parchment-500">opponent holds no revealed cards yet.</p>
            ) : (
              revealedOpp.map((b, i) => (
                <div
                  key={`${b.id}-${i}`}
                  className="flex items-center gap-2 rounded-[1px] border border-mint/25 bg-mint/[0.06] px-2 py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-[11px] text-parchment">
                    {BUFF_NAME.get(b.id) ?? b.id}
                  </span>
                  <span className="shrink-0 rounded-[1px] border border-sun/40 px-1 text-[9px] font-semibold tabular-nums text-sun-glow">
                    T{b.tier}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search cards"
          className="w-full rounded-[1px] border border-white/12 bg-white/[0.03] px-2 py-1 text-xs text-parchment placeholder:text-parchment-500 focus:border-mint/45 focus:outline-none"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {cards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => grant(b.id, b.name)}
            title={b.description}
            className="flex w-full items-center gap-2 rounded-[1px] border border-white/10 bg-white/[0.02] px-2 py-1 text-left transition-colors hover:border-mint/45 hover:bg-mint/10"
          >
            <span className="min-w-0 flex-1 truncate text-xs text-parchment">{b.name}</span>
            <span className="shrink-0 rounded-[1px] border border-sun/40 px-1 text-[9px] font-semibold tabular-nums text-sun-glow">
              T{b.tier}
            </span>
          </button>
        ))}
        {cards.length === 0 && (
          <p className="px-1 py-2 text-[11px] text-parchment-400">no cards match.</p>
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-2">
        {lastGranted ? (
          <p className="truncate text-[10px] text-mint-glow" role="status" aria-live="polite">
            summoned: {lastGranted}
          </p>
        ) : (
          <p className="text-[10px] text-parchment-500">click a card to summon it to your hand.</p>
        )}
      </div>
    </aside>
  );
}
