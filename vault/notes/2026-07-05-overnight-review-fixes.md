# Overnight review fixes (2026-07-05)

Five verified findings from the overnight code review of `claude/overnight-punchlist`, fixed on the same branch.

## 1. Whole-board rewrites corrupted the revive pools (HIGH)

The Resurrect fix made `api.removePiece` count every buff removal as a capture. Perfect Rewind and Genesis clear all 64 squares and re-place, so a full army registered as "captured": revive cards could resurrect pieces never lost, and capturedFromMe-based nerf conditions latched permanently. The expiring Phantom Rook polluted the pool the same way.

Fix: `removePiece(sq, { uncounted: true })` in `src/engine/game.ts` / `src/engine/buff.ts`. Perfect Rewind, Genesis, and the Phantom Rook expiry pass it; real destruction (Detonate, Nova, Total Annihilation, and friends) still counts. Proven by `scripts/sim-capture-accounting.ts`: captures happen, Genesis/Rewind fire, pools are byte-identical before and after; the expired rook never enters the opponent's pool; the counted path still counts.

## 2. House-action crash erased rated human games (HIGH)

When `playHouseAction` threw in a human-vs-house match, the catch called `deleteMatch`, closing the human's socket with "Game expired" and erasing the rated game with no end frame.

Fix: if the match has a human seat, the house seat resigns through the normal `endMatch` flow (rating recorded, end frame sent). Only house-vs-house filler games are deleted outright.

## 3. Replays were not versioned (MEDIUM)

The cadence change (10 to 6) and boon pool changes desync any in-flight draft game recorded before deploy: the replay rolls different offers, `moveByUci` fails, humans soft-lock.

Fix: `StoredMatch` now persists `replayVersion` (`REPLAY_VERSION = 2`) and the draft `cadence` at creation; replays run under the stored cadence. On load through the new `gameForPlay` guard (moves, resigns, draft frames, house actions, reconnects), a started match whose version mismatches, or whose replay fails, ends gracefully as a draw with reason "server update interrupted this game" via the normal end flow. Never silently deleted, never soft-locked. Matches without the field are version 1: replay failure is their trigger; a clean replay lets them continue. Version mismatch is the trigger from v2 on.

## 4. Queue pickup could drop a human silently (LOW)

The pickup path persisted the queue with the human already removed before `pairHumanWithHouse` ran; if pairing threw, the human sat on "searching" forever.

Fix: pair first, then remove the queue entry, so a pairing failure leaves the human queued for the next tick.

## 5. Alarm revival latched once per isolate (LOW)

`alarmRevivalChecked` meant a chain that wedged after the first check was never revived by connecting humans.

Fix: latch removed; every socket connect and /healthz runs the cheap `getAlarm()` check.

## Verification

- `npm run typecheck` clean.
- `npx -y tsx scripts/sim-capture-accounting.ts`: 16/16 checks pass.
- `npx -y tsx scripts/sim-house-bots.ts`: all checks pass (legality, budgets, pacing, roster).
