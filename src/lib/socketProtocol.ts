// Constants shared by the game server (worker.ts) and the browser socket client
// (src/lib/multiplayer.ts). Plain values only: this file is imported by both
// the Durable Object bundle and client components.

/**
 * WebSocket close code the server sends to a seat's older socket when the same
 * seat is claimed from another tab or device. The client that receives it must
 * NOT auto-reconnect (that is how two tabs used to steal the seat back and
 * forth forever, F082); it reports the seat as taken elsewhere and waits for the
 * reader to reclaim it. 4000-4999 is the range RFC 6455 leaves to applications.
 */
export const SEAT_SUPERSEDED_CLOSE = 4001;

/**
 * WebSocket close code for a socket that keeps flooding the server after being
 * throttled (policy violation, RFC 6455 section 7.4.1). The client treats it
 * like any other drop.
 */
export const SOCKET_POLICY_CLOSE = 1008;

/**
 * Largest client frame the game server parses, in bytes. The biggest real frame
 * is a card activation with a handful of target squares (well under 1KB); 8KB
 * leaves room for growth while keeping a hostile frame from costing a large
 * JSON.parse on the single-threaded Durable Object.
 */
export const MAX_CLIENT_FRAME_BYTES = 8192;
