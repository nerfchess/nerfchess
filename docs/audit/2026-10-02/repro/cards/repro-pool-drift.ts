// A stored draft "pick" replays as an INDEX into an offer re-rolled from the
// current pool. Removing one card from a tier pool (what a code retirement does,
// simulated here with the moderator "off" list) changes which card that index
// resolves to for the same seed.
import { newGame, enableDraftMode, legalMoves, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { setDraftPoolOverrides } from "../../../../../src/engine/draft";
function offersAfter(plies: number) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 5);
  enableDraftMode(g, 1234, { mode: "buff" });
  g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  let G = g;
  const seen: string[] = [];
  for (let p = 0; p < plies; p++) {
    for (const c of ["w", "b"] as const) { const o = G.buffs!.players[c].offer; if (o) { seen.push(`${c}#${o.index}:` + o.cards.map((x) => x.id).join("|")); G.buffs!.players[c].offer = null; } }
    G = playMove(G, legalMoves(G).sort((a, b) => a.from - b.from || a.to - b.to)[0]);
  }
  return seen;
}
const base = offersAfter(40);
const victim = base[0].split(":")[1].split("|")[0];
setDraftPoolOverrides({ off: [victim] });
const after = offersAfter(40);
setDraftPoolOverrides(null);
let diff = 0; for (let i = 0; i < Math.min(base.length, after.length); i++) if (base[i] !== after[i]) diff++;
console.log(`removed one card (${victim}) from the pool; offers compared: ${base.length}; offers that changed: ${diff}`);
console.log(" before:", base.slice(0, 3).join("  ")); console.log(" after: ", after.slice(0, 3).join("  "));
