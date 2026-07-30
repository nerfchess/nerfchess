# Animation references, with licences

Reference material for the card-animation work, gathered 2026-07-30.

**Nothing linked here is committed to this repository, and nothing here should
be.** Every card animation in NerfChess is hand-built in the existing FX system
(`docs/animation-design-brief.md`, `src/components/effects/`) as transform- and
opacity-only CSS/SVG, gated behind `html[data-anim]` and the FX intensity dial.
That is a deliberate constraint, and it is why the game can run its whole visual
language on a phone:

- **No runtime dependency.** A Lottie player is 200-300KB before a single
  animation file, on a page that already ships a chess engine.
- **No second system.** 715 plugin plays across 12 modules already share one
  vocabulary of primitives; a Lottie card could not participate in it, honour the
  FX dial, or respect reduced motion without bespoke plumbing.
- **No licence surface.** A hand-drawn scene has no attribution question, ever.

So these links are for **studying timing and shape**, then rebuilding. Watch what
a reference does in its first 300ms, steal the *timing*, draw the art.

---

## Libraries worth studying

| Source | What it is good for | Licence |
| --- | --- | --- |
| [LottieFiles: chess animations](https://lottiefiles.com/free-animations/chess) | Piece movement, board reveals, capture beats | Public animations use the **Lottie Simple License**: commercial use, no attribution required |
| [LottieFiles library](https://lottiefiles.com/) | The reference collection for the format; has a player, editor and optimiser | Per-asset; free ones are Lottie Simple License |
| [IconScout: spell effects](https://iconscout.com/lottie-animation-packs/spell-effects) | Cast/impact/settle timing for the hex and mystic families | Mixed free/paid — **check per asset**, the free tier has attribution terms |
| [IconScout: explosion packs](https://iconscout.com/lottie-animation-packs/explosion) | Strike and detonation cards (Atomic Reaction, Detonation Field) | Same caveat |
| [OpenGameArt: CC0 special effects](https://opengameart.org/content/cc0-special-effects) | Sprite-sheet timing for 2D magic and explosions | **CC0** — public domain, the cleanest licence on this list |
| [itch.io: spell effects](https://itch.io/c/1960015/spell-effects) | Indie effect packs, often with generous terms | Per-asset, varies wildly |

If any of this ever *is* used directly rather than as reference, CC0
(OpenGameArt) is the only category to reach for without reading terms carefully,
and the licence needs recording next to the asset.

---

## The three-beat structure to look for

`docs/animation-design-brief.md` is the authority, and every good reference obeys
it whether or not it names it:

> **tell → strike → settle.** A ≤300ms anticipation cue (a shadow, a crosshair, an
> inhale-squash), then the main hit, then a short decaying settle (dust, embers,
> ripples). One-beat "pop and done" reads cheap.

When studying a reference, time those three beats and note the ratio. That
ratio is the transferable part; the artwork is not.

Two more rules from the brief that rule out most stock assets on sight:

- **Character over abstraction.** Prefer a thing happening — an anvil, a beam, a
  claw — over generic rings and sparks. Most stock "magic" packs are rings and
  sparks, which is exactly the seasoning-not-the-meal failure.
- **Palette discipline.** Three colours per play (core / glow / deep accent),
  leaning on the category theme, and whites are warm (`#fff4d6`-ish), never pure
  `#fff`. Stock assets are almost never in a three-colour budget.

## The backlog is the priority list

`docs/animation-backlog.md` (2,646 lines) already ranks what needs work, tier 8-10
first. Reference-hunting should be driven by that list rather than the other way
round: pick the card, then look for a reference for *its* beat. Browsing an effects
library and working backwards is how a game ends up with 40 animations that all
look like the same asset pack.

## Uploading your own assets

If you have artwork you own or have licensed, the drop-in paths already exist and
follow the pattern the named-person set uses (`src/components/effects/personalPlays.tsx`
renders `public/newjeans/*.svg` through a plain `<img>`):

- Portraits and emblems → `public/creators/<slug>.svg`
- House-bot avatars → `public/house-pfp/<name>.svg` (then wire the name in
  `HOUSE_PFP_ASSIGN`; note real accounts can never hold these ids by design)
- Card scene art → beside its plugin module in `src/components/effects/`

SVG is strongly preferred: it scales with the board at any size, stays a few KB,
and can be recoloured to a card's three-colour palette. A PNG cannot do the last
two.
