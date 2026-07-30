# NerfChess Animation Overhaul — Design Brief (single source of truth)

Design language (applies to EVERY play):
- Three-beat structure: **tell → strike → settle**. Every play opens with a ≤300ms
  anticipation cue (shadow, crosshair, inhale-squash), lands its main hit, and leaves a
  short decaying settle (dust, embers, ripples). One-beat "pop and done" reads cheap.
- Transform/opacity only. No layout/filter animation. All motion gated by
  html[data-anim] (never the OS media query), durations multiplied by --fx-dur.
- Palette discipline: each play owns THREE colors (core / glow / deep accent) and
  leans on the category theme; whites are warm (#fff4d6-ish), never pure #fff.
- Character over abstraction: prefer a thing happening (an anvil, a beam, a claw)
  over generic rings/sparks. Rings/sparks are seasoning, not the meal.
- **Anchoring (replaces the old edge-safety rule).** Scenes happen on the square
  the card was cast on. The rule this supersedes said board-wide scenes must
  center on the BOARD so nothing clips mid-screen; that was true of the fix in
  place at the time (`leadShift`) but far stronger than the actual constraint,
  and it made a card cast on a1 render identically to one cast on e4. See §7.

## 0. Anchoring and direction (the geometry contract)

Full derivation in `src/components/effects/geometry.ts`; the staging boxes are
in `src/components/effects/stage.tsx`.

**Where a scene plays** is declared per card by `anchor`:

- `"cast"` — anchored on the cast square. **The default for new scenes.**
- `"aim"` — as `"cast"`, plus the stage rotates onto the source -> target
  vector. Author the art pointing RIGHT; it aims itself.
- `"board"` — centred on the board wherever it was cast. Only for scenes that
  genuinely depict something happening to the WHOLE board (the tier 9/10
  marquee set). This is also the default for any scene that has not declared
  one, so un-migrated art is unchanged.

**Why anchoring is safe.** Scene art lives on a 14-cell canvas centred on its
square (`BoardWideStage`), and the board crop is `overflow: hidden`. A 14-cell
canvas covers an 8-cell board whenever its centre sits in `[1, 7]`; square
centres run 0.5 to 7.5, so the worst case (a corner) is a **half-cell**
correction, applied automatically by `clampAnchor`. Nothing clips.

**The three staging boxes.** Using the wrong one is the main way to get this
wrong:

| Box | Its `0..100%` is | Use for |
|---|---|---|
| `BoardWideStage` | the 14-cell canvas, centred on the cast square | the action |
| `BoardFrame` | exactly the BOARD, at any anchor | washes, rain, horizons, edge rings |
| `AimStage` | the canvas, rotated onto the attack vector | beams, charges, sweeps |

A fixed percentage of the stage does **not** mean the board any more. Anything
that means "the whole board" goes in `BoardFrame`.

**`AimStage` rotates everything inside it**, which is right for a beam, a
trench or a ram, and wrong for a character: a town crier does not lie on his
side to point at a victim. When a scene has both an upright subject and a
travelling part, stage them separately - the subject in `BoardWideStage` on the
cast square, only the travelling part in `AimStage`. The herald module
(`g17HeraldPlays`) composes exactly that and is the reference for it.

**Geometry reaches the art as inheriting CSS custom properties**, set on the
wrapper span (never on the transform wrapper, whose `z-30` stacking-context fix
is load-bearing):

| Var | Meaning |
|---|---|
| `--fx-ox`, `--fx-oy` | cast square offset from board centre, in cells |
| `--fx-board-dx`, `--fx-board-dy` | where the board sits in the canvas (drives `BoardFrame`) |
| `--fx-anchor-dx`, `--fx-anchor-dy` | the clamp correction |
| `--fx-ang` | aim angle, degrees, CSS rotate convention |
| `--fx-aim-x`, `--fx-aim-y` | the same aim as a unit vector |
| `--fx-len` | source -> target distance, in cells |
| `--fx-index`, `--fx-n` | this square's place in the victim order, and the total |
| `--fx-side` | `+1` caster at the bottom of the screen, `-1` at the top |

Never write "the bottom of the board" into art: that is wrong for one of the
two players. Lean on `--fx-side`.

**Multi-target plays travel.** `orderSignature` builds legs along the real
victim order, so a sweep rolls square to square and a chain hops victim to
victim rather than firing one centred burst plus a row of identical pops. Each
target square carries its own leg's `--fx-ang` and `--fx-len`, and the canvas
layer draws the same legs (`VfxPlay.targets[].from`, `CardVfx.chain`).

## 0b. The scene floor (enforced)

`npm run test:scene-complexity` measures every scene and ratchets the count
below this floor downward. `npm run test:animations` additionally ratchets the
count of cards with no hand-made art at all (F5) toward zero.

- **Exactly three beats**: a tell in the first third, the strike, a settle in
  the last half.
- **Distinct animated layers by tier**: t1-3 >= 4, t4-6 >= 5, t7-8 >= 6,
  t9-10 >= 8. A layer is a distinct thing happening with its own delay, not a
  distinct element.
- **Exactly three palette colours** (core / glow / deep accent). Warm whites,
  never pure `#fff`.
- **At least one layer driven by a geometry var** from §0. This is what makes a
  scene point at what it is doing.
- **A declared anchor.**
- <= 16 animated nodes; transform/opacity only; no new sound keys.

## 0c. The three roles

Every scene renders `role`:

- `"lead"` — the board-scale flourish on the cast square.
- `"target"` — the per-square hit. Small, fast, no board-wide art.
- `"entrance"` — the card arriving in a hand, at ~56% of the crop. Same palette
  and central object as the play, no board takeover, its own short arrival
  beat. A scene that does not handle it falls back to its target cut.

## 1. CastSpectacle rework (BoardEffects.tsx — core, done by orchestrator)
- Cards WITH bespoke art: no more giant face-icon slam over the play. Keep the name
  banner + a tier-tinted frame pulse only. The bespoke scene IS the spectacle.
- Cards WITHOUT bespoke art (generated): replace the static icon slam with a themed
  arrival per category (icon becomes a participant, not a stamp):
  - attack: icon streaks in as a comet from the top edge, impact ring + 3 shard clusters
  - hex: a dashed curse circle inscribes counter-clockwise, icon burns in at center, drips
  - tempo: clock-hand sweep wipes the frame ring; icon ticks in on the final second
  - protection: two shield-halves clamp shut around the icon with a seam flash
  - movement: icon dashes across with 3 motion after-images and skid dust
  - draft: three card-backs fan open, icon pops from the middle card
  - info: a spyglass iris opens; icon revealed inside, glints
  - item: a crate drops, bounces once, lid flips, icon springs out
  - nerf: a rubber stamp slams the icon down, red "ink" ring bleed
  - pieces: icon assembles from 4 sliding quarters with a click

## 2. Acquire-entrance system (new; core)
Every card fires an entrance the moment it ENTERS your hand/board state (draft pick,
steal, grant) — separate from its play. Passives finally announce themselves
(computer_virus, total_atomic...). Board-level overlay, ~1.4s, banner + category
choreography from §1 at reduced scale + the card's own glyph. Marquee tiers (8+) add a
board dim + shockwave. Entrance NEVER replaces the triggered play later.

## 3. Bug-driven redesigns
- total_war: kill the icon slam (§1 fixes the "red cross before the cool part").
- jackpot (goldwheel in sigVisuals): kill the Cherry stamp (§1); wheel gets a lever
  pull tell, tick-tick-slowing pointer, wedge-glow on the winning slice, coin fountain.
- joseph_leung "Sign the board": no Fingerprint stamp; the mandate scroll unrolls,
  a quill signs a glowing looping signature stroke (stroke-dashoffset feel via
  scaled masks), wax seal stamps, seal ring shockwave.
- NewJeans portraits: hard background rects removed from the SVGs (done). Plays
  should treat portraits as free-standing characters: entrance = rise/step-in with a
  soft ground shadow ellipse, NOT a photo card. No rectangular washes behind them.

## 4. Walnut visual redesign (Pieces.tsx WalnutPiece + Board.tsx square, core)
Card text still says "walnut", so it stays a walnut — but a MYTHIC one:
dark burl-wood shell with molten-gold kintsugi cracks that pulse faintly; the trapped
piece's silhouette ghosts through the seams. Application: bark ribbons spiral up the
piece, snap shut, gold seams flash, wood-chip burst. The squirrel is retired; carved
root-claws grip the square's corners instead. Walnut Shell (the item) plays a giant
nutcracker CRACK: shell splits along the gold seams, shards tinkle, freed piece pops
out with a relief shiver.

## 5. genSignature families (genSignature.tsx/.css — fable agent)
Upgrade all 37 families from "one burst" to the three-beat structure. Keep the
hash-driven variant/hue system intact (uniqueness proof must still pass). Examples:
- frostbloom: hairline frost creeps from a corner FIRST, then the crystal fan erupts,
  settle = drifting mote glints. emberfall: embers pre-glow under the square, flame
  licks up, char flecks settle. gravityWell: frames wobble inward with increasing
  speed, collapse flash, one escaping spark. bellToll: bell swings twice building
  amplitude before the strike ripple. Apply the same thinking to all 37.

## 6. Module polish batches (fable agents, one module per agent)
Priority inside each module: tier 8-10 first, then 5-7, then the rest.
- godPlays/greatPlays: every apex scene gets a proper tell (dim + rumble line) and a
  settle (ash/embers/afterglow). total_atomic: entrance handled by §2; its triggered
  chain gets radioactive-green tint ramp and a final smug lingering mini-mushroom.
- casinoPlays: lever/chip/card tells; wins pay out TOWARD the player's edge.
- funny/meme/prank: bigger squash-and-stretch, comic timing (hold the beat before the
  punchline ~200ms longer than feels safe).
- stubPlays: replace the shared StubBurst with per-card mini-scenes still ≤80 lines each.
- basicPlays: keep shared machinery, add per-family tell beats.

## 7. Anchoring: what changed, and what it replaced

Before this pass every board-wide lead scene was translated so its canvas
re-centred on the board (`leadShift`, Board.tsx). That shim existed for a real
bug — an edge cast used to clip most of the animation away, the "only 1/4 of
the animation shows" report — and the rule written around it ("board-wide
scenes must center on the BOARD, never on the cast square") was the honest
generalisation at the time.

It was too strong. The clipping constraint is a half-cell, not three and a
half (§0), so centring everything threw away the one thing an effect should
communicate: where it happened. A card cast on a1 looked exactly like the same
card cast on e4.

Scenes now anchor on the cast square by default and declare `anchor: "board"`
only when they genuinely mean the whole board. `BoardFrame` gives the layers
that DO mean the whole board an exact box at any anchor, which is what makes
the change safe rather than a trade.
