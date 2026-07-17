# NerfChess Design System

The single visual and interaction contract for every route. Written during the 2026-07 full-product redesign. Any page that deviates from this document is wrong, and either the page or this document must change in the same PR.

## 1. Identity pillars (keep, never dilute)

- Dark nebula atmosphere: warm near-black ink surfaces with a faint top-warm, bottom-cool wash. Never flat gray, never pure black outside the "void" theme.
- Parchment text: the warm off-white ramp (`--paper`, `parchment-*`). Never neutral gray text on warm surfaces.
- Gold highlights: gold is the color of reward, rank, and emphasis (tier brass, achievements, podium, "featured"). The configurable `--accent` (default sky blue) owns "act here".
- Mode duality as structure: Buff sky blue vs Nerf terracotta coral meeting at the seam. Every surface that is mode-specific carries its mode hue; nothing else may use those hues.
- Chess-piece artwork and the competitive-fantasy voice: pieces, sigils, and card tiers are the decoration. No stock illustration, no emoji as UI.
- Dramatic game effects that never cost readability: the board stays legible through every animation.

## 2. Color roles

| Role | Token | Use |
|---|---|---|
| Page | `ink-900` + html::before wash | The only page background |
| Panel | `--surface-panel` (`.plate`) | Cards, rails, lists |
| Raised | `--surface-raise` (`.plate-raised`) | Menus, modals, hovered rows |
| Edge | `--edge` / `--edge-strong` | All hairlines. Never `white/10` alpha borders in new code |
| Body text | `parchment` 100-300 | Content |
| Muted text | `parchment-400` | Labels, captions. Floor: never below `parchment-500` |
| Act | `--accent` (`gold` token) | Primary buttons, links, focus, selected |
| Highlight | `gold.leaf` at brass hue, `--sun` | Rank, reward, featured, celebration |
| Positive | `--pos` (buff sky) | Success, rating up, "Live" |
| Danger | `oxblood` | Errors, resign, destructive |
| Buff identity | `mode.buff` / `buffGlow` | Buff-mode surfaces, chips, seams only |
| Nerf identity | `mode.nerf` / `nerfGlow` | Nerf-mode surfaces, chips, seams only |
| Tiers | `.tier-1..10` + `.tier-bg-*` | Card tiers everywhere, no exceptions |

Rules:
- No new colors. If a design wants a color not in this table, the design is wrong.
- Mode hues never mean success/failure. Positive/danger never brand a mode.
- One accent-colored primary action per view region. Everything else is quiet.

## 3. Typography

Faces: `--font-display` (Inter) for headings and numbers that matter, `--font-body` (Noto Sans) for content, `--font-mono` for ids, clocks, and coordinates.

Scale: the fluid ramp `--step-0..5` only. No ad-hoc `text-4xl` in new code.

Hierarchy is weight + size + color, in that order. Never letter-spacing alone.

Minimum sizes (hard floor):
- Body and interactive text: 13px (`text-[13px]`) desktop, 14px mobile.
- Captions and labels: 12px. The 9-10px smallcaps pattern is retired sitewide.
- `.smallcaps` / `.eyebrow` are display devices for section headers only, at 11px minimum with `tracking-[0.14em]` maximum, never for data, names, or actions.

Numbers that update (clocks, ratings, counts) always `tabular-nums`.

## 4. Spacing and density

- Base unit 4px. Panel padding: 12px compact, 16px default, 20px only for hero moments. The `p-2 px-3` plate default stays.
- Section rhythm on marketing/landing surfaces: `--rhythm-section`. App surfaces (lobby, game, TV) are dense: they are tools, not brochures.
- Density rule: a list row is 40-48px tall, a data table row 36-40px. Empty air is not hierarchy.
- Max content width 1200px app, 1100px reading. The board column caps at 720px.
- No giant empty sections. If a region can be empty, it gets a designed empty state (see 8) sized to its content, not to the viewport.

## 5. Surfaces and geometry

- Crisp 1px corners everywhere (existing global rule). True circles only for avatars and status dots.
- Elevation by lightness (panel -> raise), shadow only via `shadow-plate` for floating layers. No glassmorphism: `backdrop-blur` is banned outside the two existing board splash moments.
- `.plate` is the only card. Variants: `.plate-raised`, `.plate-hover`, `.plate-warm`, `.rail-panel`, `.corner-cut`. New surface styles are not invented per page.
- Dungeon material set (2026-07 full-dungeon pass): `.dgn-slab` (carved stone, for monumental surfaces: modals, podium, chamber panels — never every card), `.dgn-rivets` (iron corner rivets, composable), `.rune-divider` (ornament rule), `.torch-pool` (ambient corner ember). The draft chamber's `dgn-*` vocabulary and `DungeonMenu.css` slabs are the reference implementations; new themed surfaces reuse these instead of inventing parallel treatments.
- Glow is an event, not a state: `shadow-leaf/nerf/buff` fire on hover, selection, or celebration, never as a resting style. Constant glow is banned. Exception: the faint resting seam/ember accents baked into the dungeon material classes above (they are material, not state).

## 6. Motion

Vocabulary: `--ease-out` for entrances and hovers, `--ease-io` for movement between states, `--ease-spring` only for reveal, seal, and victory. Durations `--dur-1..3` (120/200/320ms); anything longer is a choreographed game effect with its own budget (see the passive effect spec).

Rules:
- Respect `data-anim` (off/fast) and `prefers-reduced-motion` in every new animation, including game effects. Reduced motion means a short fade plus a persistent indicator, never zero feedback.
- Animate `transform` and `opacity` only, except sanctioned board effects.
- Entrances stagger at 24ms steps (`.stagger-in`), capped at 8 items.
- Nothing loops forever except the three ambient effects (flicker, sigil, bob) and clock urgency.
- An animation may never delay authoritative state or block input after state resolves.

## 7. Components

- Buttons: `.btn-leaf` primary (one per region), `.btn-ghost` secondary, plain link tertiary, `.btn-cursed` destructive (Resign/Delete/Leave/Decline/Remove), `.btn-gold` reserved for reward/prestige moments, `.btn-glass` for emotional-peak commits. Loading = `.btn-busy` + a `.rune-loader` in the label. Min touch target 44x44 mobile, 36px desktop. All buttons `.press`. Bespoke one-off button styles are retired: every new button picks from this set.
- Tabs: underline style (current), 13px+ label, active = parchment-50 + accent underline, inactive = parchment-300. Same component on every route.
- Chips/badges: 12px, `.tier-bg-*` for tiers, mode chips for Buff/Nerf, `LIVE` badge = pos dot + label, `HOUSE BOT` badge = parchment-400 outline chip. House bots are labeled every single place a name renders.
- Lists and tables: row hover `--surface-hover`, dividers `--edge`, never zebra. Rank/rating right-aligned tabular.
- Player identity unit: avatar (or piece glyph) + name + rating (+ provisional "?") + badges. One shared component, used by lobby rows, TV, game HUD, leaderboard, profiles, community.
- Forms: inputs on `ink-900/60`, `--edge` border, accent focus ring `focus-visible:outline-2 outline-offset-2`.

## 8. System states (every async surface implements all five)

1. Loading: skeleton in the exact final geometry (board skeleton pattern). Never spinners taller than 24px, never full-page spinners.
2. Empty: one sentence of what would be here + one action to change that. Sized to content. Piece-glyph accent, not sad-face illustration.
3. Error: what failed in plain words + Retry + a way out (Back to lobby). Never a dead end.
4. Disconnected/reconnecting: the existing ConnectionBanner pattern everywhere; board dims 20% but stays visible; never unmount live state during reconnect.
5. Recovered: silent when fast (<2s), single toast when slow. Never modal.

## 9. Navigation

- Top nav: Play, Watch, Community, Leaderboard, Rules + search, inbox, alerts, identity. Active route always marked. Identical on every page including game and TV (game pages may compact it, never replace it).
- Footer only on marketing/reading pages, never on app surfaces.
- Every player name links to `/u/[username]`. Every game id links to `/game/[id]`. Every card name links to its codex page. No dead nouns.
- Mobile: bottom action bar on app surfaces (lobby quick match, game actions), bottom sheets for pickers, drawers for rails. Breakpoints: rails stack below `sm` (640), game rail becomes bottom section below `md`.

## 10. Accessibility

- AA contrast minimum for text and interactive glyphs (parchment-400 on panel is the floor; check anything dimmer).
- Focus visible on everything interactive (accent 2px outline, 2px offset).
- All icon-only buttons carry `aria-label`. Status changes announce via `role="status"` / `aria-live="polite"` (existing patterns extend).
- Keyboard: move-list scrubbing with arrow keys, tab order follows visual order, modals trap focus and close on Escape.
- Hit areas: 44px mobile, and interactive rows are fully clickable, not just their text.

## 11. Voice

- Sentence case everywhere, including buttons ("Find a match", not "FIND A MATCH"). Allcaps survive only in `.eyebrow` section labels and the LIVE/HOUSE BOT badges.
- Copy is confident and concrete: "A draft lands every 5 moves", never marketing fluff.
- Numbers are shown, not narrated: "312 online", not "lots of players online".

## 12. Route-level contracts

Every route redesign must produce: desktop + mobile screenshots, all five system states implemented, zero new colors, zero sub-12px text, House Bot labeling, linked player names, and a pass through this checklist recorded in the PR description.
