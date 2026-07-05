# Online Draft protocol design

Date: 2026-07-04. Implemented on branch claude/draft-multiplayer-protocol (stacked on the draft engine fixes in claude/draft-system-improvements).

## Wire frames

Client: dtPick { index }, dtBank, dtUse { buffIndex, picks }, dtTarget { buffIndex, picks }, dtNerfPick { index } (opening nerf draft; index 0 or 1 into the server-dealt options).
Server: dtOffer (drafting seat only, plus opponent under picksVisible), dtResolved (public, broadcast + spectators), dtUsed (public, broadcast + spectators), dtState (per-seat filtered, never spectators), dtTargetReq (reply to dtTarget), dtNerfPicked { color } (both seats, progress only). start/wstart/end gained additive draft fields (draft, picksVisible, dtActions, dtState, draftBuffs); start also carries nerfDraft { options, myPick, oppPicked } while the opening nerf draft is unresolved.

## Key decisions

- The draft RNG seed/state is never serialized to any client: it would let a client predict every future offer. Client replicas call enableDraftMode with a placeholder seed; playReplicaMove (src/lib/draftOnline.ts) discards locally rolled placeholder offers/reveals so only server frames populate them.
- Exact rebuild without snapshots: StoredMatch keeps draftActions (pick with offer index + acquired cards, bank, use with picks) tagged with the ply they happened at. gameFromMatch replays moves and actions interleaved through the engine, reproducing the RNG stream and buff board mutations byte-for-byte. A bs snapshot alone could not rebuild the board (buffs mutate it outside move history).
- Visibility filtering lives in one worker helper, draftStateFor(game, match, seat|"spectator"). Spectators get held buffs + effects only; no offers, no pending markers, no flags, no oppReveal.
- Moves from a seat with a pending offer are rejected with draft_pending; the client blocks the board the same way.
- Draft matches are forced casual (create never sets rated for them; rematch carries draft with a fresh draftSeed).
- Takebacks are rejected in draft games (takeback_draft): draft state cannot rewind.
- BuffDock gained an optional onUse prop: online games compute targets from the local replica (public state) but send activation via dtUse; the server re-walks the buff's own targets() chain to validate.
- Spectator page keeps an engine replica (both nerfs no-op) for draft games; history scrubbing is disabled there because mid-game positions cannot be rebuilt from moves alone.

## Known follow-ups

- games table has no ruleset column; archived draft games replay as plain move lists (may diverge after buff board mutations). Needs a schema workstream: ruleset marker + persisted action log.
- server/index.ts (standalone Node server) stays classic-only.
- GameOver does not yet render end.draftBuffs.

## Opening nerf draft (added later the same day)

Online Draft games now open with the same pick-1-of-2 nerf draft as bot games. When the second seat arrives, the worker deals two options per seat (all four distinct, dealt from the match seed RNG so restarts re-deal the same cards; each seat's pair shares a tier and the two seats' tiers sit within one of each other, mirroring pickNerfPair). The match stays un-started until both dtNerfPick frames land: clocks off, moves and buff frames rejected with nerf_pending, the code not joinable and not listed as a lobby challenge. Options are public to both seats; picks stay hidden under the usual reveal rules (picksVisible matches set match.revealed for both colors at finalize, so both rules are open from move one). Spectators and wstart never carry options or picks.

Related: [[2026-07-04-draft-system-audit]]
