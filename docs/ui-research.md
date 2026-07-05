# UI research: how the best chess and game sites present themselves

A working study to steer the NerfChess redesign. Every observation ends in a
concrete move for our own surfaces, not a general principle. No fluff.

## 1. Lichess (lichess.org)

The craft benchmark, and the closest sibling to what NerfChess is.

- **The homepage hero is a live board, not a pitch.** The first thing you see is
  the "Lichess TV" board streaming a real game with real player names and
  ratings, plus a dense right rail of quick-pair buttons (1+0, 3+2, 5+3...). The
  page assumes you came to play and puts play one click away. There is no
  headline selling chess to you.
  - _We already do this_ (HeroTv streams the top live game). Keep it as the
    thesis. The redesign adds a short H1 and the mode-field wash so the split
    identity registers, without turning the hero into a marketing block.

- **Density is a feature, not a flaw.** Small type, tight rows, many affordances
  visible at once. It signals "tool for people who are here a lot." It never
  pads a section to fill space.
  - Antidote we adopt: resist the urge to add breathing-room hero copy. Keep the
    action column shorter than the board, quick links inline.

- **Utilitarian palette with one accent.** Warm-neutral dark surfaces, a single
  blue for links/primary, semantic red/green used sparingly. No gradients for
  decoration.
  - We match this and add exactly one controlled color idea on top: the two mode
    hues, used only in the seam. That is our one divergence from lichess and it
    is the product's own duality, not decoration.

- **Rounded 7px corners, subtle button gradients.** Buttons read as physical.
  - We keep our metal buttons (`.btn-leaf`) but deliberately diverge on corners:
    0px flat. It is a chosen difference, documented, not an accident.

## 2. Chess.com

The mass-market counterpoint. Useful mostly as a set of things to _not_ copy.

- **Louder, greener, more illustrative.** Big friendly CTAs ("Play Now"), a
  cartoon board/mascot, high-saturation green. Converts beginners well; reads as
  a consumer app, not a craftsperson's tool.
  - We stay on the lichess side of this line: warm ink over candy green, wood
    board tones (`--sq-light/--sq-dark`) over the chess.com green squares.

- **One thing worth stealing: the persistent "play" primacy.** However loud,
  chess.com never buries the primary action. The single biggest button is always
  "play a real person."
  - We keep our action hierarchy: one glowing primary (Play Someone), two quieter
    options, live-now proof directly beneath.

## 3. Linear (linear.app)

Best-in-class modern product landing, and the template many AI pages badly
imitate.

- **The signature is motion and precision, not a gimmick.** Subtle gradient
  auras, crisp keyboard-first UI screenshots, extremely tight typographic
  spacing. The personality comes from restraint executed perfectly.
  - Lesson: our boldness belongs in _one_ place (the seam). Everything around it
    stays quiet and disciplined, which is exactly how Linear reads premium.

- **Real product surface as hero imagery.** Linear shows its actual app, not
  abstract shapes.
  - We show a real live game (HeroTv), not stock illustration. Keep it.

## 4. Balatro / itch-tier game landing pages

Strong game sites let the game's own artifacts carry the identity.

- **The subject's materials are the design language.** Balatro's site leans on
  its card faces, CRT texture, and joker art; the UI recedes so the game's world
  leads.
  - Our equivalent artifacts: the board, the pieces, the rule/hex/buff cards, and
    algebraic notation. The redesign pulls two of these into the chrome: board
    coordinates as the section index, and the two-mode split as the seam. The
    identity comes from chess, not from a generic template.

## 5. Stripe (stripe.com)

Referenced for one specific technique.

- **Structural devices encode real information.** Stripe's numbered steps,
  diagrams, and eyebrows always map to something true (a flow, an API sequence),
  never pure decoration.
  - Antidote we adopt: our section index uses squares on the long diagonal
    (`a1`, `c3`, `e5`, `g7`), which reads as chess and marks real order, instead
    of decorative `01 / 02 / 03`.

---

## The "AI-generated look": tells and antidotes

A specific catalog of what makes a page read as machine-default, each with the
concrete fix applied in this redesign.

| Tell | Why it reads as AI | Antidote in NerfChess |
| --- | --- | --- |
| Generic hero: centered badge + H1 + two buttons | Appears regardless of subject; no live content | Asymmetric live-board split (HeroTv) is the hero; H1 sits in the action rail, not centered; mode-field wash grounds it in the product |
| Exactly three evenly-weighted feature cards | The default "explain it" block | HowItWorks is a genuine 3-step sequence, led by a coordinate heading (`c3`), not a centered ornament; content varies per step (mode split, draft cadence, win condition) |
| Everything centered | No spatial point of view | Section headings are left-aligned with a coordinate index; hero is a 2-column split; only the seam bead is centered, on purpose |
| Default shadows and 16px radii (shadcn look) | Untouched component-library defaults | 0px corners everywhere (`[class*="rounded"]` forced to 0), 1px borders, hand-tuned plate shadows |
| Purple/indigo hero gradient | The single most overused AI accent | None anywhere. Accent is Lichess blue; the only decorative color is the two-mode seam |
| Emoji feature bullets | Placeholder iconography | Inline SVG stroke icons throughout |
| Uniform fade-in on everything | One animation applied globally | Motion varies by purpose (draft-in stagger, strike flash, reduced-motion honored); no blanket fade |
| Filler marketing copy (elevate, unlock, seamless, empower) | Says nothing specific | Concrete copy only: "A draft lands every 6 moves", "capture the king to win". H1 states the mechanic ("One game. Nerf or Buff.") not a benefit cliche |
| Loose, evenly-tracked large Inter | Default type with no treatment | Fluid scale with tracking that tightens as size grows (`.display-*`), warm-ink foreground ramp |
| Even py-8 rhythm on every band | No compositional cadence | Shared `.section-rhythm` clamp plus seam dividers give the page an intentional beat |

## Non-negotiable quality floor (all met)

- Responsive to mobile (fluid type, single-column stacks, 44px tap targets).
- Visible keyboard focus on every control (`:focus-visible` accent ring).
- `prefers-reduced-motion` respected (transitions and keyframes cut).
