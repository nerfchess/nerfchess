# Online Draft protocol design

Date: 2026-07-04. Implemented on branch claude/draft-multiplayer-protocol (stacked on the draft engine fixes in claude/draft-system-improvements).

## Wire frames

Client: dtPick { index }, dtBank, dtUse { buffIndex, picks }, dtTarget { buffIndex, picks }.
Server: dtOffer (drafting seat only, plus opponent under picksVisible), dtResolved (public, broadcast + spectators), dtUsed (public, broadcast + spectators), dtState (per-seat filtered, never spectators), dtTargetReq (reply to dtTarget). start/wstart/end gained additive draft fields (draft, picksVisible, dtActions, dtState, draftBuffs).

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
- The engine's start-of-game nerf draft screen (pick 1 of 2 nerfs) remains bot-only; online draft games use the standard random nerf assignment.
- GameOver does not yet render end.draftBuffs.

Related: [[2026-07-04-draft-system-audit]]
