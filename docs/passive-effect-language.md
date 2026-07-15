# The Passive Effect Language

Design authority for every passive visual in NerfChess. The registry (`src/components/effects/passiveRegistry.ts`) implements this spec; the coverage test enforces it. A passive without an entry here fails the build. Silent no-animation fallback is banned.

## 1. Why a language and not 300 bespoke animations

Every passive needs to be identifiable at a glance, but 300 unrelated animations would be noise and an unmaintainable pile. So the system is a grammar:

    effect = family (verb) + target (noun) + primitives (adverbs) + palette + sigil

Two passives may share primitives; no two passives may share the full sentence. The coverage test enforces uniqueness of the (family, primitives, target, sigil) tuple.

## 2. Families (the verb: what the passive DOES)

| Family | Meaning | Signature move | Example passives |
|---|---|---|---|
| `strike` | Sudden harm or threat | Fast in, impact, shockwave out | Bottled Lightning, Detonate auras |
| `bind` | Restriction of movement | Contract inward, lock, chain settle | Hobbled Queen, Hoarder, No Drawbridge |
| `fracture` | Fragility, degradation | Crystallize, crack lines, shard glint | Glass Army, Glass King, House of Cards |
| `territory` | Squares/files/ranks claimed | Sweep across the zone, edge burn | The Floor Is Lava, Sacred File, Hold Them Back |
| `veil` | Hidden information | Roll in, soft occlusion | Fog of War, Shadow Queen |
| `decree` | Rule change on a piece class | Sigil stamp from above, ring settle | Crippled Clergy, Flat Footed, Kingpin |
| `tempo` | Time and turn pressure | Tick marks, countdown pips, pulse on beat | March or Die, timer passives |
| `summon` | Something appears | Drop with impact ripple | Untitled Duck, spawn cards |
| `blessing` | A gain for the owner | Rise, warm glow bloom, settle | Moonlit King, boons |

Family determines: entrance direction (strike = down/in, blessing = up/out, territory = lateral sweep, veil = rolling fill), impact character, and sound family.

## 3. Primitives (the reusable vocabulary)

Implemented once each as CSS/SVG/WAAPI building blocks, composed per card:

`bolt` `shockRing` `crackLines` `crystallize` `chainLink` `sigilStamp` `zoneSweep` `edgeBurn` `fogRoll` `beamVertical` `beamHorizontal` `dropImpact` `riseGlow` `moonCircle` `gateSlam` `cardLift` `weightDrop` `tickPips` `orbitSpark` `shatterExit` `drainFlow` `pulseRing`

Rules:
- A composition uses 1 to 3 primitives, no more.
- Particles are bounded: max 24 nodes per effect, pooled, transform/opacity only.
- Every primitive has a reduced-motion equivalent: a 160ms fade plus its static sigil.

## 4. Target taxonomy (the noun: where it lands)

| Target type | Spawn placement | Persistent aura |
|---|---|---|
| `piece` | On each affected piece | Under-piece ring (2px, 40% alpha, breathes at 4s) |
| `pieceClass` | Simultaneous on all members | Same ring on every member |
| `square` | On the square | Square underlay tint + 1px inner edge |
| `file` | `beamVertical` down the file | 4% tint wash + edge ticks at both board edges |
| `rank` | `beamHorizontal` or `zoneSweep` | Same as file, horizontal |
| `zone` | `zoneSweep` across the region | Region tint at 5%, edge burn line |
| `board` | Board-edge ripple, never full cover | 1px board-frame treatment |
| `clock` | Effect on the clock pill | Clock pill accent + icon |
| `movement` | Flourish on legal-move dots at first reveal | Restyled legal-move indicators while active |
| `capture` | Flourish on the capture marker | Restyled capture markers |
| `winCondition` | HUD badge stamp-in | Persistent HUD badge |
| `hidden` | Owner sees the true effect; opponent and spectators see NOTHING until revealed | None opponent-facing |

Auras never cover: piece glyphs, coordinates, last-move highlight, check marker, targeting reticles, clocks.

## 5. Palette behavior

- Owner-positive passives (buffs, boons): buff sky `#5b9bd4` ramp.
- Opponent-afflicting passives (nerfs, hexes): nerf terracotta `#c4785f` ramp.
- Neutral board physics (lava, fog, duck): the element's natural hue drawn from the existing tier palette (lava = tier-8 blood, fog = parchment at low alpha, moon = parchment-50, lightning = tier-10 cyan, gold chains = tier-9 gold).
- Tier sets intensity, not hue: alpha, node count, and duration scale with tier (see 6).
- Never more than two hues in one effect.

## 6. Tier intensity ladder

| Tier | Spawn duration | Nodes | Impact |
|---|---|---|---|
| 1-2 | 450ms | <= 8 | Single primitive, no shake |
| 3-4 | 650ms | <= 12 | Two primitives |
| 5-6 | 850ms | <= 16 | Two primitives + shockRing |
| 7-8 | 1100ms | <= 24 | Three primitives, 2px board shake allowed |
| 9-10 | 1400ms | <= 24 | Three primitives + frame flash, once only |

Settle transition is always the final 30% of the duration. Nothing exceeds 1400ms; nothing covers the full screen; nothing repeats without a new activation.

## 7. Lifecycle (every passive, no exceptions)

1. Spawn intro: unique composition per card, played once per activation. Keyed by stable activation id `cardId:color:activationPly`, deduped in a session-scoped set so re-renders and takeback re-derives never replay it.
2. Settle: the intro resolves into readable state within the family's duration budget.
3. Persistent aura: the target-taxonomy aura from section 4, active while the passive is live. Restrained: alphas above are maxima.
4. Trigger pulse: when the passive rejects or alters an action, a 200ms `pulseRing` on the affected target plus, for rejections, the standard invalid shake on the input square.
5. Exit: 300ms reverse of the aura (fade + one primitive from the composition played backwards where natural, e.g. chains fall away, glass un-cracks is wrong so glass shatters via `shatterExit`).

## 8. Named compositions (the canonical eighteen, pattern for all others)

- Bottled Lightning: strike, king. `bolt` collapses onto the king square, `shockRing`, settle to a charged crown aura (cyan, 2 sparks orbiting at 6s).
- Crippled Clergy: decree, pieceClass bishops. `sigilStamp` on both bishops, `crackLines` flicker, staggered ring settle with restrained-movement rings.
- Glass Army: fracture, pieceClass non-pawns. `crystallize` wave from king outward, `crackLines` glint, settle to faceted ring auras.
- Glass King: fracture, king. Single `crystallize` + one sharp reflective `pulseRing`.
- Hoarder: bind, pieceClass pawns. `chainLink` draws gold links pawn to pawn across the rank, settle to linked under-ring chain glyphs.
- Hobbled Queen: bind, queen. `weightDrop` of a leaden crown, short-radius movement ring settles.
- Hold Them Back: territory, zone (own half). `edgeBurn` ignites along the frontier rank line, settle to a 5% wash on the half.
- House of Cards: fracture, pieceClass. `cardLift` raises each piece as a card face, unstable outline settle (1 degree wobble at 5s).
- March or Die: tempo, pieceClass pawns. `tickPips` march-line arrows behind pawns, counter pips settle beside the rank.
- The Floor Is Lava: territory, rank(s). `zoneSweep` ignition from a-file to h-file, ember edge settle.
- Fog of War: veil, zone. `fogRoll` from the far edge, settle to soft occlusion (existing fog visual adopts the language).
- Kingpin: decree, king. `drainFlow` streams capture authority from each piece into the king, crown badge settle.
- Flat Footed: decree, pieceClass pawns. Ghost double-step arrows appear, `crackLines` fracture them, dissolve.
- No Drawbridge: bind, king+rooks. `gateSlam` portcullis bars drop over the castling squares, bar-glyph settle.
- Untitled Duck: summon, square. `dropImpact` with a small ripple, settle to the duck simply existing (it is a duck).
- Sacred File: territory, file. `beamVertical` of parchment light, settle to file wash + edge ticks.
- Shadow Queen: veil, queen. Dark-square energy wraps in from adjacent dark squares, settle to a dark shimmer ring.
- Moonlit King: blessing, king. `moonCircle` settles beneath the king, gentle 4s breath.

Every other passive gets a composition in the registry following this grammar, authored per card (family and target derive from what the card DOES; sigil is the card's icon).

## 9. Visibility rules

- Player: full effects for own passives and revealed opponent effects.
- Opponent and spectators: effects only for public passives (instant cards, revealed rules, board-visible physics). Hidden nerfs render nothing opponent-facing until the reveal moment, then play the reveal variant of the spawn (same composition, preceded by a 300ms card-flip).
- Replay and history review: spawn plays when the scrubber crosses the activation ply going forward, aura is present at any ply where the passive is active, skippable via the existing animation settings.
- Reconnect: auras restore from state without replaying intros; the intro replays only if the activation is within the last 2 plies.
- TV, profile mini-boards, homepage hero: aura layer only, no spawn intros (small boards, ambient context), except the featured full-size TV board which gets full effects.

## 10. Performance and settings budget

- All effects render inside the board viewport stacking context, `overflow: clip` respected, z-index band documented in BoardEffects (effects sit above squares, below the drag layer and HUD).
- `data-anim="off"`: intros collapse to the reduced-motion fade + sigil; auras remain (they are information).
- `prefers-reduced-motion`: same as off.
- Effect intensity setting (new, in Settings): full / calm / minimal. Calm halves node counts and durations; minimal is the reduced-motion treatment.
- No timers or listeners survive unmount; the preview harness fails on leaks.
