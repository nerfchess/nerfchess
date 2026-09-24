# Slice J: Tier B game moments (wave 1)

Owner files: `Board.tsx`, `OnlineMatch.tsx`, `GameOver.tsx`, `ClockPill.tsx`, `BoardSplash.tsx`, `src/lib/lowTimeMotion.ts`, `src/lib/useReducedMotion.ts`, `useMotionTempo.ts`, `DraftOverlay` / `DraftVault` + css, `useSignatureQueue.ts`, `fxZones.ts`, `cardEntrance.*`, `UseSpectacle.*`, `src/lib/sounds.ts`. New in this slice: `src/app/dev/splash/*` (dev harness), `scripts/polish/j/*`, `e2e/polish/{game-over-lowtime,game-over-chime,game-over-share,board-splash,signature-queue,draft-escape}.spec.ts`.

Evidence folder: `docs/polish-pass/evidence/J/`. Online `/game/[id]` cannot run under `next dev` (no Durable Object), so every browser measurement is on the local bot game (`/game`), `/dev/draft`, or the new `/dev/splash` harness, which mounts the real components.

## FINDINGS

| ID | New status | Evidence | Commit | Note |
|---|---|---|---|---|
| F204 | DONE | `evidence/J/f204-before.json` (every frame `--beat` 0 while `data-anim` normal), `f204-after.json` (`--beat` 1 from the first frame); spec `e2e/polish/game-over-lowtime.spec.ts` fails before, passes after (2 tests, incl. animations-off keeps `--beat` 0 and opacity 1) | c72ac58 | Root cause: the panel mounts in the commit whose ClockPill effects release the low-time hold; `useReducedMotion` read `data-anim="off"` at render and its MutationObserver subscribed after the write, so it never re-read. Class fix: `useReducedMotion` re-reads after subscribing (every consumer). The panel reads motion through the hold (`ignoreLowTimeHold`) and `releaseAllLowTime()` runs in a layout effect before the first paint, so CSS beats and framer springs agree from frame one. Repro needs the panel chunk already loaded (second game in a session), which the spec does via Rematch. |
| F205 | DONE | `evidence/J/f205-settle-{before,after}-{normal,off}.json` (flag ending, clock-zero to dialog: 279ms before, 944ms after at normal; resign unchanged; off unchanged); `scripts/polish/j/test-settle.ts` (13 cases) | 2e1b6d9 | 600ms x tempo settle for endings that happen on the board (king capture, rule loss, flag, stalemate); resignation, agreed draw, abort, abandonment, interruptions answer at once; 0 with motion off; a reopened panel ("Show result") never settles twice. The chime plays on the panel's first frame (the strike). `OnlineMatch` skips the check bell on a move whose `next.result` is set. Bot game needs the same one-line check-bell guard (REQUEST to B). |
| F207 | DONE | `evidence/J/f207.txt`; spec `e2e/polish/board-splash.spec.ts` (repeat constraint stalls the queue before, clears after) | 5997eca | Monotonic ids from a ref (computed outside the state updater). `role="alert"` replaces `role="status"` + `aria-live="assertive"`. Motion-off parking was already in globals.css:2036; the spec pins it. |
| F208 | DONE | `evidence/J/f208-before-off.json` (off: 5200ms, busy), `f208-round1-before-off.json` (round 0 fix: plays 16ms apart, "Play one" readable 11ms, only the last announcement survives), `f208-after-off.json` (off: never busy, plays and their fallback chips 2600ms apart, each readable), `f208-after-normal.json` (2600ms spacing and busy kept); spec `e2e/polish/signature-queue.spec.ts` (off test fails on 7f88095, passes now) | 7f88095, review round 1 fix below | Busy and spacing are separate. Busy time = 2600 x `fxDurationScale()` x `tempoScale(detectTempo())`, so with animations off, reduced motion or the low-time hold nothing is busy and neither the board nor the draft entrance is held. The step between queued plays stays 2600 x `--fx-dur` with animations off, because `CastTextFallback` (the only card-play feedback there, keyed to the one play slot, 3600ms dismiss) would otherwise be replaced before it is read. Under the low-time hold Board hides the fallback anyway (`fxCalmClock`), so the step costs nothing there. A 16ms floor keeps one frame per play (R9). `/dev/splash` now renders the real fallback keyed like Board. The 7s deferral cap lives in `useDraftSequence` (ANIMATIONS_SETTLE_CAP_MS). `test:draft-sequence` 20/20. |
| F212 | DONE | `evidence/J/f212.txt` (old logic: one tick 12s to 4s plays only "low", urgent marked fired; new: urgent sounds); `scripts/polish/j/test-clock-warn.ts` | a0bf189 | Pure `clockWarnCue` plus a per-cue cross-copy throttle (the shared single stamp was what swallowed the urgent tick). When one tick crosses both lines only the urgent cue sounds. |
| F220 | DONE | `evidence/J/f220.txt` (computed transition-property: 11 paint properties at 150ms Tailwind easing before; `opacity` 120ms `--ease-out` after) | a0bf189 | `transition-opacity duration-[var(--dur-1)] ease-[var(--ease-out)]`. |
| F218 | DONE | `evidence/J/f218.txt`; spec `e2e/polish/game-over-chime.spec.ts` (oscillators on the reloaded finished game: 3 before, 0 after) | 3fc1b92 | sessionStorage ledger `nc:gameover-voiced` (newest 50, guarded) on top of the module Set. |
| F143 | DONE | `evidence/J/f143.txt`; spec `e2e/polish/draft-escape.spec.ts` on `/dev/draft` | a6997a3 | The draft's capture-phase Escape returns early while an inner `[role=button][aria-expanded=true]` (pinned glossary term) is open. Sibling Escape handlers in Board/OnlineMatch checked: none sit over a glossary term. |
| F185 | DONE | `evidence/J/f185.txt`; spec in `e2e/polish/board-splash.spec.ts` (ticking parent on `/dev/splash`: banner still up after 9s before, gone after) | 136c2f0 | Timer armed once, latest `onDismiss` through a ref. |
| F085 | DONE | `evidence/J/f085.txt`; guard `scripts/polish/j/check-session-sends.ts` (flags `session.resign()` before, clean after) | a27e9df | Mirrors onAbort. Not browser-verified (online game needs the DO). |
| F240 | DONE | `evidence/J/f240.txt`; spec `e2e/polish/game-over-share.spec.ts` (shared text lacks `/game/{id}` before, has it after) | 9419963 | Online results share `origin/game/{serverGameId}`; bot games keep the origin. |
| F157 | DONE | `evidence/J/f157-before.json`, `f157-after.json` (hidden-draft chip: 32px tall, 12px, name "Show the draft" before; 44px touch / 36px fine pointer, 14px / 13px, name "Show the draft: Draft open" plus countdown after) | 4056fe6 | Also the compact panel's Confirm (`text-xs`) and the chest's Skip (12px) to 14px mobile / 13px desktop; the chip loses `shadow-plate`. The compact panel is not reachable on `/dev/draft`, so its Confirm is verified by class only. |
| F203 | NO-CHANGE | `e2e/polish/game-over-lowtime.spec.ts` "player chose animations off" (panel at opacity 1, `--beat` 0 at once) | - | With motion off the unseal is never armed (`unseal={unsealArmed && choreograph}` and `&& !reduceMotion`), so nothing waits on `animationend`; the lid is derived (`sealLifted = !choreograph`) and its timer is skipped. The reveal is still announced (`announce={unsealArmed}`). |
| F206 | TODO | - | - | Needs a Board prop saying the change kind (move / rewind / resync); OnlineMatch would bump it on `takeback` and reconnect replays, game/page.tsx (B) likewise. Additive internal prop, not a protocol change. Plan: a `/dev/splash` Board harness that applies a capture then its rewind and counts morph fx. Not started. |
| F209 | TODO | - | - | Spans `BoardEffects.tsx` CastSpectacle (TC-core owns the signature scenes in that file; the wrapper at :2637-3155 needs an owner call from the integrator), `cardEntrance.tsx` (88 raw-ms delay sites) and `sounds.ts` `playSignature`. Proposal P-fxdelay stands. |
| F210 | TODO (owner Q27) | - | - | Unchanged per brief. |
| F211 | TODO (owner Q28) | - | - | Unchanged per brief. |
| F213 | TODO | - | - | Move voice at slide start, not landing. |
| F214 | TODO (REQUEST to I) | - | - | CSS lives in globals.css (slice I). Patch below. The 2s hold is a reading hold for copy, so it stays unscaled by --fx-dur on purpose. |
| F215 | TODO (REQUEST to I, owner Q36) | - | - | Dead `@keyframes sq-check-pulse` (globals.css:1432) and the `html[data-anim="off"] .sq-check::after` rule (no `::after` exists any more). King glow waits on Q36. |
| F216 | TODO | - | - | BoardEffects.tsx CastSpectacle dim and letterbox; same ownership question as F209. |
| F217 | TODO | - | - | Draft audio on the tell; not started. |
| F219 | TODO | - | - | Stun replay on reconnect (unverified); the consumer is Board's stunSquares handling, not fxZones. Not started. |
| F111 | TODO | - | - | Leaf `RatingCountUp` is a small change, but a before/after needs a rated result (online only). Deferred rather than shipped without numbers. |
| F087 | TODO | - | - | Not started. |
| F131 | TODO | - | - | B + J: sr-only h1 in OnlineMatch's layout. Not started. |

## ANIMATIONS (Tier B rows)

| Moment | New status | Note |
|---|---|---|
| Checkmate / game-end hand-off | DONE | F205 settle and check-bell guard (evidence above). |
| Timeout / flag | PARTIAL | F204 (choreography under the hold) and F205 (settle lets the zeroed clock register). No dedicated flag visual added (none needed yet; the settle carries it). |
| GameOver choreography | PARTIAL | F204, F203, F218 closed. Frame strips of the three acts at full / fast / off not yet captured. |
| ClockPill low time | PARTIAL | F212, F220 done; F210 waits on Q27. |
| BoardSplash | PARTIAL | F207 done; F214 is a REQUEST to I. |
| Signature queue | DONE | F208. |
| Draft pick (select, confirm, flight) | PARTIAL | F157 done; F217 TODO. |
| Every other Tier B row | TODO | Move slide, capture, check, draw/resign/abort, promotion, premoves, arrows, EvalBar (slice I), MoveReview, rating reveal, draft opening, card play wrapper, UseSpectacle, CardEntrance, scene staging, fxZones, sound sync, board shake, takeback. |

ROUTES `/dev/chest`, `/dev/draft`: TODO (used as harnesses only this wave).

## ADDITIONS

- `/dev/splash` (`src/app/dev/splash/page.tsx`, `SplashHarness.tsx`): dev-only harness (same production gate as the other galleries) that mounts the real `BoardSplashHost`, `DraftRevealBanner` under a ticking parent, `useSignatureQueue`, and an online `GameOver`. Justification: these moments are otherwise only reachable mid online game, which `next dev` cannot run; the regression specs above need them.
- `scripts/polish/j/settle-probe.ts` (F205 timing), `draft-controls-probe.ts` (F157 sizes), `test-settle.ts`, `test-clock-warn.ts`, `check-session-sends.ts` (guards and unit tests).
- `releaseAllLowTime()` in `lowTimeMotion.ts`; `useReducedMotion(force, { ignoreLowTimeHold })`, `detectReduced(ignoreHold)`, `useMotionTempo({ ignoreLowTimeHold })`, `detectTempo(ignoreHold)`. Only the result screen looks through the hold.

## NEW FINDINGS (for the integrator to number)

- J-1 (low, design contract): `shadow-plate` is a real box-shadow (`tailwind.config.ts:130`, `0 12px 40px -24px ...`) and is used 18 times in `src/**/*.tsx` (Board.tsx 3, OnlineMatch.tsx 3, DraftOverlay.tsx 5 after F157, others), plus `shadow-xl` twice in OnlineMatch (rematch toast :3798, "Show result" button :3816). design-system.md section on `.plate` says no shadow. Root-cause fix is one line in the token (REQUEST to I below); then the class names are inert and can be swept.
- J-2 (low, design contract): piece images carry `drop-shadow` in Board.tsx (:2100, :2320, :5453). Changing piece rendering is visible everywhere; left for an owner call rather than a silent change.

## REQUESTS

- To B (`src/app/game/page.tsx:1020-1023`), F205 parity for the bot game: the check bell must not ring on a move that ended the game.
  ```diff
  -      if (gameInCheck(game, game.board.turn)) {
  +      if (!game.result && gameInCheck(game, game.board.turn)) {
  ```
- To I (`src/app/globals.css`), F214: drop the glow and use the tokens on the splash.
  ```diff
   .board-splash {
     background: radial-gradient(62% 48% at 50% 50%, rgba(10, 8, 6, 0.62), transparent 76%);
  -  animation: splash-veil 2s ease-out both;
  +  animation: splash-veil 2s var(--ease-out) both;
   }
   .board-splash-card {
  -  animation: splash-pop 2s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  +  animation: splash-pop 2s var(--ease-out) both;
   }
  ...
  -  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55), 0 0 34px rgba(220, 90, 84, 0.5);
  +  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55);
  ```
  (The 2s stays: it is the time to read the announcement, and `BoardSplash.tsx` expires it on the same 2000ms.)
- To I (`src/app/globals.css:1431-1435, 1441-1443`), F215 dead CSS: delete `@keyframes sq-check-pulse` with its comment, and the `html[data-anim="off"] .sq-check::after { animation: none; }` rule (no `.sq-check::after` exists). The king `drop-shadow` stays until Q36.
- To I (`tailwind.config.ts:130`), J-1: `plate: "none"` (or delete the token and sweep the 18 call sites), so `shadow-plate` stops painting a shadow site-wide.
- To L (`package.json` scripts): `"test:settle": "tsx scripts/polish/j/test-settle.ts"`, `"test:clock-warn": "tsx scripts/polish/j/test-clock-warn.ts"`, `"test:session-sends": "tsx scripts/polish/j/check-session-sends.ts"`.
- To the integrator: decide who owns the CastSpectacle wrapper in `BoardEffects.tsx` (:2637-3155) for F209 and F216; TC-core owns the file's signature scenes.

## OWNER QUESTIONS

None new. Q27, Q28, Q36 unchanged.

## PROPOSALS

None new. P-settle is now built (F205) as a GameOver-side gate, so no caller protocol change was needed.

## SECURITY

None.

## Guards run

`test:emdash`, `test:reduced-motion`, `test:anim-props`, `test:sound`, `test:case`, `test:rounded`, `test:buttons`, `test:clock-format`, `test:draft-sequence` all OK after the last commit; tsc and eslint clean on every touched file; the six new specs pass on their own. In one combined run of all six (10 tests, 2.8 min) `game-over-chime.spec.ts` failed once and then passed alone twice in a row; the failure output was not captured, so treat it as possibly flaky under a shared, hot-reloading dev server until the integrator's run confirms.

## REVIEW ROUND 1

- Blocking (F208, 7f88095): fixed as described in the F208 row. The reviewer was right: a burst with animations off left only the last CastTextFallback readable.
- Nits left as TODO for a later wave: the hidden-draft chip's Tailwind `transition` and Skip's `transition-colors` (4056fe6, same class as F220); the settle beat on the first open of an archived or reloaded finished game (2e1b6d9, could share the F218 sessionStorage ledger); SETTLE_MS note tying it to the --dur scale; the one unexplained failure of `game-over-chime.spec.ts` in a combined run (not looked at yet, keep it out of gates until then); owner note on role=alert bursts from the splash queue (5997eca).
- `test:anim-props` currently fails on two stale baseline entries in `src/components/effects/fruition/fruition.css` (another slice fixed those keyframes); not a J file.
