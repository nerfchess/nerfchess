// Runs test/parity.ts as one esbuild bundle (the way the arena itself ships),
// so the engine's module state (the draft-pool overrides) is a single
// instance. Under tsx the arena's ESM package loaded the engine twice.
//
// Run:  node test/parity.test.mjs   (from arena-service/)
import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(here, "..", "dist", "parity.test.bundle.mjs");
await build({
  entryPoints: [resolve(here, "parity.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile,
  logLevel: "warning",
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
});
await import(pathToFileURL(outfile).href);
