// Bundle the engine service (server.ts + the src/engine + bots move path) into
// a single self-contained ESM file for the OCI box. src/engine has zero
// external deps, so dist/server.mjs needs only Node's built-ins at runtime.
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
});

console.log("built engine-service/dist/server.mjs");
