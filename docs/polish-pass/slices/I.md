# Slice I: Tier A chrome motion (wave 1)

Evidence: `docs/polish-pass/evidence/I/before/` and `after/` (frame strips at full, fast, off and reduced on the new dev harness `/dev/motion`, written by `scripts/polish/i/strips.sh`), plus `after/chrome-probe.json` (regression probe `scripts/polish/i/chrome-probe.ts`, 14 checks at Animations normal and off). Guard regression tests: `scripts/polish/i/anim-props-test.ts` and `scripts/polish/i/reduced-motion-test.ts` (each builds a before tree from b30d21c and an after tree from the working tree; the gate fails on the first and passes on the second).

Note on the before dock strips: the harness did not load DraftOverlay.css when they were taken, so they show only the framer slide, not the .dock-arrive layer that stacked on top of it in a game. The after strips and the probe load it.

## Shared primitives (globals.css, one motion per idea)

All on `--dur-*` and `--ease-*`, scaled by a new `--tempo` (1, 0.6 under `data-anim="fast"`), gated by `html[data-anim="off"]` (which is also where reduced motion and the opted-in OS flag land). Enter on dur-2 ease-out, mirrored exit on dur-1 ease-io via `data-leaving`. They use the individual `translate` / `scale` / `rotate` properties so they compose with a positioning transform.

| Class | Use |
|---|---|
| `.m-pop` (+ `--up`, `--start`, `--end`, `--m-origin`) | popovers, menus, dropdowns: grow from the trigger |
| `.m-scrim` | the dim behind a modal or drawer |
| `.m-modal` | dialogs |
| `.m-toast` | toasts and board notices |
| `.m-enter`, `.m-list` | one element arriving; a list whose first 8 children stagger 30ms |
| `.m-chevron` (+ `--quarter`), `data-open="true"` | disclosure chevrons |
| `.dot-live` | the one live-status dot |
| Tailwind `motion-on:` / `motion-off:` | data-anim variants replacing the OS-only `motion-safe:` / `motion-reduce:` |

`src/lib/useExitPresence.ts` keeps a closing element mounted for its exit (unmounts at once with motion off). `src/lib/motion.ts` mirrors the tokens for framer and timers (`DUR`, `EASE`, `dur()`, `framerTransition()`) and installs the framer gate (`MotionGlobalConfig.skipAnimations` follows `data-anim`) when imported. Tailwind's bare `transition` / `duration` / `ease` defaults now resolve to the tokens (about 280 call sites move from 150ms Tailwind easing to dur-1 ease-out).

## Rows

| Row | Status | Evidence | Note |
|---|---|---|---|
| F009 | DONE | after/chrome-probe.json (F009) | `html { scrollbar-gutter: stable }` |
| F190 | PARTIAL | after/chrome-probe.json (F190), reduced-motion-test.ts | Variants and guard landed; globals.css OS queries removed (ending acts, clock separator); PresenceBadge and TourCoachOverlay migrated. 22 grandfathered sites in other slices' files, see REQUESTS R3 |
| F194 | DONE | after/dock-*.png, after/chrome-probe.json (F194) | One entrance per row: .dock-arrive on the newest own card, .m-enter otherwise; framer slide and the box-shadow/background dock-pocket-flash dropped from DockRow |
| F196 | PARTIAL | globals.css `.m-pop` | Header search panel moved onto `m-pop-in` (clip-path reveal and search-fade gone). Other popovers are in slice A/D/K files, REQUESTS R4 |
| F197 | PARTIAL | after/presence-*.png, chrome-probe (F190) | `.dot-live` is the one idiom (echo now inherits the dot's radius); PresenceBadge migrated. Other sites REQUESTS R5 |
| F198 | TODO | | All three switches are in other slices' files (A, settings SettingsPanel.css, C). Proposal P-I1 |
| F199 | PARTIAL | after/chevron-*.png, chrome-probe (F199) | `.m-chevron` on dock rows, dock section header and settings PickerDisclosure. Others REQUESTS R6 |
| F202 | DONE | grep in commit message | Deleted hover-lift, row-in, aura-breathe, cta-shine, Geometry Dash block, starfield family, tailwind rise/seal and their off-rules, the tv-frame backdrop off-rule; no runtime class names reference them (draft-in is still used by BuffCard and kept) |
| F186 | PARTIAL | src/lib/motion.ts | Gate built; it takes effect once an always-mounted module imports it, REQUESTS R1. check-reduced-motion warns until then |
| F188 | PARTIAL | tailwind.config.ts, globals.css | Tailwind defaults and globals.css literals on tokens. Draft CSS is slice J |
| F189 | PARTIAL | globals.css | globals.css `cubic-bezier(0.16,1,0.3,1)` replaced by `--ease-out`. REQUESTS R7 |
| F191 | DONE (my files) | after/eval-*.png, after/tour-*.png, chrome-probe, anim-props-test.ts | EvalBar/EvalStrip fill by scaleY/scaleX; tour spotlight no longer tweens geometry (ring lands per step with .m-pop); header search clip-path gone; check-anim-props now fails on transition all / layout transitions in CSS and TSX. Gate is clean tree-wide |
| F192 | PARTIAL | anim-props-test.ts | TourCoachOverlay fixed; BuffCard/NerfCard baselined, REQUESTS R2 |
| F193 | PARTIAL | globals.css | btn-ghost/btn-glass, input-rune and nav-icon-btn no longer transition box-shadow or background; the input focus halo removed (no glow). btn-leaf / btn-cursed still ease `filter: brightness` on hover (needs a pre-baked overlay, wave 2) |
| F195 | PARTIAL | after/god-*.png, after/draft-*.png, chrome-probe (F195) | `.m-toast` with a mirrored exit; DraftNotice and GodPanelNotice migrated. Merge of the two components left for wave 2 (they differ in stacking and copy). Other toasts REQUESTS R8 |
| F161 (guard) | TODO | | check-shadows guard not started |
| Tier A: Dock rows and pocket | DONE | after/dock-* | as F194 |
| Tier A: Tutorial and guide steps | DONE | after/tour-* | spotlight: no geometry tween, no glow, no shadow-xl, scrim fades once, card and ring pop per step |
| Tier A: Progress and eval bars | PARTIAL | after/eval-* | EvalBar done; achievements/analysis bars are slice E |
| Tier A: Presence, spectator and live pills | PARTIAL | after/presence-* | PresenceBadge done; SpectatorPill NO-CHANGE (transition-colors only, now on tokens); other dots R5 |
| Tier A: Dead motion CSS | DONE | | as F202 |
| Tier A: Header search panel | PARTIAL | | motion unified; exit needs SiteHeader (slice A) to keep it mounted with useExitPresence, R4 |

Removed the settings chevron strips (the clip selector pointed below the viewport in both before and after runs); the probe checks that chevron instead.

## REQUESTS

- R1 (slice A, `src/components/SettingsBootstrap.tsx`, F186): add `import "@/lib/motion";` at the top (side-effect import installs the framer gate). Then slice I turns the check-reduced-motion warning into a failure.
- R2 (BuffCard.tsx:177 and NerfCard.tsx:137, integrator or owner): replace `transition-all duration-200` with `transition-[opacity,transform] duration-2` and `motion-safe:group-hover/card:scale-105` with `motion-on:group-hover/card:scale-105`; then remove both files from `TRANSITION_BASELINE` in scripts/check-anim-props.ts and `OS_VARIANT_BASELINE` in scripts/check-reduced-motion.cjs (slice I does the baseline edits).
- R3 (owners of each file, F190): replace `motion-safe:` with `motion-on:` and `motion-reduce:` with `motion-off:`, and CSS `@media (prefers-reduced-motion: reduce)` blocks with `html[data-anim="off"]` selectors, in the files listed in `OS_VARIANT_BASELINE` (scripts/check-reduced-motion.cjs). Then lower that file's count in the baseline (the guard fails if it is left stale).
- R4 (slice A SiteHeader.tsx dropdown, MobileNavMenu.tsx, HeaderSettingsMenu.tsx; slice D PlayerSearch.tsx; slice K EffectPopover.tsx; GlossaryTerm owner; F196): add `m-pop` to the panel (`m-pop m-pop--end` for a right-anchored trigger, `m-pop--up` for one that opens upward), `m-scrim` to any backdrop, and drive the mount with `const p = useExitPresence(open)`: render while `p.mounted`, set `data-leaving={p.leaving ? "" : undefined}`. The header search panel already carries the motion via `.header-search-panel`; SiteHeader only needs the useExitPresence mount for its exit.
- R5 (F197): replace the pulse/ping dot with `dot-live` (keep the size and colour classes): ConnectionBanner.tsx:109 (`motion-safe:animate-pulse`), lobby/page.tsx:860 and :863, tournaments/page.tsx:509, AdminGodPanel.tsx:223 (`animate-pulse`).
- R6 (F199): each hand-rolled chevron becomes `data-open={open}` plus `className="m-chevron"` (180deg) or `"m-chevron m-chevron--quarter"` (90deg), dropping its own `transition-transform duration-*` and `rotate-*` toggle: lobby/page.tsx:905, OppPlaysLog:266, BoardKey:37, GameOver:537, CardInsights:152, CardDetail:242, puzzles/page:219, u/[username]:1750, glossary:97.
- R7 (slice J DraftOverlay.css :1200 :1235 :1245 and WaitingCornerNotice.tsx :74 :111; F189): `cubic-bezier(0.16, 1, 0.3, 1)` becomes `var(--ease-out)` in CSS, and `EASE.out` from `@/lib/motion` in framer.
- R8 (F195): AchievementToast (A), OnlineMatch toasts and WaitingCornerNotice and DraftRevealBanner (J): wrap each toast in `className="m-toast"` with `data-leaving` during its exit (useExitPresence, or the existing leaving flag with at least `dur(1)` before removal) instead of framer or hand-rolled fades.
- R9 (modals, F138/F186 owners C and J): dialogs take `m-modal`, their backdrop `m-scrim`, with the same data-leaving exit.

## PROPOSALS

- P-I1 (F198): one `.m-switch` class in globals.css based on `.settings-toggle` (thumb moves by translateX on dur-1 ease-io, no shadow) for HeaderSettingsMenu, SettingsPanel and profile/edit. Needs agreement from slices A and C on the markup; not built.

## Remaining TODO

F198, F161 check-shadows guard, the btn-leaf / btn-cursed filter hover (F193), merging DraftNotice and GodPanelNotice (F195), Tier A families living in other slices' files (route transitions, modals, drawers, skeletons, tab indicators, queue, draft chrome, chat arrival, smooth scroll).
