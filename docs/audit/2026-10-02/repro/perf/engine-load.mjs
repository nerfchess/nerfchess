// Cold module-evaluation cost of the engine + card libraries (proxy for client
// parse/eval on the game route and for Worker isolate startup).
import * as esbuild from "../../../../../node_modules/esbuild/lib/main.js";
import fs from "node:fs";
const ROOT = ".";
fs.writeFileSync("out/engine-entry.ts", `export * from "${ROOT}/src/engine/game"; export { ALL_BUFFS } from "${ROOT}/src/engine/buffs/library"; export { PLAYABLE_NERFS } from "${ROOT}/src/engine/nerfs/library";`);
await esbuild.build({ entryPoints: ["out/engine-entry.ts"], bundle: true, minify: true, format: "esm", platform: "node", outfile: "out/engine.mjs", logLevel: "error", tsconfig: ROOT + "/tsconfig.json" });
const t0 = performance.now();
const m = await import("./out/engine.mjs");
const t1 = performance.now();
console.log(`engine bundle ${(fs.statSync("out/engine.mjs").size / 1024).toFixed(0)}KB; import+eval ${(t1 - t0).toFixed(0)}ms; buffs ${m.ALL_BUFFS.length}, nerfs ${m.PLAYABLE_NERFS.length}`);
