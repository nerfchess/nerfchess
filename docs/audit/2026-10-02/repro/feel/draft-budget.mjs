// How much of the ONLINE draft decision window the presentation eats, from the
// constants as they stand in the repo (read-only regex over the sources).
// Server: dtDeadline = offer + draftPrepMs + draftLockInMs (worker.ts). Client:
// the overlay waits for board spectacles (useSignatureQueue busy, capped by
// ANIMATIONS_SETTLE_CAP_MS), then hold + tear + deal, then reveals the SERVER
// deadline (OnlineMatch passes draftDeadline to the countdown).
import fs from "node:fs";
const R = "./";
const num = (file, re) => Number(fs.readFileSync(R + file, "utf8").match(re)[1].replace(/_/g, ""));
const prep = num("worker.ts", /const draftPrepMs = ([\d_]+)/);
const lockIn = num("worker.ts", /const draftLockInMs = (\d+) \* 1000/) * 1000;
const cap = num("src/lib/useDraftSequence.ts", /const ANIMATIONS_SETTLE_CAP_MS = ([\d_]+)/);
const spacing = num("src/components/effects/useSignatureQueue.ts", /const SPACING_MS = ([\d_]+)/);
const hold = num("src/components/DraftOverlay.tsx", /const PACK_HOLD_MS = ([\d_]+)/);
const vaultOpen = num("src/components/DraftVault.tsx", /VAULT_OPEN_MS = ([\d_]+)/);
const overlap = num("src/components/DraftOverlay.tsx", /const DEAL_OVERLAP_MS = ([\d_]+)/);
const flipStagger = num("src/components/DraftOverlay.tsx", /const FLIP_STAGGER_MS = ([\d_]+)/);
const dealMs = num("src/components/DraftOverlay.tsx", /const DEAL_MS = ([\d_]+)/);
const flipOverlap = num("src/components/DraftOverlay.tsx", /const FLIP_OVERLAP_MS = ([\d_]+)/);
const headline = num("src/components/DraftOverlay.tsx", /const FLIP_HEADLINE_MS = ([\d_]+)/);
const tear = Math.max(0, vaultOpen - overlap);
const deal2 = 1 * flipStagger + (dealMs - flipOverlap) + headline; // 2-card offer, normal tempo
const present = hold + tear + deal2;
console.log({ prep, lockIn, cap, spacing, hold, vaultOpen, tear, deal2, presentQuietBoard: present });
for (const [label, busy] of [
  ["quiet board", 0],
  ["one spectacle, fxDuration 1.0", spacing],
  ["one spectacle, fxDuration 1.5", spacing * 1.5],
  ["one spectacle, fxDuration 2.0", spacing * 2],
  ["queued spectacles (cap)", cap],
]) {
  const total = Math.min(busy, cap) + present;
  const lost = Math.max(0, total - prep);
  console.log(`${label.padEnd(32)} overlay ready after ${String(total).padStart(5)}ms; countdown shows ${((lockIn - lost) / 1000).toFixed(1)}s of ${lockIn / 1000}s (${lost}ms lost)`);
}
