// Scene complexity gate.
//
//   npm run test:scene-complexity              # verify (exit 1 on growth)
//   npm run test:scene-complexity -- --write   # re-baseline (shrink-only)
//   npm run test:scene-complexity -- --report  # reason histogram
//
// WHY THIS EXISTS
//
// The animation registry already polices IDENTITY: two cards must not share a
// flagship (audit-animations.ts F2/F3). It says nothing about whether a
// flagship is any GOOD, and the failure this project set out to fix is not
// "two cards look alike" but "every card is one pop and done". A fan-out of
// dozens of authoring agents can satisfy every uniqueness rule and still
// produce two thousand two-layer bursts.
//
// So this measures the design language in docs/animation-design-brief.md
// directly, per card:
//
//   beats     tell -> strike -> settle: something early, something at the hit,
//             something decaying after it.
//   layers    distinct animated things, against a per-tier floor.
//   geometry  at least one layer driven by the directional custom properties,
//             which is what makes a scene point at what it is doing rather
//             than just decorate the square it landed on.
//   palette   warm whites, never pure #fff.
//   anchor    a declared anchor, so the scene has an opinion about WHERE it
//             happens.
//
// HOW IT MEASURES
//
// By parsing module source, the same way audit-animations.ts does. That is a
// heuristic, not a proof: a scene that declares delays it never uses can fool
// it. It is calibrated to catch the failure that actually happens (thin
// scenes) and to stay quiet when it cannot tell, which is why a scene whose
// component it cannot locate is counted as unmeasurable rather than failed.
//
// It is a RATCHET. The count below the floor may only shrink, so the existing
// library is not held hostage to a standard written after it, and no wave of
// new work can quietly add to the debt.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const EFFECTS = path.join(ROOT, "src", "components", "effects");
const BASELINE = path.join(ROOT, "scripts", "scene-complexity-baseline.json");

const WRITE = process.argv.includes("--write");
const REPORT = process.argv.includes("--report");

/** Distinct animated layers required, by tier band. */
function layerFloor(tier: number): number {
  if (tier >= 9) return 8;
  if (tier >= 7) return 6;
  if (tier >= 4) return 5;
  return 4;
}

/**
 * A tell must land inside the first third of the scene to read as
 * anticipation, and a settle in the last half to read as decay. Both are
 * fractions of the scene's OWN span rather than absolute milliseconds, so the
 * ms idiom and the fractional-beat idiom grade alike.
 */
const TELL_FRACTION = 0.35;
const SETTLE_FRACTION = 0.55;

const GEO_VARS = [
  "--fx-ang",
  "--fx-len",
  "--fx-index",
  "--fx-n",
  "--fx-side",
  "--fx-ox",
  "--fx-oy",
  "--fx-aim-x",
  "--fx-aim-y",
];

interface Finding {
  id: string;
  module: string;
  tier: number;
  scene: string;
  reasons: string[];
}

// --- Source parsing ---------------------------------------------------------

function read(rel: string): string {
  return fs.readFileSync(path.join(EFFECTS, rel), "utf8");
}

/** Every plugin module, discovered the way check-sig-plugins.cjs does it: from
 *  the MERGED spread, so a newly added module is picked up for free. */
function pluginModules(): string[] {
  const src = read("sigPluginsMerged.tsx");
  const aliasToFile = new Map<string, string>();
  const importRe = /import\s*{\s*PLAYS\s+as\s+(\w+)\s*}\s*from\s*["']\.\/(\w+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src))) aliasToFile.set(m[1], m[2]);
  const mi = src.indexOf("const MERGED");
  const open = src.indexOf("{", mi);
  const close = src.indexOf("}", open);
  const body = src.slice(open, close);
  const out: string[] = [];
  const spreadRe = /\.\.\.(\w+)/g;
  while ((m = spreadRe.exec(body))) {
    const f = aliasToFile.get(m[1]);
    if (f) out.push(f);
  }
  return out;
}

function playsBlock(src: string, file: string): string {
  const m = /export const PLAYS[^=]*=\s*{/.exec(src);
  if (!m) throw new Error(`${file}: no "export const PLAYS" found`);
  const start = m.index + m[0].length;
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error(`${file}: unterminated PLAYS block`);
  return src.slice(start, end);
}

/** Per-entry chunks keyed by card id. Same two-space-indent contract the
 *  animation audit relies on; drift is caught by that audit's F4. */
function entryChunks(block: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /\n {2}([a-z][a-z0-9_]*):\s/g;
  const hits: { id: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) hits.push({ id: m[1], at: m.index });
  for (let i = 0; i < hits.length; i++) {
    out.set(hits[i].id, block.slice(hits[i].at, hits[i + 1]?.at ?? block.length));
  }
  return out;
}

/** The component an entry renders. Handles the plain shape (`Render: Scene`)
 *  and the terse per-module helpers (`S(Scene, {...})`, `B(Template, ...)`). */
function sceneNameOf(chunk: string): string | null {
  return (
    chunk.match(/Render:\s*([A-Z]\w*)/)?.[1] ?? chunk.match(/:\s*[A-Z]\(\s*([A-Z]\w*)/)?.[1] ?? null
  );
}

/**
 * A component's body, by brace matching from its declaration. Null when it is
 * not declared in this module, which the caller treats as unmeasurable.
 *
 * Every scene component in this codebase destructures its props, so the first
 * `{` after the name belongs to the PARAMETER LIST, not the body. Skipping to
 * the matching `)` first is load-bearing: without it the matcher returns the
 * parameter list and every scene grades as one layer and one beat.
 */
function componentBody(src: string, name: string): string | null {
  const m =
    new RegExp(`function\\s+${name}\\s*\\(`).exec(src) ??
    new RegExp(`const\\s+${name}\\s*(?::[^=]+)?=\\s*\\(`).exec(src);
  if (!m) return null;
  const openParen = m.index + m[0].length - 1;
  let paren = 0;
  let bodyStart = -1;
  for (let j = openParen; j < src.length; j++) {
    if (src[j] === "(") paren++;
    else if (src[j] === ")") {
      paren--;
      if (paren === 0) {
        bodyStart = src.indexOf("{", j);
        break;
      }
    }
  }
  if (bodyStart < 0) return null;
  let depth = 0;
  for (let j = bodyStart; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return src.slice(bodyStart, j + 1);
    }
  }
  return null;
}

// --- Measurement ------------------------------------------------------------

/**
 * The scene's delay bands, as UNITLESS numbers.
 *
 * Modules express delays in at least four idioms, and a gate that understood
 * only one would grade most of the library as a single beat when it is not:
 * `${delayMs + 120}ms`, the same with the offset coming from a data row
 * (`${delayMs + s.d}ms` where the row says `d: 120`), `beat(0.34 + i * 0.09)`
 * in fractional beats, and `dm(delayMs, 120)`.
 *
 * Every plausible delay number is collected and compared only to the others,
 * so ms and beats both work.
 */
function delaysOf(body: string): number[] {
  const out: number[] = [0];
  for (const m of body.matchAll(/\$\{[^}]*?\+\s*(\d+(?:\.\d+)?)\s*\}ms/g)) out.push(Number(m[1]));
  for (const m of body.matchAll(/\b(?:dm|d)\(\s*\w+\s*,\s*(\d+(?:\.\d+)?)\s*\)/g)) {
    out.push(Number(m[1]));
  }
  for (const m of body.matchAll(/\bbeat\(\s*(\d+(?:\.\d+)?)/g)) out.push(Number(m[1]) * 1000);
  for (const m of body.matchAll(/\b(?:d|dl|delay|at)\s*:\s*(\d+(?:\.\d+)?)\b/g)) {
    out.push(Number(m[1]));
  }
  return out;
}

/** Tailwind utilities that look like scene classes but are positioning. */
const TAILWIND =
  /^(absolute|relative|fixed|static|sticky|inset|left|right|top|bottom|h|w|ml|mt|mr|mb|mx|my|z|flex|items|justify|self|rounded|origin|translate|scale|rotate|skew|overflow|pointer|opacity|bg|text|border|block|inline|grid|col|row|gap|space|min|max|p|px|py|pt|pb|pl|pr|aspect|object|transform|transition|duration|delay|ease|animate|backdrop|mix|isolate|will|font|leading|tracking|shadow|ring|outline|cursor|select|whitespace|truncate|sr)-/;

/**
 * Distinct animated layers: this module's own scene classes anywhere in the
 * component body.
 *
 * Scanned across all string literals rather than just `className="..."`,
 * because layers are routinely built by mapping a data array whose rows carry
 * their own class, or composed into template literals. Counted by distinct
 * class NAME, so ten shards sharing one class are one layer: a layer is a
 * distinct thing happening, not a distinct element.
 */
function layersOf(body: string): number {
  const classes = new Set<string>();
  for (const m of body.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (!/^[a-z][a-z0-9]{1,6}-[a-z0-9-]{2,}$/i.test(cls)) continue;
      if (TAILWIND.test(cls)) continue;
      classes.add(cls);
    }
  }
  return classes.size;
}

function hasPureWhite(body: string): boolean {
  return /#ffffff\b/i.test(body) || /#fff\b/i.test(body);
}

function usesGeometry(body: string): boolean {
  return GEO_VARS.some((v) => body.includes(v));
}

// --- Run --------------------------------------------------------------------

function cardTiers(): Map<string, number> {
  const reg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs", "animation-registry.json"), "utf8"),
  ) as { entries: { id: string; tier: number }[] };
  return new Map(reg.entries.map((e) => [e.id, e.tier]));
}

function main(): void {
  const tiers = cardTiers();
  const findings: Finding[] = [];
  let measured = 0;
  let unmeasurable = 0;

  for (const mod of pluginModules()) {
    const src = read(`${mod}.tsx`);
    for (const [id, chunk] of entryChunks(playsBlock(src, `${mod}.tsx`))) {
      const scene = sceneNameOf(chunk);
      const body = scene ? componentBody(src, scene) : null;
      if (!scene || !body) {
        unmeasurable++;
        continue;
      }
      measured++;
      const tier = tiers.get(id) ?? 1;
      const reasons: string[] = [];

      const delays = delaysOf(body);
      const span = Math.max(...delays);
      const bands = new Set(delays).size;
      const hasTell = span > 0 && delays.some((d) => d > 0 && d <= span * TELL_FRACTION);
      const hasSettle = span > 0 && delays.some((d) => d >= span * SETTLE_FRACTION);
      if (bands < 3) reasons.push(`only ${bands} delay band(s): no tell -> strike -> settle`);
      else if (!hasTell) reasons.push("no anticipation beat before the strike");
      else if (!hasSettle) reasons.push("no settle beat after the strike");

      const layers = layersOf(body);
      const floor = layerFloor(tier);
      if (layers < floor) reasons.push(`${layers} animated layers, tier ${tier} floor is ${floor}`);

      if (hasPureWhite(body)) reasons.push("pure white in the palette (whites must be warm)");
      if (!usesGeometry(body)) reasons.push("no layer driven by the directional geometry vars");
      if (!/anchor:\s*"(cast|aim|board)"/.test(chunk)) reasons.push("no declared anchor");

      if (reasons.length) findings.push({ id, module: mod, tier, scene, reasons });
    }
  }

  const below = findings.length;

  if (REPORT) {
    const hist = new Map<string, number>();
    for (const f of findings) {
      for (const r of f.reasons) {
        const k = r.replace(/\d+/g, "N");
        hist.set(k, (hist.get(k) ?? 0) + 1);
      }
    }
    console.log("reason histogram:");
    for (const [k, v] of [...hist.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
  }

  const baseline = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, "utf8")) as { belowComplexityFloor: number })
    : { belowComplexityFloor: Number.POSITIVE_INFINITY };

  console.log(
    `[scene-complexity] measured ${measured} scenes (${unmeasurable} not measurable from source), ` +
      `${below} below the floor; baseline ${baseline.belowComplexityFloor}`,
  );

  if (WRITE) {
    if (below > baseline.belowComplexityFloor && !process.argv.includes("--allow-raise")) {
      console.error(
        `REFUSING to re-baseline upward: ${below} > ${baseline.belowComplexityFloor}. ` +
          "The ratchet is shrink-only. Pass --allow-raise only if the increase is deliberate.",
      );
      process.exit(1);
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ belowComplexityFloor: below }, null, 2)}\n`);
    console.log(`[scene-complexity] baseline written: ${below}`);
    return;
  }

  if (below > baseline.belowComplexityFloor) {
    const worst = findings.sort((a, b) => b.tier - a.tier).slice(0, 25);
    console.error(
      `\nFAIL: scenes below the complexity floor grew to ${below} (baseline ${baseline.belowComplexityFloor}).`,
    );
    for (const f of worst) {
      console.error(`  [t${f.tier}] ${f.module}.${f.scene} (${f.id})`);
      for (const r of f.reasons) console.error(`      - ${r}`);
    }
    console.error(
      "\nThe floor is in docs/animation-design-brief.md: three beats, the tier's " +
        "layer count, warm whites, one layer that reads the geometry vars, and a " +
        "declared anchor.",
    );
    process.exit(1);
  }
  console.log("PASS: scene complexity OK.");
}

main();
