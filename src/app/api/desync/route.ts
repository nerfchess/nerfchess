import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Desync telemetry sink. The client calls this only when its recomputed game
// fingerprint disagrees with the server's (see src/engine/desync.ts). We log a
// single structured line to the worker logs rather than writing a row, so the
// endpoint can never bloat the D1 table or spike the Durable Object under a
// buggy client that spams it. Grep the logs for "DESYNC" to see which rules
// (nerfs, hexes, buff effects) keep showing up: that names the culprit instead
// of hunting blind.
//
// Shape (all optional, defensively parsed): {
//   gameId, clientHash, serverHash,
//   diverged: { pos, moves, rules },
//   rules: string[]   // the culprit shortlist from compareFingerprints
// }
export async function POST(request: Request) {
  let body: {
    gameId?: unknown;
    clientHash?: unknown;
    serverHash?: unknown;
    diverged?: unknown;
    rules?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const str = (v: unknown, cap: number) => (typeof v === "string" ? v.slice(0, cap) : "");
  const gameId = str(body.gameId, 24);
  const clientHash = str(body.clientHash, 16);
  const serverHash = str(body.serverHash, 16);
  // If the two hashes match there is no divergence to record; ignore quietly so
  // a mis-firing client cannot fill the logs with non-events.
  if (!clientHash || !serverHash || clientHash === serverHash) {
    return NextResponse.json({ ok: true });
  }

  const rules = Array.isArray(body.rules)
    ? body.rules.filter((r): r is string => typeof r === "string").slice(0, 40).map((r) => r.slice(0, 48))
    : [];
  const diverged =
    body.diverged && typeof body.diverged === "object"
      ? {
          pos: !!(body.diverged as Record<string, unknown>).pos,
          moves: !!(body.diverged as Record<string, unknown>).moves,
          rules: !!(body.diverged as Record<string, unknown>).rules,
        }
      : { pos: false, moves: false, rules: false };

  console.warn(
    "DESYNC " +
      JSON.stringify({
        gameId,
        clientHash,
        serverHash,
        diverged,
        rules,
      }),
  );

  return NextResponse.json({ ok: true });
}
