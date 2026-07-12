# Codex card insights: stats and history on every card page

## Goal

Every card detail page (nerf, buff, hex, boon, item) grows from a static
rules-reference into a living encyclopedia entry, like
`/codex/nerf/bottled_lightning` but with:

- **"In play" section**: real gameplay statistics for that card. How often it
  is dealt or picked, how often its holder wins, activity in the last 30 days,
  and its popularity rank within its tier, split human vs house-bot games.
- **"History" section**: a timeline. When the card entered the game (its
  collection wave), curated balance notes, and, going forward, every runtime
  moderator change (tier move, disable, rename, rewrite) recorded and shown.
- **Dedicated hex and boon URL namespaces** (`/codex/hex/[id]`,
  `/codex/boon/[id]`), so each of the four card families the codex tabs by
  (nerf / buff / hex / boon) has its own page path.

Non-goals for this milestone: buff "use" attribution (resolving which held
card a `use` action spent requires engine replay; see Deliberate cuts), stats
backfill for pre-`draft_record` games (impossible, the data was never
persisted), and any change to how cards themselves work.

## What exists today (verified 2026-07-11)

**Pages.** Per-card pages already exist and are fully static:
`src/app/codex/nerf/[id]/page.tsx` and `src/app/codex/buff/[id]/page.tsx`
(hexes, boons, and items all live in `ALL_BUFFS` and render at the buff path).
Both use `dynamicParams = false` + `generateStaticParams`, share
`src/components/codex/CardDetail.tsx` (server component, no client JS), and
get metadata/related-cards helpers from `src/lib/cardCodex.ts`. The sitemap
(`src/app/sitemap.ts`) lists every implemented card at the buff/nerf paths.
Unimplemented cards render but carry `noindex`.

**Stats data.** The finished-game archive is the Postgres `games` table on OCI
reached via Hyperdrive (`migrations-pg/0001_games.sql`), with a D1 fallback in
dev (`src/lib/server/schema.ts`). Relevant columns:

- `white_nerf_id` / `black_nerf_id`, `winner` ('w' | 'b' | 'draw' | NULL),
  `completed_at`, `rated`, `ruleset`, `category` (the mode rating bucket).
- `draft_record JSONB` (`migrations-pg/0002`, doc:
  `docs/archive-draft-record.md`): full draft stream for draft games archived
  since it shipped. `draftActions` entries of `a = "pick"` carry the whole
  offer (`cards: [{id, tier}]`) plus the chosen `index`, and the acting
  `color`, so picked-vs-offered counts are derivable by SQL alone. `bank` /
  `reroll` entries carry no cards; `use` entries carry only a hand index.
- House bots are identifiable by user id prefix: `hp_` (`HOUSE_ROSTER` in
  `src/lib/server/bots.ts:276`). Arena bot games archive with the bot ids in
  `white_user_id`/`black_user_id` (worker.ts `/arena/end`, ~4397), so a
  `LIKE 'hp\_%'` predicate separates bot-held sides from human-held sides.
- Precedent: `/api/stats` (`src/app/api/stats/route.ts`) already runs a
  full-table `UNION ALL` nerf aggregate on every request, uncached. So a
  cached rollup is strictly cheaper than what we do today.

**History data.** There is none, per card:

- `card_overrides` (D1, `migrations/0019`) holds only the CURRENT override
  plus `updated_at`. `upsertCardOverride` (`src/lib/server/cardOverrides.ts`)
  blind-upserts; no audit trail.
- `docs/CHANGELOG.md` records every content wave with dates and PR numbers
  (hexes PR #140/#141/#166, boons PR #142, expanded nerfs PR #144, etc.) but
  is not machine-readable per card.
- Collection membership IS derivable in code: `buffCollection` /
  `nerfCollection` (`src/lib/cardCollections.ts`) map every card id to its
  shipped set (Core, Fantasy, Mystic, Wild, Funny, Hex, Item).

## Design

Three separable parts, shippable as three PRs in this order (each stands
alone): **A** routes + static history section, **B** stats pipeline + panel,
**C** moderator-change history.

```
games archive (PG, D1 fallback)
        |  full-scan rollup, at most every 6h
        v
insights blob  --stored in-->  D1 codex_insights_cache (1 row)
        |  slice per card
        v
GET /api/cards/insights?kind=&id=   <--fetch--  <CardInsights/> (client)
                                                     ^
static page (unchanged, crawlable) ------------------+
  + server-rendered "History" timeline (src/data/cardHistory.ts, crawlable)
  + "Moderator changes" events (card_override_history, via same endpoint)
```

The pages stay fully static (their whole SEO value); everything live arrives
through one small client component that renders nothing until data lands and
nothing at all on failure.

### Part A: hex and boon routes + static History section

**New routes.** `src/app/codex/hex/[id]/page.tsx` and
`src/app/codex/boon/[id]/page.tsx`, exact clones of the buff route except:

- `generateStaticParams` filters `ALL_BUFFS` by `buffType(b) === "Hex"` (resp.
  `"Boon"`).
- Metadata lead sentence is family-specific ("a Tier V hex in Nerf Chess: a
  curse you cast on your opponent...", "...a boon that softens your own
  nerf...").
- Canonical is the new path.

**Canonical move, no redirects.** The existing `/codex/buff/[id]` pages for
hex/boon ids KEEP rendering (never 404 an indexed URL) but their
`alternates.canonical` and `og:url` switch to the family path. Search engines
consolidate on the canonical; no middleware or redirect infra needed. Items
stay canonical at `/codex/buff/[id]`. If we later want hard 308s, that is a
follow-up middleware, not part of this milestone.

**Path helper.** Add `cardPath(b: Buff): string` to `src/lib/cardCodex.ts`
returning `/codex/hex/…`, `/codex/boon/…`, or `/codex/buff/…` by `buffType`,
and route `buffPath` callers through it: `relatedBuffs` links, the codex list
(`src/app/codex/page.tsx` and its card grid), `sitemap.ts` (list hexes/boons
at their family paths), and the breadcrumb JSON-LD section name in
`CardDetail.tsx` ("Hexes" / "Boons" instead of "Buffs").

**Static History section.** New `src/data/cardHistory.ts`:

```ts
export interface CardHistoryEvent {
  date: string;                 // "2026-07-05" (ET, matching the changelog)
  kind: "added" | "retier" | "rework" | "reword" | "disabled" | "enabled";
  note: string;                 // one human sentence
  pr?: number;
}
/** Per-card curated events, key "buff:<id>" | "nerf:<id>". Starts sparse. */
export const CARD_HISTORY: Record<string, CardHistoryEvent[]>;
/** One "added" event per shipping wave, keyed by what identifies the wave:
 *  collection for exotic sets, family for hex/boon/item, "core" fallback. */
export const WAVE_ADDED: Record<string, CardHistoryEvent>;
export function historyFor(kind: CardKind, card: Buff | Nerf): CardHistoryEvent[];
```

`historyFor` = wave "added" event (via `buffCollection`/`nerfCollection` +
category) prepended to any curated `CARD_HISTORY` entries, sorted by date.
Seed `WAVE_ADDED` from `docs/CHANGELOG.md` during implementation (the dates
and PR numbers are all there: launch set, hex wave 2026-07-05 PR #140/#141/
#166, boon wave PR #142, expanded nerfs PR #144, Fantasy/Mystic/Wild/Funny
waves, tier 9-10 apex/mythic wave). Every card therefore gets at least one
event, and the section is server-rendered in `CardDetail.tsx` as an
`InfoSection` timeline: unique crawlable prose on every page, which also
helps the thin-page problem across ~1000 card URLs.

### Part B: stats pipeline, API, panel

**Rollup, not per-request queries.** One computation scans the archive once
and produces a single JSON blob covering every card; per-card requests slice
it. Rationale: nerf aggregates are cheap but buff aggregates walk
`draft_record` JSONB, and doing that per card page view (or per card id) would
be a full scan each time. The blob is recomputed lazily, at most every 6
hours.

**Storage.** New D1 table (dedicated, not `app_settings`; the blob is a few
hundred KB), mirrored in `SCHEMA_STATEMENTS` (`src/lib/server/schema.ts`) and
`migrations/0023_codex_insights.sql`:

```sql
CREATE TABLE IF NOT EXISTS codex_insights_cache (
  key TEXT PRIMARY KEY,          -- 'v1' (bump on shape change)
  json TEXT NOT NULL,
  computed_at INTEGER NOT NULL
);
```

**Computation** (new `src/lib/server/cardInsights.ts`):

Nerf aggregates, one pass over per-side rows (PG path, via `pgAll`; `FILTER`
keeps it a single scan):

```sql
SELECT nerf,
       (uid LIKE 'hp\_%') AS bot,
       COUNT(*)::int AS dealt,
       COUNT(*) FILTER (WHERE winner IS NOT NULL)::int AS decided,
       COUNT(*) FILTER (WHERE won)::int AS wins,
       COUNT(*) FILTER (WHERE completed_at > $recent)::int AS dealt30d
FROM (
  SELECT white_nerf_id AS nerf, white_user_id AS uid,
         winner = 'w' AS won, winner, completed_at FROM games
  UNION ALL
  SELECT black_nerf_id, black_user_id, winner = 'b', winner, completed_at FROM games
) s
GROUP BY nerf, bot
```

Buff/hex/boon/item aggregates from the draft stream (only `pick` actions
carry cards; `WITH ORDINALITY` marks which offered card was taken):

```sql
SELECT c.card_id,
       (CASE WHEN a->>'color' = 'w' THEN g.white_user_id ELSE g.black_user_id END
          LIKE 'hp\_%') AS bot,
       COUNT(*)::int AS offered,
       COUNT(*) FILTER (WHERE c.chosen)::int AS picked,
       COUNT(*) FILTER (WHERE c.chosen AND g.winner = a->>'color')::int AS wins,
       COUNT(*) FILTER (WHERE c.chosen AND g.winner IS NOT NULL)::int AS decided,
       COUNT(*) FILTER (WHERE c.chosen AND g.completed_at > $recent)::int AS picked30d
FROM games g
CROSS JOIN LATERAL jsonb_array_elements(g.draft_record->'draftActions') a
CROSS JOIN LATERAL (
  SELECT t.elem->>'id' AS card_id, (t.ord - 1) = (a->>'index')::int AS chosen
  FROM jsonb_array_elements(a->'cards') WITH ORDINALITY t(elem, ord)
) c
WHERE g.draft_record IS NOT NULL AND a->>'a' = 'pick'
GROUP BY c.card_id, bot
```

Post-processing in JS: drop sentinel/unknown ids (anything not in
`NERF_BY_ID`/`BUFF_BY_ID`; buff-mode games store a no-nerf sentinel in the
nerf columns, verify the literal during implementation and exclude it), then
compute ranks per (kind, tier) by human dealt/picked, plus the tier-average
human win rate for the comparison line.

D1 fallback (dev, no Hyperdrive): same aggregates with SQLite `json_each`
over the `draft_record` TEXT column, best effort; dev volumes are tiny.

**Blob shape** (`key = 'v1'`):

```ts
interface InsightsBlob {
  computedAt: number;
  cards: Record<string, CardStats>;          // key "nerf:<id>" | "buff:<id>"
}
interface StatSegment {                       // one for human, one for bots
  dealt?: number; offered?: number; picked?: number;
  decided: number; wins: number; recent30d: number;
}
interface CardStats {
  human: StatSegment; bots: StatSegment;
  tierRank?: { rank: number; of: number };   // by human volume within tier
  tierAvgWinRate?: number;                   // human, for the comparison line
}
```

**Endpoint.** New `GET /api/cards/insights?kind=nerf|buff&id=<id>`
(`src/app/api/cards/insights/route.ts`, `dynamic = "force-dynamic"` like its
siblings):

1. Validate `kind`/`id` against the code libraries; unknown id = 404.
2. Load the blob from `codex_insights_cache`; if missing or older than 6h,
   recompute inline and store (single-digit-second worst case, and the edge
   cache below makes stampedes irrelevant at current traffic; if recompute
   fails, serve the stale blob).
3. Read the card's current override row (via the already-cached
   `listCardOverrides` pattern) and the card's `card_override_history` events
   (Part C; empty array until then).
4. Respond:

```ts
{
  id, kind,
  effective: { tier, enabled, renamed: boolean },  // override-aware, so the
                                                   // panel can flag "currently
                                                   // disabled" or a tier move
  stats: CardStats | null,                         // null = no games recorded
  events: OverrideEvent[],                         // Part C
  computedAt
}
```

Headers: `Cache-Control: public, max-age=300, s-maxage=3600` (same spirit as
`/api/cards`; per-card responses are tiny and the edge absorbs repeat views).

Privacy: only aggregates leave the server. No `draft_record` contents, no
`draftSeed`, no per-game rows, and `grant` actions never enter the pick
aggregation (they are not `pick` actions). This keeps the standing rule from
`docs/archive-draft-record.md` intact.

**Panel.** New `src/components/codex/CardInsights.tsx` (`"use client"`),
mounted in both `BuffDetail` and `NerfDetail` between "At a glance" and "How
it works". Behavior:

- Fetches its own card's insights on mount; renders nothing while loading and
  nothing on error (stats are supplemental; the static page must not regress).
- Zero data: one quiet line, "No online games recorded with this card yet."
- Win rate only shows when the segment's `decided >= 20`; below that show
  counts with a "too few games to rate" note. Small-sample percentages read
  as facts and mislead.
- Human numbers lead; bot numbers render as a secondary "house bots" line
  (arena volume would otherwise drown the human signal).
- Nerf layout: Dealt, Holder win rate (with "tier average: NN%" beside it),
  Last 30 days, "#N of M Tier X nerfs by games carried".
- Buff/hex/boon/item layout: Seen in offers, Picked, Pick rate
  (picked/offered), Holder win rate, Last 30 days, tier rank. Label the
  pick-rate stat honestly: offers are only observable when someone picked
  from them (banked offers carry no card list), so pick rate means "when this
  card was in an offer a player picked from, how often it was the one taken".
- If `effective.enabled` is false: a banner line, "Currently disabled by the
  moderators; it is not being dealt." If `effective.tier` differs from the
  code tier: "Currently dealt at Tier N (moved by the moderators)."

### Part C: moderator change history

**Table.** D1 `migrations/0024_card_override_history.sql` + the
`SCHEMA_STATEMENTS` mirror:

```sql
CREATE TABLE IF NOT EXISTS card_override_history (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,               -- 'buff' | 'nerf'
  field TEXT NOT NULL,              -- 'name'|'description'|'flavor'|'tier'|'enabled'|'reset'
  old_value TEXT,
  new_value TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coh_card ON card_override_history (kind, card_id, at DESC);
```

No actor column: the events are publicly exposed, and which moderator made a
change is not public information. (The mod audit trail, if ever wanted, is a
separate private concern.)

**Write hook.** `upsertCardOverride` gains a read-before-write: SELECT the
existing row, diff field by field against the incoming override (treating a
missing row as all-NULL/enabled), and insert one history row per changed
field in the same `db.batch` as the upsert. `deleteCardOverride` records a
single `field = 'reset'` event when a row existed. Failure to write history
must not fail the override itself (wrap in try/catch; the override is the
product action, the audit line is dressing).

**Backfill.** Impossible (only `updated_at` survives). For cards with an
existing override row, the endpoint synthesizes one event "metadata adjusted
by the moderators" dated `updated_at`, so day-one pages are not misleadingly
empty.

**Exposure.** The insights endpoint (Part B step 3) returns the card's events,
oldest first, shaped for display:

- `tier` / `enabled` / `name`: show old and new values ("Tier 4 to Tier 6",
  "Disabled", "Renamed from X to Y").
- `description` / `flavor`: just "Description rewritten" (no diff payload;
  old texts can be long and the current text is already on the page).

The panel merges these into the History timeline under the static events,
visually distinct ("moderator change" tag).

## Failure and empty behavior

- Insights endpoint down or slow: card pages are unaffected; the panel stays
  empty. No layout shift beyond the section heading (render the heading only
  once data exists).
- Card exists in code but has never been dealt (most of the ~1000 on day
  one): "No online games recorded" line; History still shows its wave.
- Unimplemented cards: panel not mounted at all (they cannot have stats), and
  the existing `NotDraftedNote` already explains their status.
- Pre-`draft_record` draft games: invisible to buff stats by construction
  (`draft_record IS NULL`); nerf stats cover the full archive since nerf ids
  are top-level columns.

## Rollout

1. **PR 1 (Part A).** Pure Next/static change: new routes, canonical moves,
   `cardPath`, sitemap, History section + `cardHistory.ts` seed. Verify with
   `npx tsc --noEmit` and a local crawl of a hex, a boon, an item, and a nerf
   page (canonical tags, sitemap entries, history prose).
2. **PR 2 (Part B).** D1 migration 0023 self-applies via `ensureSchema`; no
   PG migration (reads only). `schema.ts` is in the worker bundle, so bump
   `buildVersion` in worker.ts per convention. No engine change, no
   `REPLAY_VERSION` bump, no Tokyo/Chicago action needed (the OCI engine
   service is untouched; the rollup reads PG through the existing Hyperdrive
   binding).
3. **PR 3 (Part C).** D1 migration 0024, `cardOverrides.ts` hook, endpoint
   events, panel merge. Same `buildVersion` note.
4. Append each PR to `docs/CHANGELOG.md` per the standing convention.

## Acceptance criteria

1. `/codex/hex/<some-hex>` and `/codex/boon/<some-boon>` render statically,
   are listed in `/sitemap.xml`, and the same ids at `/codex/buff/…` still
   render with canonical pointing at the family path. Items and plain buffs
   are untouched.
2. Every implemented card page shows a History section with at least its
   wave-introduction line, server-rendered (present in view-source, no JS).
3. On a card with archived games, the panel shows dealt/picked counts that
   match a hand-run of the SQL above; a card with zero games shows the empty
   line; win rate is absent below 20 decided games.
4. `GET /api/cards/insights?kind=nerf&id=bottled_lightning` responds < 100ms
   warm (blob cached), recomputes when `computed_at` is older than 6h, and
   404s on an unknown id.
5. Editing a card in `/mod/cards` (tier move, disable, rename) produces
   matching `card_override_history` rows, and the card's page shows the
   change in its timeline within the cache window.
6. No response from the new endpoint contains `draft_record`, `draftSeed`,
   per-game data, grant events, or moderator identity.
7. `npx tsc --noEmit` and `npm run server:build` pass on each PR.

## Touched files

| File | Change |
| --- | --- |
| `src/app/codex/hex/[id]/page.tsx` | new: static hex pages |
| `src/app/codex/boon/[id]/page.tsx` | new: static boon pages |
| `src/app/codex/buff/[id]/page.tsx` | canonical points at family path for hex/boon ids |
| `src/lib/cardCodex.ts` | `cardPath` helper; related-card links use it |
| `src/app/codex/page.tsx` | codex list links hexes/boons to family paths |
| `src/app/sitemap.ts` | hex/boon entries move to family paths |
| `src/components/codex/CardDetail.tsx` | History section (server), mount `CardInsights`, breadcrumb section names |
| `src/data/cardHistory.ts` | new: wave map + curated per-card events |
| `src/components/codex/CardInsights.tsx` | new: client stats + moderator-history panel |
| `src/lib/server/cardInsights.ts` | new: rollup computation (PG + D1 fallback), blob load/store |
| `src/app/api/cards/insights/route.ts` | new: per-card insights endpoint |
| `migrations/0023_codex_insights.sql` | new: `codex_insights_cache` |
| `migrations/0024_card_override_history.sql` | new: `card_override_history` |
| `src/lib/server/schema.ts` | mirror both new tables in `SCHEMA_STATEMENTS` |
| `src/lib/server/cardOverrides.ts` | diff + history writes in upsert/delete |
| `worker.ts` | `buildVersion` bump only (schema.ts is in the bundle) |
| `docs/CHANGELOG.md` | one appended block per PR |

## Deliberate cuts and open questions

- **`use` attribution** (how often a drafted hex/item is actually cast, and
  what happened after): needs `replayToPosition` over the full action stream,
  which is the game-review milestone's machinery. Revisit once that lands.
- **Banked offers** are invisible to the pick-rate denominator (`bank`
  actions carry no card list). Accepted and labeled in the UI.
- **Per-mode split** (buff mode vs nerf mode) is derivable from `category`
  and could segment the stats later; v1 reports combined to keep the panel
  readable.
- **Win-rate-by-color** for nerfs: cheap to add to the rollup, cut from v1
  for panel simplicity.
- **Nerf sentinel id** used by buff-mode games in the `white_nerf_id`/
  `black_nerf_id` columns must be confirmed and excluded during
  implementation (unknown ids are dropped anyway, so the guard is belt and
  suspenders).
- **Hard 308 redirects** for hex/boon ids off the buff path: only if search
  consoles show the canonical hint is not consolidating.
