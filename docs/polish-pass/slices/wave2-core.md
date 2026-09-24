# Wave 2, area core

Findings from the wave 2 audit for `/`, `/lobby`, `/play`, `/game`, `/game/[id]` and the custom game setup. Every probe ran against the shared dev server on :3000 through `scripts/polish/heavy.sh` with the bundled Chromium 1194. Other agents were editing files during the runs, so Fast Refresh rebuilt and reloaded pages mid-probe. Counts that it could have inflated are marked.

## Results

| # | Finding | Status | Before | After | Commit |
|---|---|---|---|---|---|
| 1 | Home CLS 0.0196 at 1280x800 | ROOT CAUSE OUTSIDE AREA | 0.0196, one shift frame | 0.0109 + 0.0027 (header) with the in-progress font fallback work in the tree | none in core |
| 2 | Lobby sticky bar and play panel repaint after DCL | DONE | 20.7% dcl to settled (390 dark signed-out) | 9.4% (`evidence/flash/wave2-core-lobby-after/flash.json`) | a7db150 |
| 3 | Bot game and /tv flash | CHECKED, NO CHANGE | 42-63% | same | none |
| 4 | Home and /profile refetch feeds 3-7 times | NO CHANGE NEEDED (dev artefact) | 7x recent feeds (busy run) | 2x on a quiet load (strict mode), 3x when Fast Refresh remounts mid-run | none |
| 5 | Bot draw acceptance on a stale game object | DONE | resign inside the window ended as "Draw by agreement" | "Black wins, Resignation" | bb2e4d4 |
| 6 | Custom game Create has no in-flight guard | DONE | double tap made two MPSessions and hosted twice | second tap is a no-op; button busy; failed host closes its socket | 18321d3 |
| 7 | Spectator chat Report hides failures and double-sends | DONE | failure text closed along with its row; two POSTs | failure shown on the message line with a reason; one POST per message | 18321d3 |
| 8 | /play sliders announce a step index | DONE | `value=9`, no valuetext | `aria-valuetext="5 minutes"` / "Unlimited" / "3 seconds" | 5b0b72d |
| 9 | /play pill rows have no group name | DONE | plain divs | `role="group"` + `aria-labelledby` on the label | 5b0b72d |
| 10 | /lobby 3s poll never pauses in a hidden tab | DONE | about 5 per 15s while hidden | 0 in 20s hidden | a7db150 |
| 11 | Bot game Show result button has shadow-xl | DONE | `grep -rn shadow-xl src/app/game`: 1 hit | 0 hits | bb2e4d4 |
| 12 | Spectator hand tabs and chat controls under 44px | DONE | tabs 36px, chat toggle/name/Mute/Report bare text | 44px on coarse pointers; Mute/Report 13px, 14px on touch | 18321d3 |
| 13 | Home ships the card library chunk | DONE | esbuild proxy of `src/app/page.tsx`: 1,806,098 bytes static, buff library reachable | 204,599 bytes static, library and `engine/game.ts` unreachable | 844d3d2 |

## Notes per finding

**1. Home CLS.** Probed frame by frame (rAF snapshots of the ways-in column and the header brand, plus layout-shift sources). The shift is one frame at the moment `document.fonts` goes from loading to loaded. The "nerfchess" brand narrows 164 to 157px, the nav link group 430 to 417px, and the paragraph's text runs rewrap. Nothing in the ways-in column changes height: the paragraph box keeps its 72px and the Buff/Nerf rows move by 2px at most. This is a font swap class problem. The next/font fallback face `local(Arial)` fails on systems without Arial. An uncommitted `src/app/fontFallback.css` plus a `fallback:` entry in `layout.tsx` from another area was already in the working tree during these probes, and with it the frame drops to 0.0109. The remaining brand change is the 500-weight text on the regular metric fallback. The fix belongs to that area's layout and font files. `page.tsx` has no page-level cause to fix. The separate 0.0027 header shift (`relative flex items-center gap-0.5`, the header's user chip) is in SiteHeader, which is not a core file.

**2. Lobby flash.** Root cause: the lobby hard-loads its Suspense fallback (`LobbySkeletonBody`), which had nine grey blocks for the time tiles and no phone sticky bar. QuickMatch portals the real bar only after mount. The class is a late chrome element, not content. Fix: the tiles and `QUEUE_POOL_OPTIONS` move to `src/app/lobby/TimeCell.tsx`. The skeleton draws the real tiles (3+2 selected, the page's first render, aria-hidden, out of the tab order) and a fixed bottom bar at the real geometry with a 52px skeleton where the mode-dependent label goes. The remaining changes are text arriving in boxes that were already reserved (the Find label, the guest note, and the ways-in buttons enabling).

**3. Bot game and /tv.** Looked at frame by frame (`evidence/flash/wave2-core-game-look/*.png`). Up to hydration the dealt game frame skeleton shows. The opening draft sheet ("Choose your handicap") then opens over it and is finished by authSettled (0.6% left). This is the opening draft arriving, not a theme or colour flash. The skeleton cannot know a draft is coming, because the Suspense fallback prerenders without the query string. The sheet's entrance is in DraftOverlay (slice J files), so it was left as is. The header brand box in the strip is the same font swap as in item 1. /tv belongs to the social area and was not changed here.

**4. Fetch counts.** Recounted as `polish_user` at 1280x800 over 12s. `/` made 2 calls each to /api/games/recent and /api/community/recent (the strict-mode double effect) and 1 each to /api/users/polish_user, /achievements and /api/lobby. A run with Fast Refresh remounting mid-load made 3 of each. `/profile` made 1 each. The 5-7x counts in the audit came from Fast Refresh remounts on the busy shared server, not from the code. Each effect runs once per mount.

**5. Draw offer.** The 800ms timeout now reads `gameRef.current`. It does nothing if the game already has a result, and it judges material on the live position. It never spreads the object captured at offer time. Sibling grep: `onOfferDraw` is the only delayed write of `game.result` in the bot page. Resign, flag and the bot's own moves already read `gameRef`. Probe: offer a draw, resign inside the window. The result was "Black wins, Resignation" and no draw appeared.

**6. Create guard.** `creatingRef` plus `creating` state, passed through the friend game context to the Create button (`loading`, so `aria-busy` and disabled). Any prior session is destroyed before a new one starts. A failed host destroys its session. QuickMatch (`startingRef`) and joinSeek (`joiningPool`) already had the same guard. `host()` has no timeout of its own, so the busy state lasts until the server answers or the socket fails. Checked by reading the code only: under next dev no game server answers `host()`.

**7. Report.** State per message: `"sending" | "sent" | { error }`. A ref-backed set blocks a second POST while the first is in flight, and a message that was already reported cannot be reported again. The failure is shown next to the message, outside the actions row. It reads "Sign in to report." for 401, "Too many reports today." for 429, and a retry message otherwise (the route returns exactly these statuses).

**10. Polls.** Siblings fixed with the same guard: the shared poller in `src/lib/lobbyClient.ts` (it re-polled on foreground but kept ticking while hidden) and `src/lib/presence.ts` (10s, same shape). Probe at 360x780: 4 polls in 12s visible, 0 in 20s with the tab hidden.

**13. Home bundle.** The measurement is an esbuild proxy (`src/app/page.tsx` bundled with react, next, framer-motion and lucide external, dynamic imports split), because a production `next build` would compete with the shared dev server. Three static chains reached `engine/game.ts`: HeroTv to featuredBoard to draftOnline, and useFeaturedTune to spectatorSync and to featuredSelection, which only needed `PUBLIC_SNAPSHOT_VERSION`. The fixes:
- `src/engine/snapshotVersion.ts` is a new leaf module. `engine/game.ts` imports and re-exports the constant, so worker and server imports are unchanged. This is a two-line edit in an engine file, noted here for the realtime and engine owner.
- `src/lib/spectate/featuredDraft.ts` holds the draft record and its helpers. `featuredBoard.ts` re-exports them, so /tv and CurrentGameCard are unchanged.
- HeroTv's `useHeroBoard` loads `draftOnline` only when a live draft game is on the hero, and shows the moves-only replay until it arrives.

The existing lazy imports in CardOfTheDay and HeroRatings now do what they were meant to do.

## Checks

`tsc --noEmit` on the whole project is clean. `eslint` is clean on every file touched. No em dashes were added. The probe scripts were temporary and have been deleted. The evidence is in `docs/polish-pass/evidence/flash/wave2-core-{lobby-after,game-look}/`.

## REQUESTS

- Font and layout owner: finish and commit the metric fallback (`src/app/fontFallback.css`, `layout.tsx` `fallback`). It is the whole remaining home CLS (item 1). The weight 500 brand text still changes width on the swap.
- Realtime and engine owner: `src/engine/game.ts` now re-exports `PUBLIC_SNAPSHOT_VERSION` from `./snapshotVersion`. Client code should import the leaf module, not `engine/game`.
- J: the bot game's opening draft sheet opens after hydration over the dealt frame (item 3). If the flash budget should cover it, the sheet's entrance is in DraftOverlay.
