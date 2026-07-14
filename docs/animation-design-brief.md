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
- Edge safety: board-wide scenes must center on the BOARD (leadShift / cellStage),
  never on the cast square, so nothing clips mid-screen.

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
