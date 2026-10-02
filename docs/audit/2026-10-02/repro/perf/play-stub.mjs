// What /play would weigh if clearSavedAiGame lived in a module with no engine imports.
import * as esbuild from "../../../../../node_modules/esbuild/lib/main.js";
import zlib from "node:zlib";
const ROOT = ".";
async function run(stub) {
  const r = await esbuild.build({
    absWorkingDir: ROOT, entryPoints: [ROOT + "/src/app/play/page.tsx"], bundle: true, minify: true, format: "esm",
    write: false, outdir: "/tmp/x", splitting: true, logLevel: "error", jsx: "automatic", tsconfig: ROOT + "/tsconfig.json",
    define: { "process.env.NODE_ENV": '"production"' },
    external: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*", "lucide-react"],
    loader: { ".css": "empty" },
    plugins: stub ? [{ name: "stub", setup(b) { b.onLoad({ filter: /gamePersistence\.ts$/ }, () => ({ loader: "ts", contents: 'export const ACTIVE_AI_GAME_KEY="dc:active-ai-game";export function clearSavedAiGame(){try{localStorage.removeItem(ACTIVE_AI_GAME_KEY)}catch{}}' })); } }] : [],
  });
  let b = 0, g = 0; for (const f of r.outputFiles) { b += f.contents.length; g += zlib.gzipSync(f.contents).length; }
  return `${(b / 1024).toFixed(1)}KB min / ${(g / 1024).toFixed(1)}KB gz (all chunks)`;
}
console.log("play as-is:      ", await run(false));
console.log("play with stub:  ", await run(true));
