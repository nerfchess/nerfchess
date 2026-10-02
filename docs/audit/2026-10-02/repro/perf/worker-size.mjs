// Size of worker.ts's own code (DO + engine), excluding the OpenNext handler.
import * as esbuild from "../../../../../node_modules/esbuild/lib/main.js";
import zlib from "node:zlib";
const ROOT = ".";
const r = await esbuild.build({ absWorkingDir: ROOT, entryPoints: [ROOT + "/worker.ts"], bundle: true, minify: true, format: "esm", platform: "neutral", write: false, logLevel: "error",
  external: ["./.open-next/*", "cloudflare:*", "node:*", "postgres"], tsconfig: ROOT + "/tsconfig.json", metafile: true, mainFields: ["module", "main"] });
const b = r.outputFiles[0].contents; console.log(`worker.ts own code: ${(b.length / 1024).toFixed(0)}KB min / ${(zlib.gzipSync(b).length / 1024).toFixed(0)}KB gz`);
