// Static check: every passive effect composition has a sound family cue, and
// every cue family is actually handled by the sound dispatcher.
//
// Every card's persistent effect (nerf reveal, buff/boon/hex acquisition) is
// voiced once on spawn via PassiveSpawn -> playPassiveCue, keyed by the
// composition's `soundCue` ("passive/<family>"). This check guarantees the two
// halves stay in sync: no composition may carry a cue the dispatcher silently
// drops, and none may be left without a cue.
//
// Run: node scripts/check-sound-coverage.cjs

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const COMPOSITIONS = path.join(ROOT, "src/components/effects/passive/compositions.ts");
const SOUNDS = path.join(ROOT, "src/lib/sounds.ts");

function fail(msg) {
  console.error("[check-sound-coverage] FAIL: " + msg);
  process.exit(1);
}

const compSrc = fs.readFileSync(COMPOSITIONS, "utf8");
const soundsSrc = fs.readFileSync(SOUNDS, "utf8");

// Each composition entry is one object literal with a `cardId:` field. Count
// them, then count the soundCue fields: they must match one-to-one so no entry
// is left unvoiced.
const cardIdCount = (compSrc.match(/\bcardId:\s*"/g) || []).length;
const cueMatches = compSrc.match(/\bsoundCue:\s*"([^"]+)"/g) || [];
const cueValues = cueMatches.map((m) => m.replace(/.*"([^"]+)".*/, "$1"));

if (cardIdCount === 0) fail("no composition entries found (parse error?)");
if (cueValues.length !== cardIdCount) {
  fail(
    `${cardIdCount - cueValues.length} of ${cardIdCount} compositions have no soundCue ` +
      `(entries=${cardIdCount}, cues=${cueValues.length})`,
  );
}

// Distinct families used by the compositions.
const usedFamilies = new Map();
for (const cue of cueValues) {
  const fam = cue.startsWith("passive/") ? cue.slice("passive/".length) : cue;
  usedFamilies.set(fam, (usedFamilies.get(fam) || 0) + 1);
}

// Families the dispatcher actually handles: the keys of the CUE_FN map in
// sounds.ts. Parse the map body so this tracks the real code.
const mapMatch = soundsSrc.match(/const CUE_FN[^{]*{([\s\S]*?)}/);
if (!mapMatch) fail("could not find the CUE_FN dispatch map in sounds.ts");
const handled = new Set(
  (mapMatch[1].match(/\b(\w+):\s*playCue\w+/g) || []).map((m) => m.split(":")[0].trim()),
);

// Every handled family must have a real exported voice function.
for (const fam of handled) {
  const fn = "playCue" + fam.charAt(0).toUpperCase() + fam.slice(1);
  if (!new RegExp(`export function ${fn}\\b`).test(soundsSrc)) {
    fail(`CUE_FN maps "${fam}" but sounds.ts has no exported ${fn}()`);
  }
}

// Every family used by a composition must be handled by the dispatcher.
const unhandled = [...usedFamilies.keys()].filter((f) => !handled.has(f));
if (unhandled.length) {
  fail(
    `these composition sound families have no dispatcher voice: ${unhandled.join(", ")}. ` +
      `Add a playCue* function and a CUE_FN entry in sounds.ts.`,
  );
}

// Confirm the spawn actually calls the dispatcher (the wiring, not just the map).
if (!/playPassiveCue\(/.test(fs.readFileSync(path.join(ROOT, "src/components/effects/passive/PassiveSpawn.tsx"), "utf8"))) {
  fail("PassiveSpawn.tsx does not call playPassiveCue; passive cues would never fire");
}

const summary = [...usedFamilies.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([f, n]) => `${f}:${n}`)
  .join("  ");
console.log(
  `[check-sound-coverage] OK: all ${cardIdCount} passive effect compositions carry a sound cue; ` +
    `${handled.size} families, all wired to a dispatcher voice.`,
);
console.log("  coverage by family: " + summary);
