# NerfChess design direction

One locked aesthetic so every surface reinforces the same identity instead of
drifting. Grounded in deep research of lichess and chess.com and a study of what
makes a site read as AI-generated.

## Honest starting point

The site is already NOT generic-AI: it has a hand-built token system (warm-ink
surfaces, parchment text, Lichess-blue accent, distinct Nerf-terracotta and
Buff-blue mode identities), flat square corners, custom keyframes, and a
live-board hero with real data. It avoids almost every common AI tell. This
direction sharpens that identity toward lichess-grade craft rather than
replacing a coherent system.

## Identity

Utilitarian chess tool, warm and dense, not a glossy SaaS landing page. The
personality is "a real product built by people who play chess," the exact
quality lichess projects. Our own twist: the two-mode split (Nerf vs Buff) gives
us a second and third accent the neutral lichess palette lacks.

## Tokens

- One warm master hue tints the neutrals (already true: ink #161512 page,
  #262421 panels). Keep neutrals warm, never a sterile 0deg gray.
- Accent: Lichess blue #3692e7 (configurable). Mode identities fixed: Nerf
  #c4785f terracotta, Buff #5b9bd4 sky. Semantic: oxblood danger, verdigris
  success. Name colors by MEANING, not shade.
- Corners: the site commits to 0px (sharp/flat). This is a deliberate non-default
  choice, the opposite of the AI shadcn 16px, so keep it. (Lichess uses 7px; we
  intentionally diverge.)
- Borders 1px, transitions ~150-160ms, everywhere, for one-team consistency.
- Type: Inter display + Noto Sans body (lichess uses Noto Sans + Roboto-300
  headings). Hierarchy from weight and size, kept restrained.

## Craft details to adopt from lichess (low-risk, high-payoff)

1. Metal buttons: a subtle 2-stop vertical gradient (about 4% lightness delta)
   plus a soft outer shadow and an inset top highlight, with hover lifting the
   gradient. Turns flat buttons into pressable, physical controls. THIS PR.
2. Deliberate interactive states: a visible :focus-visible ring for keyboard
   users on every control (accessibility floor and an anti-AI tell fix). THIS PR.
3. Measured contrast, 8pt spacing rhythm, reduced-motion respected (already
   partly true).

## AI tells to keep guarding against

Purple/indigo gradients (we have none, keep it that way); untouched shadcn
radius/shadows (n/a, we are flat); centered badge+H1+two-buttons hero (ours is an
asymmetric board split, keep it); exactly-three uniform feature cards (our
HowItWorks is a real 3-step sequence, defensible, but vary internal density);
emoji feature bullets (we use SVG icons, keep it); generic marketing copy (ours
is concrete, keep banning elevate/unlock/seamless); over-animation (vary timing
by purpose, do not fade everything identically).

## Change log

- 2026-07-05: metal buttons + global focus-visible ring (this PR). Further passes
  (typography hierarchy, spacing rhythm, per-page audits) require a preview
  deploy to verify visually, since the board and pages cannot be run in the build
  environment.
