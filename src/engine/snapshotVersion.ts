// The public spectator snapshot schema version, in a leaf module with no
// imports. engine/game.ts re-exports it, so server code is unchanged, but the
// client spectate helpers (featured selection, spectator sync) read it from
// here: importing it from engine/game.ts pulled the whole rules engine and
// both card libraries into every page that shows a featured board, the home
// page included.
//
// PUBLIC_SNAPSHOT_VERSION is independent of GAME_SNAPSHOT_VERSION and of the
// worker's REPLAY_VERSION. A client that sees an unrecognized schemaVersion
// rejects the frame (a later stage) rather than rendering a wrong board.
export const PUBLIC_SNAPSHOT_VERSION = 1;
