# Spec: realistic house-bot weakening + live strength tuning from /mod

Status: implemented (code) — the engine, resolution, transport, and /mod tuning
UI are in place and ship with NO strength change (overrides row absent = baked
strength). What remains is operational: flip the "Weakened (50/30/20)" preset
from /mod (§8 step 4) and, later, the rating re-band (§6). Landed pieces:
- `src/engine/ai.ts`: WeakenParams, ranked full-window root, softmax/topK/noise sampling.
- `src/lib/server/bots.ts`: resolved-profile schema, resolveSkillProfile/sanitizeResolvedProfile/cleanSkillPatch, WEAKEN_CLAMP, WEAKENED_PRESET + VERY_WEAK_PRESET.
- `worker.ts`: house_skill_overrides cache + per-move resolution, resolved profile sent to the engine service.
- `engine-service/server.ts`: honors + re-clamps the sent profile (no VALID_SKILLS lockstep).
- `src/app/api/mod/house/route.ts` + `src/app/mod/page.tsx`: strength state, presets, per-tier live editor.
- `scripts/sim-house-bots.ts`: resolution/clamp unit checks + `--roundrobin` strength matrix.
Owner intent: make the house roster beatable — roughly 50% of personas
significantly weaker, 30% weaker, 20% unchanged — in a way that *feels* like a
weaker human (inaccuracies, hung pieces, positional misjudgement), not like a
time-starved engine. Strength must be editable in production from the /mod
dashboard without a redeploy.

## 1. Why not search time

`budgetMs` is a bad primary lever here:

- Diminishing Elo per ply (already documented at the top of
  `src/lib/server/bots.ts`): halving 800ms costs maybe ~40 Elo. Getting
  "significantly worse" via time means dropping to ~20–40ms, which collapses
  every tier to the same depth and erases the rating spread.
- Wrong failure mode: a short negamax+quiescence search still never hangs a
  piece to an immediate capture and still finds every 2-move tactic. It plays a
  *shallower flawless* game. Weak humans lose by blundering, not by being
  slightly less deep.
- The local DO fallback already clamps every tier to
  `HOUSE_SEARCH_CEILING_MS` (80ms), so on that path time tuning is a no-op and
  all 1750+ tiers are already identical in real strength. Time-only tuning
  works only while the OCI engine is up — fragile against exactly the outages
  we have had.

Time stays as a *secondary* knob; move-quality degradation (below) is the
primary one, and it behaves identically on the OCI path and the 80ms fallback.

## 2. Engine changes (`src/engine/ai.ts`)

### 2.1 Weakening parameter block

```ts
export type WeakenParams = {
  // Search shape
  maxDepth: number;        // 1..12
  budgetMs: number;        // 10..800 nominal (same semantics as today)
  extendedEval: boolean;   // bishop pair / doubled pawns terms
  // Move-quality degradation
  topK: number;            // 1 = always best (today's behavior); 2..8 = sample
  temperatureCp: number;   // softmax temperature over root scores, centipawns
  sampleWindowCp: number;  // only moves within this margin of best are candidates
  evalNoiseCp: number;     // uniform noise added to each root score pre-sampling
  blunderChance: number;   // 0..0.25: play a random non-self-losing legal move
};
```

`topK: 1, temperatureCp: 0, evalNoiseCp: 0` must reproduce today's search
byte-for-byte in move choice, so untouched tiers are provably unchanged.

### 2.2 Ranked root search (the correctness prerequisite)

Today's root loop narrows `alpha` as it goes, so non-best root moves return
inexact bounds — `ai.ts` already warns that noising/sampling those scores
"would randomly promote refuted moves." Sampling therefore needs comparable
root scores.

Add a second root mode inside `pickAIMove` (or a sibling
`pickRankedAIMove`), used only when `topK > 1`:

- Each root move is searched with a **full window** `(-Inf, +Inf)` at the
  iteration depth. Interior alpha-beta, killers, history, quiescence, and the
  node cap all still apply within each subtree; only root-level narrowing is
  disabled.
- Cost: roughly 2–4x nodes at equal depth. Acceptable because sampling tiers
  run at depth 3–6 with small budgets; the node cap
  (`NODES_PER_MS`-derived) remains the frozen-clock backstop on Workers.
- Output: `Array<{ move, scoreCp }>` for the deepest fully completed
  iteration (same iterative-deepening / timeout-sentinel discipline as today).

### 2.3 Move selection with weakening

Given ranked root scores:

1. Add `uniform(-evalNoiseCp, +evalNoiseCp)` to each score.
2. Keep moves with `score >= best - sampleWindowCp`, truncate to `topK`.
   Hard floor: drop any candidate whose true (pre-noise) score is mate-losing
   (`<= -50000`) when the best move is not — weakened bots may play
   inaccuracies, never one-move self-mates the search already sees.
3. Sample by softmax: `weight = exp((score - best) / temperatureCp)`
   (temperature 0 → argmax).
4. Independently of 1–3, with probability `blunderChance`, discard the search
   and play a random non-`triggersOwnNerfLoss` legal move (existing path).

The RNG is the caller-supplied `random(max)` used everywhere in `bots.ts`
(pure, testable); `pickAIMove`'s internal `Math.random` uses stay as-is for the
client bot.

## 3. Profile schema changes (`src/lib/server/bots.ts`)

`SkillProfile` grows the weakening fields with defaults equal to current
behavior:

```ts
type SkillProfile = {
  level: AILevel;
  budgetMs: number;
  blunderChance: number;
  // New — all optional, defaulting to "no weakening":
  maxDepth?: number;        // default: LEVELS[level].maxDepth
  topK?: number;            // default 1
  temperatureCp?: number;   // default 0
  sampleWindowCp?: number;  // default 150
  evalNoiseCp?: number;     // default 0
};
```

### 3.1 New baked defaults (the 50/30/20 shape)

Bands are by existing tier key so the difficulty picker, persona defs, and the
OCI contract don't change shape. Against the 60-persona roster this lands
~55% / ~32% / ~13% — close to the target, and the exact split is then tunable
live (§5).

| Tiers | Band | Profile sketch | Feels like |
|---|---|---|---|
| 1350–1900 (~33 personas) | **significantly worse** | depth 3–4, topK 4, temp 120–180cp, noise 50–80cp, blunder 3–5%, no extended eval | ~1200–1450 club player: hangs pieces, misses tactics |
| 1950–2050 (~19) | **worse** | depth 5–6, topK 3, temp 60–80cp, noise 20–30cp, blunder ~1% | solid but human: real inaccuracies |
| 2100–2200 (~8) | **unchanged** | today's hard profiles, topK 1 | current strength |

Concrete numbers to start (all live-editable afterwards):

```ts
1350: { level: "medium", budgetMs: 25,  blunderChance: 0.10, maxDepth: 3, topK: 5, temperatureCp: 180, evalNoiseCp: 80 },
1550: { level: "medium", budgetMs: 60,  blunderChance: 0.05, maxDepth: 3, topK: 4, temperatureCp: 140, evalNoiseCp: 60 },
1750: { level: "hard",   budgetMs: 100, blunderChance: 0.04, maxDepth: 4, topK: 4, temperatureCp: 120, evalNoiseCp: 50 },
1900: { level: "hard",   budgetMs: 120, blunderChance: 0.03, maxDepth: 4, topK: 3, temperatureCp: 100, evalNoiseCp: 40 },
1950: { level: "hard",   budgetMs: 250, blunderChance: 0.01, maxDepth: 5, topK: 3, temperatureCp: 80,  evalNoiseCp: 30 },
2000: { level: "hard",   budgetMs: 350, blunderChance: 0.01, maxDepth: 6, topK: 3, temperatureCp: 70,  evalNoiseCp: 25 },
2050: { level: "hard",   budgetMs: 450, blunderChance: 0.01, maxDepth: 6, topK: 2, temperatureCp: 60,  evalNoiseCp: 20 },
2100: { ...unchanged }, 2150: { ...unchanged }, 2200: { ...unchanged },
```

`pickHouseMove` passes the resolved profile through to the ranked/sampled
selection path; its existing blunder branch moves into the shared logic so the
DO fallback, the OCI service, the arena service, and the sim script all weaken
identically.

## 4. Resolved-profile transport to the OCI engine service

**Lesson from 2026-07-08 (stale `VALID_SKILLS`):** never make the box validate
against a baked-in enumeration that the Worker can outgrow, and never require
lockstep deploys for a tuning change.

Change the `/move` request to carry the *resolved* profile:

```ts
interface MoveRequest {
  match: EngineMatch;
  skill: HouseSkill;          // kept for logging/fallback
  profile?: ResolvedSkillProfile; // NEW, optional
  remainingClockMs?: number;
  replayVersion: number;
}
```

Engine service (`engine-service/server.ts`):

- If `profile` is present: **clamp every field** to sane ranges (depth 1–12,
  budgetMs 10–`REMOTE_SEARCH_CEILING_MS`, blunder 0–0.25, topK 1–8, temp
  0–400, noise 0–200) and use it. No enumeration check — numbers in, clamped
  numbers used.
- If absent (old Worker): current behavior via `HOUSE_SKILL_PROFILES[skill]`.
- `VALID_SKILLS` check is retained only for the no-profile fallback path.

This is backward and forward compatible in both directions: an old box ignores
the unknown field (old strength until its self-updater catches up); a new box
with an old Worker behaves exactly as today. No coordinated deploy.

## 5. In-vivo tuning: settings, API, dashboard

### 5.1 Storage

One new `app_settings` row (existing D1 KV table, `src/lib/server/settings.ts`):

- Key: `house_skill_overrides` (`HOUSE_SKILL_OVERRIDES_KEY`)
- Value: JSON `Partial<Record<HouseSkill, Partial<SkillProfile>>>`, e.g.
  `{"1750":{"topK":5,"temperatureCp":150},"2200":{"blunderChance":0.02}}`
- Absent row / unparseable JSON / unknown tier keys / out-of-range values →
  ignored field-by-field, baked defaults win. A bad save can never take the
  bots down (mirrors the "bots degrade to absent, never to broken" rule at the
  top of bots.ts).

Resolution helper in `bots.ts` (pure, unit-tested):

```ts
export function resolveSkillProfile(
  skill: HouseSkill,
  overrides: unknown /* parsed JSON or null */,
): ResolvedSkillProfile; // baked default ⊕ clamped override
```

### 5.2 Worker/DO plumbing

- New `houseSkillOverridesCache` on the game-server DO, same shape and ~15s
  TTL as the existing `houseCountCache` — a /mod save takes effect on live
  games within seconds, mid-game included (each move resolves fresh).
- Everywhere the DO currently passes `persona.skill`
  (`remoteHouseMove` payload, local `pickHouseMove` fallback), it first
  resolves the profile and passes/uses that.

### 5.3 API — extend `src/app/api/mod/house/route.ts` (mod-gated, same guard)

- `GET` response grows:
  `skillTiers: Array<{ skill, defaults: SkillProfile, overrides: Partial<SkillProfile> | null, effective: ResolvedSkillProfile }>`
  plus `overridesUpdatedAt`.
- `POST` accepts additionally:
  - `skillOverrides?: Record<string, Partial<SkillProfile> | null>` — merge
    per tier into the stored JSON; `null` for a tier clears that tier;
    server-side clamps identical to the engine service's.
  - `resetSkillOverrides?: true` — delete the row (full reset to baked).
- Validation errors return 400 with the offending field; a valid save returns
  the new `skillTiers` state so the UI re-renders from the source of truth.

### 5.4 Dashboard UI (`src/app/mod/page.tsx`)

New "House bot strength" card under the existing house on/off + count
controls, same fetch/save pattern:

- **Preset row**: `[Default] [Weakened (50/30/20)] [Very weak]` buttons that
  fill the whole override map in one click; "Weakened" writes the §3.1 table.
- **Tier table**: one row per tier — tier rating, then compact numeric inputs
  for depth / budgetMs / topK / temperature / noise / blunder%. Overridden
  cells are visually marked (baked default shown as placeholder); per-row
  "reset" link; "Reset all" button.
- Effective-value preview comes straight from the GET payload (`effective`),
  so what the moderator sees is exactly what `resolveSkillProfile` computes —
  no client-side re-derivation.
- Footer note: "changes reach live games within ~15s; ratings drift is
  expected after a strength change" + `overridesUpdatedAt` timestamp.

No new auth surface: `requireMod` gates everything, values are clamped
server-side, and the setting is data-only (a hostile value cannot exceed the
node cap / search ceiling).

## 6. Ratings follow-through

Weakened personas will bleed Glicko rating to humans until display matches
reality. Handle deliberately, not incidentally:

1. Let rated games move ratings naturally for a week or two after enabling the
   weakened preset (this is fine — it *looks* organic).
2. Then re-band `PERSONA_DEFS` seed tiers to the observed strengths, and bump
   the versioned cold-start key so `syncHouseRatings` re-points seeds once.
3. `pickHouseBotByDifficulty` bands (easy ≤1550 / medium 1750–1900 / hard
   ≥1950) keep working unchanged since bands are by tier key, but re-check the
   easy/medium/hard *feel* against the new real strengths.

## 6a. Calibration finding (2026-07-12 sim)

The `--roundrobin` matrix plus a control run established:

- **Scoring is sound**: an unweakened mirror (baked 2200 vs itself) scores 50%,
  and at a low ceiling baked 2050 ≈ baked 2200 (both clamp to the same budget) —
  no color bias, no bug.
- **Mirror self-play saturates.** Two unweakened engines *draw every game*, so
  the baseline has no winning chances against itself; any weakening flips those
  draws into losses. Even the mildest first-cut "worse" tier (topK 2, temp 60)
  scored ~4% against an unweakened peer, and every band read ~0%.
- **Consequence:** self-play confirms direction and monotonicity but **cannot**
  resolve the 50/30/20 bands or predict strength vs humans. The `WEAKENED_PRESET`
  was therefore softened into a *graded* ramp (see the constant in bots.ts) and
  must be **calibrated live** against real rating drift (§6), not against a
  self-play win rate. Don't trust a mirror-match percentage as a strength target.

## 7. Verification

- **Unit** (pure, no I/O): `resolveSkillProfile` clamping/merging;
  softmax sampling determinism given a seeded RNG; `topK:1/temp:0` bitwise
  equivalence with today's move choice on a corpus of positions.
- **Self-play sim**: the existing sim script drives `pickHouseMove`, so it
  picks the new behavior up for free. Add a round-robin mode: ~200 games per
  tier pair, report score matrix. Acceptance: (a) strictly monotonic tier
  ordering, (b) "significantly worse" tiers score ≤20% vs unchanged tiers,
  (c) "worse" tiers score 25–40% vs unchanged.
- **Blunder realism spot-check**: sample 20 sim games from the weakest tier
  and eyeball that losses come from hung pieces / missed tactics, not
  random-looking king walks (if they do, lower `blunderChance` and raise
  `temperatureCp` — same Elo, better optics).
- **In-vivo check**: after deploy, flip one tier's override from /mod and
  confirm via engine-service logs that `/move` requests carry `profile` and
  the box honors it within one cache TTL.

## 8. Rollout order

1. Ship `ai.ts` ranked-root mode + `bots.ts` schema/resolution with **no
   behavior change** (all defaults = today). Deploy everywhere, including the
   engine box (its self-updater path). Zero-risk diff.
2. Ship the `profile` field in the `/move` contract (Worker sends, box clamps
   and honors, both sides tolerate the other's old version).
3. Ship the /mod UI + API. Still no strength change — overrides row absent.
4. Flip the "Weakened (50/30/20)" preset from /mod. Watch for a day. Adjust
   live.
5. (Later) §6 rating re-band.

Each step is independently revertible; step 4 reverts from the dashboard
itself in one click.

## 9. Explicit non-goals

- The client-side practice bot (`LEVELS` easy/medium/hard in `ai.ts`) keeps
  its current tuning; only house personas are in scope.
- No per-persona overrides (per-tier only) in v1 — the tier is the unit the
  whole system already thinks in.
- No engine-service DB/config access: the box stays stateless; all state
  rides in the request.
