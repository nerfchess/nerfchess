"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { NerfCard } from "@/components/NerfCard";
import { BuffCard } from "@/components/BuffCard";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { isBoon } from "@/engine/buff";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_DEFS } from "@/lib/nerfCategories";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  filterAndSortNerfs,
  filtersFromQueryString,
  filtersToQueryString,
  hasActiveFilters,
  type CodexFilters,
} from "@/lib/nerfFilter";
import { cardText, hydrateCardText } from "@/lib/cardText";
import { BUFF_COLLECTIONS, NERF_COLLECTIONS, buffCollection } from "@/lib/cardCollections";
import { cardPath } from "@/lib/cardCodex";

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

// Draft-buff categories, presented like the rule categories. Nerf-relief
// boons are deliberately absent: they only exist in Nerf mode's draft pool
// and don't belong in the plain buff library.
const BUFF_CATEGORY_DEFS = [
  { id: "movement", label: "Movement" },
  { id: "pieces", label: "Pieces" },
  { id: "tempo", label: "Tempo" },
  { id: "protection", label: "Protection" },
  { id: "attack", label: "Attack" },
  { id: "info", label: "Info" },
  { id: "draft", label: "Draft manipulation" },
];

// The four rule families the library can browse. Nerfs live in their own
// library (ALL_NERFS); hexes, boons, and plain buffs are all drawn from
// ALL_BUFFS but split apart here so each reads as its own category.
type Library = "rules" | "buffs" | "hexes" | "boons";

// Hexes are the curse cards (category "hex"); boons are the self-relief pool
// (the nerf-breakers plus the light general cards flagged boon). A plain buff
// is anything that is neither, so the three buff-family lists never overlap.
const isHexCard = (b: (typeof ALL_BUFFS)[number]) => b.category === "hex";
const isBoonCard = (b: (typeof ALL_BUFFS)[number]) => isBoon(b) && !isHexCard(b);

const PLAIN_BUFFS = ALL_BUFFS.filter((b) => !isHexCard(b) && !isBoonCard(b));
const HEX_CARDS = ALL_BUFFS.filter(isHexCard);
const BOON_CARDS = ALL_BUFFS.filter(isBoonCard);

// The buff-family list backing each library tab.
const BUFF_LIST: Record<Exclude<Library, "rules">, typeof ALL_BUFFS> = {
  buffs: PLAIN_BUFFS,
  hexes: HEX_CARDS,
  boons: BOON_CARDS,
};

// Per-library copy so the four tabs read consistently.
const LIBRARY_NOUN: Record<Library, string> = {
  rules: "nerf",
  buffs: "buff",
  hexes: "hex",
  boons: "boon",
};
const LIBRARY_TITLE: Record<Library, string> = {
  rules: "Nerfs",
  buffs: "Buffs",
  hexes: "Hexes",
  boons: "Boons",
};
// The type each library preselects in the "Suggest a rule" form.
const LIBRARY_SUGGEST_TYPE: Record<Library, string> = {
  rules: "nerf",
  buffs: "buff",
  hexes: "hex",
  boons: "boon",
};

export default function CodexPage() {
  const [filters, setFilters] = useState<CodexFilters>(EMPTY_FILTERS);
  // Which library is shown: the secret rules (nerfs), or one of the three
  // buff families (plain buffs, hexes, boons).
  const [library, setLibrary] = useState<Library>("rules");
  const hydrated = useRef(false);
  const initialSearch = useRef<string | null>(null);
  // Moderator card overrides (name/description/flavor/tier), fetched once
  // from /api/cards. Until (or unless) they land, the code libraries render
  // as-is, so the codex never waits on the network.
  const [nerfSource, setNerfSource] = useState(ALL_NERFS);
  const [buffLists, setBuffLists] = useState(BUFF_LIST);

  useEffect(() => {
    let alive = true;
    hydrateCardText().then((any) => {
      if (!alive || !any) return;
      setNerfSource(ALL_NERFS.map((d) => cardText("nerf", d)));
      setBuffLists({
        buffs: PLAIN_BUFFS.map((b) => cardText("buff", b)),
        hexes: HEX_CARDS.map((b) => cardText("buff", b)),
        boons: BOON_CARDS.map((b) => cardText("buff", b)),
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Initialise from the URL on mount so links / refreshes restore filters.
  // The search string is cached because the mirror effect below may rewrite
  // the URL before a strict-mode re-run of this effect reads it again.
  useEffect(() => {
    if (initialSearch.current === null) initialSearch.current = window.location.search;
    setFilters(filtersFromQueryString(initialSearch.current));
    hydrated.current = true;
  }, []);

  // Mirror filters back into the URL (replace, so history isn't spammed).
  useEffect(() => {
    if (!hydrated.current) return;
    const qs = filtersToQueryString(filters);
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters]);

  const filtered = useMemo(() => filterAndSortNerfs(nerfSource, filters), [filters, nerfSource]);

  // The buff-family libraries reuse the same search, tier filter, and sort
  // ids so every library reads the same way: easy/brutal map to tier order.
  const buffSource = library === "rules" ? buffLists.buffs : buffLists[library];
  const buffFiltered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const list = buffSource.filter(
      (b) =>
        (filters.tier === null || b.tier === filters.tier) &&
        (filters.categories.length === 0 || filters.categories.includes(b.category)) &&
        (filters.collection === null || buffCollection(b) === filters.collection) &&
        (q === "" ||
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.category.includes(q)),
    );
    const byName = (x: (typeof list)[number], y: (typeof list)[number]) =>
      x.name.localeCompare(y.name);
    if (filters.sort === "az") list.sort(byName);
    else if (filters.sort === "za") list.sort((x, y) => byName(y, x));
    else if (filters.sort === "easy") list.sort((x, y) => x.tier - y.tier || byName(x, y));
    else list.sort((x, y) => y.tier - x.tier || byName(x, y));
    return list;
  }, [filters, buffSource]);

  const patch = (p: Partial<CodexFilters>) => setFilters((f) => ({ ...f, ...p }));
  const clearAll = () => setFilters({ ...EMPTY_FILTERS });
  const switchLibrary = (lib: Library) => {
    setLibrary(lib);
    // Category ids and collections differ between libraries; a stale one would
    // silently filter everything out.
    setFilters((f) => ({ ...f, categories: [], collection: null }));
  };

  const active = hasActiveFilters(filters);
  const isRules = library === "rules";
  // A category dropdown only makes sense where the cards carry varied
  // categories: nerfs and plain buffs. Hexes are all one category and boons
  // are a cross-cutting pool, so they browse by tier and search alone.
  const showCategoryFilter = library === "rules" || library === "buffs";
  const shownCount = isRules ? filtered.length : buffFiltered.length;
  const totalCount = isRules ? ALL_NERFS.length : buffSource.length;
  const noun = LIBRARY_NOUN[library];
  const nounPlural = `${noun}s`;
  const LIBRARY_TABS: Library[] = ["rules", "buffs", "hexes", "boons"];

  return (
    <main className="min-h-screen pb-20">
      <SiteHeader active="/codex" />

      <section className="max-w-6xl mx-auto px-6 pt-4">
        <div className="smallcaps text-[11px] text-parchment-400">the library</div>
        <h1 className="font-display text-5xl sm:text-6xl mt-1">
          {LIBRARY_TITLE[library]}
        </h1>
        <p className="mt-3 text-parchment-200">
          {isRules
            ? `${ALL_NERFS.length} nerfs: search by name, effect, or category.`
            : `${totalCount} ${nounPlural}: search by name, effect, or category.`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/guide/how-to-play"
            className="inline-flex items-center gap-2 rounded-sm btn-leaf px-4 py-2 font-display text-sm"
          >
            How to play
          </Link>
          {LIBRARY_TABS.map((lib) => (
            <button
              key={lib}
              onClick={() => switchLibrary(lib)}
              aria-pressed={library === lib}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[1px] font-display text-sm transition capitalize ${
                library === lib
                  ? "border border-gold/60 bg-gold/10 text-gold-leaf"
                  : "btn-ghost"
              }`}
            >
              {`${LIBRARY_NOUN[lib]}s`}
            </button>
          ))}
          <Link
            href={`/codex/suggest?type=${LIBRARY_SUGGEST_TYPE[library]}`}
            className="inline-flex items-center gap-2 px-4 py-2 btn-ghost font-display text-sm"
          >
            {`Suggest a ${noun}`}
          </Link>
        </div>

        {/* Sticky search bar. */}
        <div className="sticky top-0 z-20 -mx-6 mt-6 px-6 py-3 bg-ink-950/85 backdrop-blur-md border-b border-white/5">
          <label className="relative block">
            <span className="sr-only">{`Search the ${nounPlural}`}</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400" />
            <input
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={`Search the ${nounPlural}…`}
              className="w-full bg-ink-900/70 border border-white/15 rounded-full pl-9 pr-9 py-2.5 text-base sm:text-sm font-body focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/60 transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => patch({ search: "" })}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment-400 hover:text-parchment"
              >
                ×
              </button>
            )}
          </label>
        </div>

        {/* Compact filter bar: three labeled dropdowns instead of pill walls. */}
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          <FilterSelect
            label={isRules ? "Difficulty" : "Tier"}
            value={filters.tier === null ? "" : String(filters.tier)}
            onChange={(v) => patch({ tier: v === "" ? null : Number(v) })}
          >
            <option value="" className="bg-ink-900 text-parchment">
              {isRules ? "All difficulties" : "All tiers"}
            </option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
              <option key={t} value={t} className="bg-ink-900 text-parchment">
                {TIER_ROMAN[t]}. {TIER_LABEL[t]}
              </option>
            ))}
          </FilterSelect>

          {showCategoryFilter && (
            <FilterSelect
              label="Category"
              value={filters.categories[0] ?? ""}
              onChange={(v) => patch({ categories: v === "" ? [] : [v] })}
            >
              <option value="" className="bg-ink-900 text-parchment">All categories</option>
              {(isRules ? CATEGORY_DEFS : BUFF_CATEGORY_DEFS).map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-900 text-parchment">
                  {c.label}
                </option>
              ))}
            </FilterSelect>
          )}

          <FilterSelect
            label="Collection"
            value={filters.collection ?? ""}
            onChange={(v) => patch({ collection: v === "" ? null : v })}
          >
            <option value="" className="bg-ink-900 text-parchment">All collections</option>
            {(isRules ? NERF_COLLECTIONS : BUFF_COLLECTIONS).map((c) => (
              <option key={c.id} value={c.id} className="bg-ink-900 text-parchment">
                {c.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Sort"
            value={filters.sort}
            onChange={(v) => patch({ sort: v as CodexFilters["sort"] })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id} className="bg-ink-900 text-parchment">
                {o.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="smallcaps text-[10px] text-parchment-400" role="status" aria-live="polite">
            Showing {shownCount} of {totalCount} {nounPlural}
          </p>
          {active && (
            <button
              onClick={clearAll}
              className="smallcaps text-[10px] text-parchment-400 hover:text-parchment-100 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {shownCount > 0 ? (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isRules
              ? filtered.map((d) => (
                  <Link
                    key={d.id}
                    href={`/codex/nerf/${d.id}`}
                    className="block h-full rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    title={`Read the ${d.name} card page`}
                  >
                    <NerfCard nerf={d} dense ownerLabel={`${TIER_ROMAN[d.tier]} · ${TIER_LABEL[d.tier]}`} />
                  </Link>
                ))
              : buffFiltered.map((b) => (
                  <Link
                    key={b.id}
                    href={cardPath(b)}
                    className="block h-full rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    title={`Read the ${b.name} card page`}
                  >
                    <BuffCard
                      buff={b}
                      tier={b.tier}
                      status={b.implemented ? null : "Not yet appearing in drafts"}
                    />
                  </Link>
                ))}
          </div>
        ) : (
          <div className="mt-6 plate p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-white/15 text-parchment-400">
              <SearchIcon />
            </div>
            <p className="font-display text-lg text-parchment-100">
              {`No ${nounPlural} match your filters.`}
            </p>
            <p className="mt-1 text-sm text-parchment-400">
              Try a different word, or widen the tier and category filters.
            </p>
            <button
              onClick={clearAll}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full btn-ghost font-display text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="smallcaps text-[10px] text-parchment-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-full bg-ink-900/70 border border-white/15 rounded-full px-3 py-1.5 text-xs font-body text-parchment focus:outline-none focus:border-gold/60 cursor-pointer"
      >
        {children}
      </select>
    </label>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

