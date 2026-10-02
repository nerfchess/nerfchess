const CF = new URL("./stubs/cloudflare-workers.mjs", import.meta.url).href;
const ON = new URL("./stubs/open-next-worker.mjs", import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: CF, shortCircuit: true };
  if (specifier.endsWith(".open-next/worker.js")) return { url: ON, shortCircuit: true };
  return next(specifier, context);
}
