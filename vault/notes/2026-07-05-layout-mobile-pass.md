# Layout width, spectate move list, mobile pass (2026-07-05)

Batch E of the overnight punch list: items 15 (spectate move list height), 16 (wider rails and boxes), 18 (mobile verification), layout-only changes.

## Item 15: spectate move list capped

The spectator and replay views (GameShell in `src/app/game/[id]/page.tsx`) rendered the compact MoveList with no height bound, so a long game grew the rail past the viewport and pushed the buffs panel, watchers, and spectator chat off screen.

Fix: the MoveList now sits in a fixed-height wrapper (`h-64 xl:h-72`). The compact variant already fills its parent (`h-full flex flex-col`) and scrolls its rows internally (`min-h-0 flex-1 overflow-y-auto`), so the cap makes the list scroll in place and the rest of the rail stays on screen.

## Item 16: wider drafted-rules boxes and rails

In-game views, both `src/components/OnlineMatch.tsx` and `src/app/game/page.tsx` (identical layout skeleton):

- Left rail (nerf cards, drafted rules, buff dock, chat): `lg:grid-cols-[340px_auto]` to `[380px_auto]`, `xl:grid-cols-[380px_auto]` to `[420px_auto]`.
- Right rail (clocks + move list): `sm:w-64` to `sm:w-72`.
- Page container: `max-w-[1280px]` to `max-w-[1360px]`, `xl:max-w-[1600px]` to `xl:max-w-[1680px]`, absorbing the wider rails so the board keeps its cap (`--board-cap`, 720px default) and stays dominant.
- Spectate/replay shell: container `max-w-[1100px]` to `max-w-[1200px]`, rail `sm:w-56` to `sm:w-64`. The rules boxes under the board share the flex column, so they widen with the container.

The rail height grid was not touched: rows still track `--board-height` and the `sm:h-[var(--board-height)]` clamp is intact.

## Item 18: mobile pass at 390x844

Verified with Playwright (chromium, 390x844, isMobile, touch) against the local dev server, plus a static audit of the responsive classes. Pages driven: home, /lobby, /play, /game?mode=ai (bot game, board rendered, move played). Checks: `scrollWidth <= clientWidth` on every page (no horizontal scroll), lobby Play CTA reachable and inside the viewport, screenshots reviewed by eye.

Statically audited: QueueButton (mode cards stack, 5-col time grid fits, full-width Play button), DraftOverlay (blocking card `max-h-[90dvh] overflow-y-auto`, minimized card `w-[min(92vw,19rem)]`), draft waiting card (`max-w-xs` inside `px-4`), BuffDock Usable tags (shrink-0 chips next to truncating names), MobileBuffDrawer and MobileMoveDrawer (fixed bars, 46dvh panels, safe-area padding), ModeBadge, ClockPill grace digits (compact `+Ns` suffix), home hero (single column below lg), BuffUsedToast (`w-[min(80vw,20rem)]` top-right).

Found and fixed:

- SiteHeader: signed in at 390px, the right cluster (search, challenges, bell, username, avatar) was wider than the space beside the logo and the icons overlapped the "nerfchess" wordmark. The username text is now `hidden sm:inline`; the avatar alone opens the account menu on phones. Verified fixed in a re-run screenshot.
- OnlineMatch waiting pill copy contained an em dash ("Opponent is still choosing — on their clock now."); replaced with a comma per the house style.

Desktop regression check after the widening: /game?mode=ai at 1440x900 and 1920x1080, zero x/y overflow, rail rows aligned to the board height, screenshots reviewed.

`npm run typecheck` clean.
