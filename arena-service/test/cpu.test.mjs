// Runs test/cpu.ts as one esbuild bundle (like the deployed arena).
//
// Run:  node test/cpu.test.mjs [--games 60] [--minutes 5] [--warmup 60] [--json out] [--entry <cpu.ts>]
// --entry points the same harness at another copy of the arena modules (the
// before evidence used a git export of the unmodified arena-service).
import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf("--entry");
const entry = i >= 0 ? resolve(process.argv[i + 1]) : resolve(here, "cpu.ts");
const outfile = resolve(dirname(entry), "..", "dist", "cpu.test.bundle.mjs");
await build({
  entryPoints: [entry],
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
