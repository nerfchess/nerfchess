// Bundle the arena service (server.ts + src/engine + bots) into one self-
// contained ESM file for the OCI box. src/engine has zero external deps, so
// dist/server.mjs needs only Node's built-ins at runtime.
import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(here, "server.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: resolve(here, "dist/server.mjs"),
  logLevel: "info",
  // `ws` (bundled for the Tier 3 spectator endpoint) probes its optional
  // native addons via require(); give the ESM bundle a working require so the
  // probe falls through to the JS implementation instead of throwing.
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
});

console.log("built arena-service/dist/server.mjs");
