"use client";

import { useEffect, useMemo, useState } from "react";
import type { MPDraftState, MPSession } from "@/lib/multiplayer";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { isBoon } from "@/engine/buff";

// The owner "god panel": a far-right column, mounted ONLY for a god-panel
// account (the real gate is server-side; this is UX). It lists the COMPLETE
// card catalog — buffs, hexes, boons, items, apex/mythic, and nerfs — grouped
// and searchable; clicking a summonable card grants it into the owner's own
// hand (rows the server would reject render disabled with the reason). The
// server re-verifies the account on every use and now announces each use to the
// table with a "God panel used" notice, so nothing here is trusted for anything
// but the browse-and-click convenience.
//
// Design law: 1px corners, no gradient / glow / shadow / emoji; coral/mint/sun
// accents; compact and scrollable; fixed on the far right so it never overlaps
// the board on normal screens (mounted at xl and up only).

// The panel lists the COMPLETE catalog — every buff, hex, boon, item, and
// apex/mythic card plus every nerf — grouped, so the owner can always find a
// card by browsing or searching (the old panel silently dropped instants,
// opponent-move-filtering passives, unimplemented cards, and all nerfs, which
// read as "cards missing from the god panel").
//
// Summoning is still narrower than listing: a card is grantable HIDDEN only
// when it can sit in a hand without revealing itself — instants fire the
// moment they are acquired, and an opponent-move-filtering passive must be
// felt by the opponent to keep the boards in sync. The server enforces
// exactly this (worker.ts adminGrant), so cards it would reject render
// disabled with the reason instead of being hidden. Nerfs are opening
// handicaps, not hand cards, so they are browse-only reference here.

type PanelCard = {
  id: string;
  name: string;
  tier: number;
  description: string;
  /** null = summonable; otherwise why the server would reject the grant. */
  blocked: string | null;
  searchText: string;
};

type PanelGroup = { label: string; cards: PanelCard[] };

// Why a buff cannot be summoned hidden (mirrors worker.ts adminGrant).
function blockedReason(b: (typeof ALL_BUFFS)[number]): string | null {
  if (!b.implemented) return "not implemented yet — cannot be summoned";
  if (b.kind === "instant") return "instant: fires the moment it is acquired, so it cannot sit hidden in a hand";
  if (b.kind === "passive" && b.filterOpponentMoves)
    return "filters the opponent's moves, so summoning it would reveal it";
  return null;
}

const GROUPS: PanelGroup[] = (() => {
  const toCard = (b: (typeof ALL_BUFFS)[number]): PanelCard => ({
    id: b.id,
    name: b.name,
    tier: b.tier as number,
    description: b.description,
    blocked: blockedReason(b),
    searchText: `${b.name} ${b.id} ${b.category}`.toLowerCase(),
  });
  const byTierThenName = (a: PanelCard, b: PanelCard) => b.tier - a.tier || a.name.localeCompare(b.name);
  // Each buff lands in exactly one group, checked in this order.
  const apex: PanelCard[] = [];
  const hexes: PanelCard[] = [];
  const boons: PanelCard[] = [];
  const items: PanelCard[] = [];
  const buffs: PanelCard[] = [];
  for (const b of ALL_BUFFS) {
    const card = toCard(b);
    if (b.tier >= 9 || b.special) apex.push(card);
    else if (b.category === "hex") hexes.push(card);
    else if (isBoon(b)) boons.push(card);
    else if (b.category === "item") items.push(card);
    else buffs.push(card);
  }
  const nerfs: PanelCard[] = ALL_NERFS.map((n) => ({
    id: n.id,
    name: n.name,
    tier: n.tier as number,
    description: n.description,
    blocked: "nerfs are opening handicaps, not hand cards — reference only",
    searchText: `${n.name} ${n.id} nerf`.toLowerCase(),
  }));
  const groups: PanelGroup[] = [
    { label: "apex & mythic", cards: apex },
    { label: "buffs", cards: buffs },
    { label: "hexes", cards: hexes },
    { label: "boons", cards: boons },
    { label: "items", cards: items },
    { label: "nerfs", cards: nerfs },
  ];
  for (const g of groups) g.cards.sort(byTierThenName);
  return groups;
})();

const TOTAL_CARDS = GROUPS.reduce((sum, g) => sum + g.cards.length, 0);

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

  // Groups filtered by the search box; a group with no matches drops out.
  // Order within a group: high tiers first (the owner mainly wants tier 4-8),
  // then by name (pre-sorted in GROUPS).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({ ...g, cards: g.cards.filter((c) => c.searchText.includes(q)) })).filter(
      (g) => g.cards.length > 0,
    );
  }, [query]);
  const shownCount = groups.reduce((sum, g) => sum + g.cards.length, 0);

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
        <span className="smallcaps ml-auto text-[9px] text-parchment-400" title={`${TOTAL_CARDS} cards total`}>
          {shownCount}
        </span>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-ink-950 px-1 py-1">
              <span className="smallcaps text-[9px] font-semibold text-sun-glow">{g.label}</span>
              <span className="smallcaps text-[9px] text-parchment-500">{g.cards.length}</span>
            </div>
            <div className="space-y-1">
              {g.cards.map((c) =>
                c.blocked === null ? (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => grant(c.id, c.name)}
                    title={c.description}
                    className="flex w-full items-center gap-2 rounded-[1px] border border-white/10 bg-white/[0.02] px-2 py-1 text-left transition-colors hover:border-mint/45 hover:bg-mint/10"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-parchment">{c.name}</span>
                    <span className="shrink-0 rounded-[1px] border border-sun/40 px-1 text-[9px] font-semibold tabular-nums text-sun-glow">
                      T{c.tier}
                    </span>
                  </button>
                ) : (
                  // Listed for completeness but not summonable: the server
                  // would reject the grant, so the row says why instead of
                  // pretending to be clickable (or worse, being absent).
                  <div
                    key={c.id}
                    title={`${c.description}\n\nNot summonable: ${c.blocked}`}
                    className="flex w-full cursor-not-allowed items-center gap-2 rounded-[1px] border border-white/5 bg-white/[0.01] px-2 py-1 text-left opacity-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-parchment-400">{c.name}</span>
                    <span className="shrink-0 rounded-[1px] border border-white/15 px-1 text-[9px] font-semibold tabular-nums text-parchment-500">
                      T{c.tier}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
        {shownCount === 0 && (
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
