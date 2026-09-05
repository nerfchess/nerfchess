# NerfChess design direction

One locked aesthetic so every surface reinforces the same identity instead of
drifting. Grounded in a study of lichess and chess.com (see docs/ui-research.md)
and a catalog of the tells that make a site read as AI-generated. The 2026-09
pass stripped the decorative layer entirely: what is described below is a flat,
dense, single-accent system.

## Identity

A real chess tool: warm, dense, built by people who play, not a glossy SaaS
landing page. Lichess is the craft benchmark. Our one structural difference from
lichess is the reason the product exists: NerfChess is a single game split into
two opposed modes, Nerf (secret handicaps) and Buff (drafted power-ups). That
duality is the identity, and the design should make it felt, not just stated.

## The system: flat boxes on a flat page

There is no signature ornament and no material. A page is a flat background with
flat boxes sitting on it, and every box is the same box: panel fill, one hairline
border, 7px corners, no shadow. Hierarchy comes from size, weight, colour and
whitespace, in that order, and from nothing else.

What that rules out, permanently: the mode seam and its bead, the header seam
edge, the hero mode-field wash, torch pools, rune dividers, carved-stone slabs
and rivets, chamfered corner cuts, gilt edges, letterpress mastheads, and the
whole dungeon lobby/menu/gate stylesheet set. All of it is gone from `globals.css`
and from every route; a new surface reuses `.plate` rather than reintroducing a
parallel treatment.

The two mode hues survive, but as content rather than decoration: a Buff surface
carries Buff blue on a border, a chip or a label, and a Nerf surface carries Nerf
red the same way. They never meet in a gradient.

## Color roles (by meaning, never by shade)

- Surfaces: warm ink. `#161512` page, `#262421` panels. Neutrals stay warm,
  never a sterile 0deg gray.
- Accent (links, primary action): Lichess blue `#3692e7` / hi `#4a9fee`.
  Configurable via the accent-color setting (rgb triples on `:root`).
- Mode identities (fixed, survive accent swaps): Nerf terracotta `#c4785f`,
  Buff sky `#5b9bd4`. Borders, chips and labels only.
- Semantic: oxblood `#c0413b` danger, verdigris `#629924` success.
- Tiers: the muted sage to blood ramp for rule difficulty (`.tier-*`).
- Status pair (`--pos` / `--warm`): a governed status + celebration pair, `--pos`
  for positive/good, `--warm` for celebration/your-turn. No new hue enters the
  system, and the blue accent still means "act here".

## Quiet, not bland

The site is dark, dense and disciplined. The trap it must avoid is reading
*generated*: flat elevation, cool white hairlines, and a shadow under everything.
The fixes are structural, never a second accent:

- Text comes from the `--text-*` ramp (`#bababa` body, `#cccccc` headings,
  `#8c8c8c` secondary, `#707070` muted), never pure `#fff`.
- Depth comes from **lightness on the background ladder**, not shadow: boxes on
  `--bg-panel`, floating menus and modals one rung up on `--bg-raised`.
- Hairlines are `--border-subtle`, brightening to `--edge-strong` on hover for
  interactive boxes (opt-in `.plate-hover`).
- Motion is one named vocabulary (`--ease-*`, `--dur-*`), gated by the
  `data-anim` setting and `prefers-reduced-motion`.

Rule: one action accent (blue), the two mode hues as governed identity, no second
brand colour, and no material.

## Type

- Faces: Noto Sans for both the display and body roles (the UI face lichess
  ships), so weight does the hierarchy. Utility/data in the mono face.
- One fluid scale, defined once as `--step-0` through `--step-5`, so headings
  pull from a shared ramp instead of ad-hoc Tailwind sizes. Utilities:
  `.display-1/2/3`, `.lead`.
- Tracking tightens slightly as display size grows. Hierarchy comes from size and
  weight and is kept restrained everywhere, the hero included.

## Structure

- Section labels are plain bold headings at the body size. The chess-coordinate
  section index (`a1`, `c3`, `e5`) and the eyebrow/kicker/smallcaps utilities that
  carried it are retired.
- Shared vertical rhythm: `.section-rhythm` (`--rhythm-section`) on marketing
  bands so the page breathes evenly. App surfaces are dense instead.
- Corners: 7px on a box, 3px on a button, circles only for avatars and dots.
  Borders 1px. Transitions ~120-160ms. Reduced motion respected.

## Craft floor (keep)

1. Flat buttons: primary is a solid accent fill with a white label, default is
   the raised surface with a hairline border, danger is the same shape in red.
   Three tones, no material, no gradient, no glint.
2. Visible `:focus-visible` ring on every control (accessibility + anti-AI tell).
3. 8pt spacing rhythm, measured contrast, SVG icons (never emoji bullets).

## AI tells guarded against

Purple/indigo gradients (none, keep it); untouched shadcn radius/shadows (n/a,
we are flat); centered badge+H1+two-buttons hero (ours is an asymmetric live
board split with a compact action column beside it); exactly-three
uniform feature cards (HowItWorks is a real 3-step sequence); emoji
bullets (SVG icons); generic marketing copy (concrete, no elevate/unlock/
seamless); over-animation (vary timing by purpose, do not fade everything alike).

## Anti-slop guardrail (do not regress)

A checklist so new surfaces stay crafted, not machine-default. Derived from a
study of what makes a page read as AI-generated (see docs/ui-research.md).

- No blue→purple/indigo/violet hero gradient, ever. No accent near Tailwind
  indigo `#6366f1` / violet `#7c3aed`; no `#3b82f6→#7c3aed` gradient.
- No gradient-filled headings. Display text stays solid warm ink.
- No candy / high-saturation green as accent or CTA (`#81b64c`). Green is a board
  theme + move-highlight only; the configurable green accent stays muted
  verdigris `#629924`.
- No glossy 3D bevels, gradients, or big radii on controls. Flat fill + 3px
  corners; depth from the background ladder + a hairline, never gloss or a shadow.
- No confetti cannon / rainbow particles. Celebration is one-shot, <700ms, uses
  only the mode palette, honors `data-anim` + reduced motion, sound off by
  default.
- No emoji as icons/bullets/streak flames — SVG (lucide) only.
- No marketing filler (elevate/unlock/seamless/empower/effortless/"Trusted by").
  Concrete chess copy only.
- No global fade-in-on-scroll or scroll-hijack. Motion ties to chess events;
  functional durations stay under ~320ms.
- No three identical feature cards in a row unless the three really are a
  sequence (How it works is a genuine 3-step, and says so).
- No pure `#fff`/`#000` and no colour outside the token table. Text comes from
  the `--text-*` ramp, surfaces from the `--bg-*` ladder.
- Do NOT add a second global brand accent to "add warmth". Reuse the mode
  terracotta/sky strictly as governed status/celebration colors.

## Change log

- 2026-07-05 (earlier): metal buttons + global focus-visible ring.
- 2026-07-05: mode-seam signature (dividers, header edge, hero field); fluid type
  scale + display utilities; chess-coordinate section index; shared section
  rhythm; landing hero H1.
- 2026-07-05 (approachability pass): warm the neutrals and the structure without
  touching the single accent — warm `--paper`/`parchment` text ramp; ink-ladder
  elevation (`--surface-panel/raise/hover`) for menus, modals and hovered rows;
  warm hover-reactive hairline (`--edge`/`--edge-strong`, opt-in `.plate-hover`);
  governed `--pos`/`--warm` status pair; motion vocabulary (`--ease-*`/`--dur-*`);
  breathing hero aura (opacity only, gated); `.tabular` figures + `.press` /
  `.hover-lift` / `.stagger-in` utilities. Recolored the GameOver win beat to the
  Nerf→Buff seam with a warm scrim and a rating count-up. Added a shared warm
  `EmptyState` (applied to history + inbox) and a dismissible first-run welcome.
  Codified the anti-slop guardrail above. Visual verification of the warmed
  surfaces still needs a preview deploy; the app cannot be fully run in the build
  environment (Cloudflare bindings), so changes were kept to safe token/CSS edits
  plus `tsc` + `next build` validation.
- 2026-09 (flattening pass): removed the mode seam, the dungeon material set
  (slabs, rivets, torch pools, rune dividers, corner cuts, gilt edges, the gate
  button and the dungeon lobby/menu stylesheets), the `--btn-*` button material
  contract, and the smallcaps/eyebrow/kicker/coordinate-index display devices.
  `.plate` became the one box (panel fill, 1px border, 7px, no shadow); buttons
  collapsed to primary / default / danger; the landing hero became a live board
  beside three stacked actions; the lobby became a tab row over a grid of flat
  time-control tiles; Settings became a two-column preferences layout.
