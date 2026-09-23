// Slice J guard (F085): every player-initiated frame the game view sends must
// look at the boolean the session returns (false = the socket was not open),
// so a disconnected player is told instead of watching a button do nothing.
// Automatic sends that retry on their own are allowlisted.
//
//   ./node_modules/.bin/tsx scripts/polish/j/check-session-sends.ts
import fs from "node:fs";

const FILES = ["src/components/OnlineMatch.tsx"];
// Background sends: re-issued by the reconnect loop or harmless to lose.
const AUTOMATIC = new Set(["resync", "requestClocks", "dropHeldMove"]);

const mp = fs.readFileSync("src/lib/multiplayer.ts", "utf8");
const boolSends = new Set([...mp.matchAll(/^ {2}([a-zA-Z]+)\([^)]*\): boolean \{/gm)].map((m) => m[1]));

let bad = 0;
for (const file of FILES) {
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      // A bare statement: the return value goes nowhere.
      const m = /^\s+session\.([a-zA-Z]+)\(.*\);\s*$/.exec(line);
      if (!m || !boolSends.has(m[1]) || AUTOMATIC.has(m[1])) return;
      bad++;
      console.error(`${file}:${i + 1}: session.${m[1]}() result discarded`);
    });
}
if (bad) {
  console.error(`[check-session-sends] ${bad} player send(s) ignore a closed socket`);
  process.exit(1);
}
console.log(`[check-session-sends] OK: ${boolSends.size} boolean sends, none discarded`);
