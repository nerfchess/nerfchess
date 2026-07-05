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
- Status pair (`--pos` / `--warm`): the two mode hues, reclaimed as a governed
  status + celebration pair — Buff sky `--pos` for positive/good, Nerf terracotta
  `--warm` for celebration/your-turn. They reuse the seam triples so no new hue
  enters the system, and the blue accent still means "act here". Celebration
  proper uses BOTH as the seam gradient, never a single loud hue.

## Warmth without loudness

The site is dark, dense and disciplined — but warm, not cold. The trap it must
avoid is reading *bland*: a warm-ink surface under neutral-gray type, flat
elevation, and cool white hairlines is the classic "generated dark SaaS" feel.
The fixes are all neutral-and-structure, never a second accent:

- Text is a **warm off-white** (`--paper: #cbc5b9`, warm `parchment` ramp), never
  neutral `#b8b8b8` gray and never pure `#fff`.
- Depth comes from **lightness on the ink ladder**, not shadow: base panels sit on
  `--surface-panel` (`#262421`); floating menus/modals step one rung up to
  `--surface-raise` (`#302d29`); hovered rows to `--surface-hover`.
- Hairlines are a **warm edge** (`--edge` / `--edge-strong`), brightening on hover
  for interactive surfaces (opt-in `.plate-hover`), not cool white-alpha.
- Motion is one named vocabulary (`--ease-*`, `--dur-*`); ambient washes breathe
  slowly (opacity only); numbers count up and use `.tabular`. All of it is gated
  by the `data-anim` setting and `prefers-reduced-motion`.

Rule: warm the **neutrals and the structure**, never add a second brand accent.
One action accent (blue), the two mode hues as governed status, flat 0px corners.

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

## Anti-slop guardrail (do not regress)

A checklist so new surfaces stay crafted, not machine-default. Derived from a
study of what makes a page read as AI-generated (see docs/ui-research.md).

- No blue→purple/indigo/violet hero gradient, ever. No accent near Tailwind
  indigo `#6366f1` / violet `#7c3aed`; no `#3b82f6→#7c3aed` gradient.
- No gradient-filled headings. Display text stays solid warm ink.
- No candy / high-saturation green as accent or CTA (`#81b64c`). Green is a board
  theme + move-highlight only; the configurable green accent stays muted
  verdigris `#629924`.
- No glossy 3D bevels or big radii on controls. Flat metal gradient + 0px corners;
  depth from the ink ladder + warm hairline, not gloss or a blanket drop shadow.
- No confetti cannon / rainbow particles. Celebration is one-shot, <700ms, uses
  only the mode-seam palette, honors `data-anim` + reduced motion, sound off by
  default.
- No emoji as icons/bullets/streak flames — SVG (lucide) only.
- No marketing filler (elevate/unlock/seamless/empower/effortless/"Trusted by").
  Concrete chess copy only.
- No global fade-in-on-scroll or scroll-hijack. Motion ties to chess events;
  functional durations stay under ~320ms.
- No three identical feature cards in a row. Author asymmetry; order sections with
  the `a1/c3/e5` coordinate index.
- No cool-gray regressions or pure `#fff`/`#000`. Warm ink/parchment tokens only;
  body text warm, never neutral `#b8b8b8`.
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
