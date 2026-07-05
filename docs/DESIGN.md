# NerfChess design direction

One locked aesthetic so every surface reinforces the same identity instead of
drifting. Grounded in a study of lichess and chess.com (see docs/ui-research.md)
and a catalog of the tells that make a site read as AI-generated.

## Identity

A real chess tool: warm, dense, built by people who play, not a glossy SaaS
landing page. Lichess is the craft benchmark. Our one structural difference from
lichess is the reason the product exists: NerfChess is a single game split into
two opposed modes, Nerf (secret handicaps) and Buff (drafted power-ups). That
duality is the identity, and the design should make it felt, not just stated.

## Signature: the mode seam

The site's one memorable element and its single deliberate risk. Everywhere two
sections meet, a hairline runs warm-Nerf on the left into cool-Buff on the right,
with a small flat diamond bead sitting on the join. It appears as:

- section dividers on the landing page (`.mode-seam`),
- the header's bottom edge (`.seam-edge-b`), warm to cool across the nav,
- a faint two-corner wash behind the hero (`.mode-field`).

Why it earns its place: it is derived entirely from the product (the two modes,
the two mode colors already in the system), it reads as one idea repeated with
discipline rather than decoration, and it gives the otherwise-uniform dark field
a spine. Spend the boldness here; keep everything else quiet.

Rule: the seam is the only place the two mode hues touch neutral geometry. Do not
scatter terracotta/sky tints elsewhere or the signature stops signifying.

## Color roles (by meaning, never by shade)

- Surfaces: warm ink. `#161512` page, `#262421` panels. Neutrals stay warm,
  never a sterile 0deg gray.
- Accent (links, primary action): Lichess blue `#3692e7` / hi `#4a9fee`.
  Configurable via the accent-color setting (rgb triples on `:root`).
- Mode identities (fixed, survive accent swaps): Nerf terracotta `#c4785f`,
  Buff sky `#5b9bd4`. These and only these feed the seam.
- Semantic: oxblood `#c0413b` danger, verdigris `#629924` success.
- Tiers: the muted sage to blood ramp for rule difficulty (`.tier-*`).

## Type

- Faces: Inter display (`--font-display`), Noto Sans body (the UI font lichess
  ships). Utility/data in the mono face.
- One fluid scale, defined once as `--step-0` through `--step-5`, so headings
  pull from a shared ramp instead of ad-hoc Tailwind sizes. Utilities:
  `.display-1/2/3`, `.lead`.
- Tracking tightens as display size grows (`-0.021em` at `--step-5`), which is
  what stops large Inter from reading as a loose default. Hierarchy comes from
  size and weight, kept restrained everywhere but the hero.

## Structure

- Section index by chess coordinates on the board's long diagonal: `a1`, `c3`,
  `e5`, `g7` (`.coord-index` + `.eyebrow`). A numbering device that is genuinely
  from chess and encodes real order, used in place of the generic `01 / 02 / 03`.
- Shared vertical rhythm: `.section-rhythm` (`--rhythm-section`, a single fluid
  clamp) on every marketing band so the page breathes evenly.
- Corners: 0px everywhere. A deliberate non-default choice, opposite the shadcn
  16px. Borders 1px. Transitions ~150-160ms. Reduced motion respected.

## Craft floor (keep)

1. Metal buttons: primary carries a two-stop vertical gradient plus inset top
   highlight and soft drop, so it reads as a pressable control (`.btn-leaf`).
2. Visible `:focus-visible` ring on every control (accessibility + anti-AI tell).
3. 8pt spacing rhythm, measured contrast, SVG icons (never emoji bullets).

## AI tells guarded against

Purple/indigo gradients (none, keep it); untouched shadcn radius/shadows (n/a,
we are flat); centered badge+H1+two-buttons hero (ours is an asymmetric live
board split, now anchored by an H1 and the mode-field wash); exactly-three
uniform feature cards (HowItWorks is a real 3-step sequence, defensible, but it
is indexed and led by a coordinate heading, not a centered ornament); emoji
bullets (SVG icons); generic marketing copy (concrete, no elevate/unlock/
seamless); over-animation (vary timing by purpose, do not fade everything alike).

## Change log

- 2026-07-05 (earlier): metal buttons + global focus-visible ring.
- 2026-07-05 (this PR): mode-seam signature (dividers, header edge, hero field);
  fluid type scale + display utilities; chess-coordinate section index; shared
  section rhythm; landing hero H1. Visual verification of the seam bead,
  gradients, and fluid scale still needs a preview deploy, since the app cannot
  be run in the build environment.
