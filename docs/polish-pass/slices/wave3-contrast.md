# Wave 3, group contrast

Contrast and link affordance, site-wide, as one class. Inputs: the wave 2 hand-offs (wave2-account REQUESTS on `.btn-leaf`, wave2-content hand-offs for /settings, /tv and link-in-text-block, wave2-social REQUEST 3). All runs against the shared :3000 dev server through `scripts/polish/heavy.sh`, Playwright on the bundled Chromium, axe tags wcag2a, wcag2aa, wcag21a, wcag21aa. A previous agent on this group was killed by a container restart; its uncommitted edits were reviewed hunk by hunk, kept, re-measured and committed here.

No new colours: every fix moves a fill or a label onto a rung that already exists in the palette. No shadows, no glow, no motion changes.

## Results

| # | Finding | Status | Before | After | Commit |
|---|---|---|---|---|---|
| 1 | `.btn-leaf` white label, midnight hover | DONE | rest fixed in 757e679 (5.25 dark, 4.73 midnight, 6.84 light); midnight hover lift 4.17:1 on rung `51 118 186` | midnight takes the dark scheme's existing dim rung `42 111 176` (globals.css and `BLUE_ACCENT_MIDNIGHT.rgbDim`, which applyUiPrefs stamps): rest 5.25, hover 4.63 in dark and midnight, light 6.84 rest and 6.12 hover (`evidence/wave3/contrast-probe-after.json`, painted fill with the brightness filter applied) | 012edf9 |
| 1b | Other white-on-accent fills built outside ui/Button | DONE | lobby Nerf/Buff filter selected segment on `--accent` (3.26:1 dark); selected cell in MoveList and MoveStrip on `--accent` (same pair) | all three use `--accent-dim-rgb`, the same rung as the primary button | 012edf9 |
| 1c | Lobby mode button rating at opacity-80 on the primary fill | DONE | 3.98:1 at 12px (`#d4e2ef` on `#2a6fb0`, /lobby 1280 dark, `wave3-contrast-after-user.json`) | full strength white, 5.25:1; /lobby 0 nodes, 390 and 1280, dark and light, user and signed-out | 012edf9 |
| 2 | link-in-text-block on /community, /friend, /profile/edit, /mod, /mod/cards, /mod/stats | DONE (wave 2) | see wave2-social 7, wave2-account 6, wave2-mod 6 | re-verified: 0 nodes on all six at 390 and 1280, dark and light, signed-out, user and mod (`wave3-contrast-after-signedout.json`, `-after-user-3.json`, `-after-mod.json`); site-wide sweep below | 9fd8e4f, 7a8bfc2, e9a3756 |
| 3 | /settings disabled rows (opacity-40/70) | DONE (wave 2) | 7 nodes | re-verified 0 nodes at 390 and 1280, dark and light, signed-out and user | 1c07590 |
| 3b | PieceColorPicker grid at opacity-60 while a Lichess set is chosen | DONE | the whole grid, labels included, at 0.6 | only the swatch dims; the labels are text on live buttons and keep full `text-parchment`; the note above the grid still says why the colours do not apply | 012edf9 |
| 4 | /tv aria-prohibited-attr at TvView.tsx ~552 | DONE (wave 2) | 1 node at 390 | the loading block is `role="status"` with an sr-only name; 0 violations on /tv at 390 and 1280, dark and light, signed-out and user | e9a3756 |
| 5 | Paper mode labels (`text-mode-nerfGlow`, `buffGlow`) | DONE | /community light, 12px Nerf mode label; `--accent-nerf-hi-rgb 209 88 82` 4.02:1 on white, buff-hi 4.26:1 | light's `-hi` rungs step down like its gold-hi does: nerf onto the existing scorched deep rung `138 46 44` (8.37 white, 7.04 page), buff onto light's gold-hi `20 88 159` (7.18, 6.04); /community 0 nodes | 012edf9 |
| 6 | Paper positive glow (`text-verdigris-glow`) | DONE | `98 153 36` 3.44:1 on white; the achievements unlock toggle's `bg-verdigris/10` wash held it on the AA line | light's positive `-hi` is the base green `76 122 28` (5.11 on white); the toggle drops the wash, keeping the green border | 012edf9 |
| 7 | /achievements rarity filter counts at opacity 0.85 | DONE | 5 nodes, light, 390 and 1280 | full strength, 0 nodes | 012edf9 |
| 8 | /friend setup | DONE | 3 nodes dark (selected time on `--accent` 3.26, unselected Nerf label at /80 3.68, selected stake `--accent` on raised 4.08), 1 node light (stake 4.25) (`wave3-contrast-before-detail.json`) | selected labels take `--accent-hi`, the emphasis rung; the Nerf and Buff labels lose the /80; 0 nodes at 390 and 1280, dark and light | 012edf9 |

## Regression checks

- `/community`, `/friend`, `/tv`, `/analysis` and the game route, user, 390 and 1280, dark and light: 0 violations (`wave3-contrast-after-user-3.json`). One /community 390 dark cell errored on a mid-scan navigation; the other three cells of that route and the earlier signed-out run are clean.
- `/profile/edit`, `/settings`, `/achievements`, `/contact`, `/lobby`, `/play`, user and signed-out: 0 violations (`wave3-contrast-after-user.json`, `-after-user-2.json`, `-after-signedout.json`).
- Mod: `/mod`, `/mod/cards`, `/mod/stats`, `/mod/stats/all`, 390 and 1280, dark and light: 0 (`wave3-contrast-after-mod.json`).
- The `-hi` rung changes are paper only. Dark and midnight keep their lighter `-hi` rungs (emphasis is brighter on a dark ground). The glow classes that paint fills (`bg-verdigris-glow` dots, `bg-mode-*Glow` bars) now read one step deeper on paper, which is the same direction light's gold-hi already took.

## Site-wide sweep

"Anywhere else polish:axe finds it": `/tournaments`, `/leaderboard`, `/u/polish_user`, `/about`, `/puzzles`, `/codex`, `/updates` (`wave3-contrast-sweep.json`) and `/inbox`, `/clubs`, `/faq`, `/guide`, `/stats` (`wave3-contrast-sweep-b.json`, a re-run of the cells the first run lost to a dev server restart), signed-out, 390 and 1280, dark and light: 0 violations, no link-in-text-block and no color-contrast anywhere. An `--routes all` run was tried twice and stopped: its warm-up of 51 routes coincided with the shared dev server restarting, so it was split into the two smaller runs above. With the per-route runs in the table, every route that wave 2 named plus the twelve above are clean.

## Left

- `.btn-leaf` still carries its inset bevel `box-shadow`. That predates this pass and is a design-system decision, not a contrast one; not touched here.
- Card effects (`src/components/effects/**`) were not scanned or touched: other agents own them this wave.
