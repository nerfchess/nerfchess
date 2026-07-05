# Desync recovery and challenge rejoin (2026-07-05)

Two owner-reported multiplayer bugs, both traced to dead-end client paths.

## Bug 1: "your board is out of date" after an opponent's (locally) illegal move

### Root cause

The client keeps a deterministic replica of the server game. When an accepted
move arrives over the websocket, `OnlineMatch.tsx` looks it up in the replica's
legal-move list:

```ts
const lm = legalMoves(g).find((x) => moveToUCI(x) === e.move.u);
if (!lm) { ...clear pending state...; return; }
```

If the replica has drifted (a buff-granted move it could not regenerate, a
dropped or reordered dtState frame, any other divergence), `lm` is not found
and the move is silently discarded. The board freezes one ply behind the
server. The player's next move is then sent with the stale ply and the server
rejects it with `stale_ply` ("Your board is out of date.", worker.ts). That
error was displayed as-is and nothing ever updated the board: a dead end.

### Fix

Never strand the board; resync from the authoritative server instead.

- `MPSession.resync()` (src/lib/multiplayer.ts): drops the current socket
  quietly (handlers detached, no `disconnected` event) and reruns the
  reconnect handshake. The server only replays full state on a fresh seat
  claim, and both servers (worker.ts and server/index.ts) already answer a
  `reconnect` frame with a complete `start` replay (moves, clocks, chat,
  draft record, trailing `end` if finished). This reuses the well-tested
  reconnect path rather than inventing a new sync frame.
- `OnlineMatch.tsx`: a `resyncFromServer(reason)` helper logs the desync to
  the console (genuine desyncs stay visible, never silently masked), shows a
  transient "Board out of sync, refreshing from the server..." notice, clears
  pending/premove state, and calls `session.resync()`. Rate-limited to one
  resync per 2 seconds so a persistent mismatch cannot spin the socket.
  Invoked from:
  - the `move` handler when the accepted move is not reproducible locally
    (clocks are still updated from the frame first), and
  - the `error` handler for codes `stale_ply` and `illegal_move` (the client
    only ever sends moves from its own legal list, so a rejection at the
    matching ply also proves replica drift).

The replayed `start` frame flows through the existing handler, which rebuilds
the game via `buildGameFromStart` (full interleaved replay of moves plus the
public draft action record, then a dtState merge) and clears the notice. The
game stays playable.

## Bug 2: refresh on /friend?code=XXXXX after accepting a challenge locks you out

### Root cause

The challenged player lands on `/friend?code=XXXXX`, the challenge is claimed
(record flips to `accepted`) and the websocket `join` takes the black seat;
the seat token is saved to localStorage when the `start` frame arrives. On a
page refresh the URL still carries `?code=XXXXX`, and the mount effect ran
`joinWithCode(codeParam)` unconditionally. `joinWithCode` starts with
`clearSavedFriendSession()`, destroying the only seat token, then attempts a
fresh websocket `join`. The server correctly refuses (`startedAt` is set, or
the nerf draft is dealt, so both seats are claimed): "That code is not
accepting a player." The player is now locked out of their own game.

(The challenge claim itself was not the blocker: re-accepting an already
accepted challenge returns ok with `alreadyHandled`. The lockout was purely
the client discarding the seat and re-joining.)

### Fix

In the friend page mount effect, when a `?code=` param is present, first check
`loadSavedFriendSession()`. If the saved seat belongs to that same code,
resume it (`sess.resume(saved)`), which reclaims the seat by token and replays
the full game. Only when there is no saved seat for that code, or the server
refuses the seat (`reconnect_failed`: game gone or archived), fall back to the
original claim-and-join path. The joiner always has a saved seat by the time a
refresh can hurt: the server sends `start` immediately on join in buff mode
and immediately on the nerf-draft deal in nerf mode, and `MPSession` persists
the seat on every `start` frame.

## Files touched

- src/lib/multiplayer.ts: new `MPSession.resync()`
- src/components/OnlineMatch.tsx: `resyncFromServer` helper; move handler and
  error handler wired to it
- src/app/friend/page.tsx: resume saved seat before joining when the URL code
  matches it
