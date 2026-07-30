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
 *  the generated MODULE_LOADERS map, so a newly registered module is picked up
 *  for free. (It used to read the static MERGED spread, which no longer exists:
 *  the registry moved to per-module dynamic imports so the art is not one
 *  ~9.6MB chunk.) */
function pluginModules(): string[] {
  const src = read("sigPluginsMerged.tsx");
  const out: string[] = [];
  const re = /^\s*(\w+):\s*\(\)\s*=>\s*import\("\.\/(\w+)"\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[2]);
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
    chunk.match(/Render:\s*([A-Z]\w*)/)?.[1] ??
    // An inline arrow that forwards to a shared scene:
    //   Render: ({ lead, delayMs }) => <AthleteScene id="muscle_up" ... />
    // Two cards used this form and were the last pair the gate could not see.
    chunk.match(/Render:\s*\([^)]*\)\s*=>\s*<([A-Z]\w*)/)?.[1] ??
    chunk.match(/:\s*[A-Z]\(\s*([A-Z]\w*)/)?.[1] ??
    null
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
  // `${delayMs + 120}ms`, and the same with the offset from a data row.
  for (const m of body.matchAll(/\$\{[^}]*?\+\s*(\d+(?:\.\d+)?)\s*\}ms/g)) out.push(Number(m[1]));
  // dm(delayMs, 120) — two-arg helper.
  for (const m of body.matchAll(/\b(?:dm|d)\(\s*\w+\s*,\s*(\d+(?:\.\d+)?)\s*\)/g)) {
    out.push(Number(m[1]));
  }
  // d(delayMs + 120) and d(120) — single-arg helper taking an expression.
  for (const m of body.matchAll(/\b(?:dm|d)\(\s*(?:\w+\s*\+\s*)?(\d+(?:\.\d+)?)\s*\)/g)) {
    out.push(Number(m[1]));
  }
  // beat(0.34) / beat(0.34 + i * 0.09) — fractional beats.
  for (const m of body.matchAll(/\bbeat\(\s*(\d+(?:\.\d+)?)/g)) out.push(Number(m[1]) * 1000);
  // delayMs={delayMs + 120} on a child component.
  for (const m of body.matchAll(/delayMs=\{[^}]*?\+\s*(\d+(?:\.\d+)?)\s*\}/g)) out.push(Number(m[1]));
  // A bare numeric delay prop on a local layer helper: <V ... d={280}>.
  for (const m of body.matchAll(/\b(?:d|dl|delay|delayMs)=\{\s*(\d+(?:\.\d+)?)\s*\}/g)) {
    out.push(Number(m[1]));
  }
  // data rows that feed a delay: { d: 120 }, { delay: 120 }, { at: 120 }.
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

/** Class names a scene body mentions, used to look up its CSS rules. */
function classesOf(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (/^[a-z][a-z0-9]{1,6}-[a-z0-9-]{2,}$/i.test(cls) && !TAILWIND.test(cls)) out.push(cls);
    }
  }
  return out;
}

/** Local helper components a scene renders, so geometry applied by a shared
 *  helper counts for the scenes that use it. A shared board-frame that leans by
 *  --fx-side genuinely makes every scene using it directional. */
function helpersOf(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(/<([A-Z]\w*)/g)) out.add(m[1]);
  return [...out];
}

/**
 * Is any layer of this scene driven by the directional geometry?
 *
 * Checked three ways, because all three are legitimate places to apply it and
 * a gate that only looked inline would fail correct work:
 *   1. the component body mentions a geo var directly;
 *   2. a CSS rule for one of the scene's own classes uses one (the usual place
 *      a transform lives);
 *   3. a local helper component the scene renders uses one.
 */
/**
 * Does the CSS apply a geometry var to this class?
 *
 * Three places to look, and missing the third made the gate reject correct
 * work: the class rule itself, a `@keyframes` block of the same name, and the
 * keyframes the class rule names in its `animation:` shorthand. Directional
 * motion almost always lives in the keyframes, not the rule.
 */
function cssGeoForClass(css: string, cls: string): boolean {
  const bodies: string[] = [];
  for (const m of css.matchAll(new RegExp(`\\.${cls}\\b[^{]*\\{([^}]*)\\}`, "g"))) {
    bodies.push(m[1]);
  }
  const kf = (name: string): void => {
    const at = css.indexOf(`@keyframes ${name}`);
    if (at < 0) return;
    const open = css.indexOf("{", at);
    let depth = 0;
    for (let j = open; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") {
        depth--;
        if (depth === 0) {
          bodies.push(css.slice(open, j + 1));
          return;
        }
      }
    }
  };
  kf(cls);
  for (const b of [...bodies]) {
    for (const m of b.matchAll(/animation:\s*([\w-]+)/g)) kf(m[1]);
  }
  return bodies.some((b) => GEO_VARS.some((v) => b.includes(v)));
}

function usesGeometry(body: string, css: string, src: string): boolean {
  if (GEO_VARS.some((v) => body.includes(v))) return true;
  if (classesOf(body).some((cls) => cssGeoForClass(css, cls))) return true;
  for (const h of helpersOf(body)) {
    const hb = componentBody(src, h);
    if (!hb) continue;
    if (GEO_VARS.some((v) => hb.includes(v))) return true;
    if (classesOf(hb).some((cls) => cssGeoForClass(css, cls))) return true;
  }
  return false;
}


// --- Core SIGNATURES art ----------------------------------------------------
//
// The plugin path is card id -> PLAYS entry -> Render component, all in one
// module. The core path has one more hop: a card's SignatureConfig names a
// SigVisual KEY, and sigVisuals.tsx switches on that key to a component. Same
// measures apply once the key is resolved, so these 303 cards were never
// unmeasurable - only unreached.

/** card id -> { visual key, the entry chunk (for the anchor check) }. */
function coreSignatures(): Map<string, { visual: string; chunk: string }> {
  const src = read("BoardEffects.tsx");
  const m = /export const SIGNATURES[^=]*=\s*{/.exec(src);
  if (!m) throw new Error("BoardEffects.tsx: no SIGNATURES table");
  const start = m.index + m[0].length;
  const end = src.indexOf("\n};", start);
  const block = src.slice(start, end);
  const out = new Map<string, { visual: string; chunk: string }>();
  for (const [id, chunk] of entryChunks(block)) {
    const visual = chunk.match(/visual:\s*"([^"]+)"/)?.[1];
    if (visual) out.set(id, { visual, chunk });
  }
  return out;
}

/** SigVisual key -> the component sigVisuals.tsx renders for it. */
function visualComponents(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(/case\s+"([^"]+)":\s*\n?\s*return\s*<([A-Z]\w*)/g)) {
    out.set(m[1], m[2]);
  }
  return out;
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
  // Which card ids this gate actually graded, for the coverage accounting.
  const gradedPlugin = new Set<string>();
  const gradedCore = new Set<string>();

  // --file=<module> grades a module that is NOT yet registered in
  // sigPluginsMerged.tsx. Authoring agents need this: without it they had to
  // wire themselves into that shared file to be discovered, and concurrent
  // batches doing so raced each other's reverts, twice silently dropping a
  // module another batch had just added.
  const only = process.argv.find((a) => a.startsWith("--file="))?.slice(7);
  const modules = only ? [only] : pluginModules();
  for (const mod of modules) {
    const src = read(`${mod}.tsx`);
    // The module's stylesheet, so geometry applied in CSS (where transforms
    // normally live) counts. Missing is fine: some modules ride shared CSS.
    let css = "";
    try {
      css = read(`${mod}.css`);
    } catch {
      css = "";
    }
    for (const [id, chunk] of entryChunks(playsBlock(src, `${mod}.tsx`))) {
      const scene = sceneNameOf(chunk);
      const body = scene ? componentBody(src, scene) : null;
      if (!scene || !body) {
        unmeasurable++;
        continue;
      }
      measured++;
      gradedPlugin.add(id);
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

      // Layers include those contributed by the scene's own local helpers: a
      // scene that composes a board frame, a rail and three props has those
      // layers whether they are inline or one call away.
      const layers = layersOf(
        body + helpersOf(body).map((h) => componentBody(src, h) ?? "").join("\n"),
      );
      const floor = layerFloor(tier);
      if (layers < floor) reasons.push(`${layers} animated layers, tier ${tier} floor is ${floor}`);

      if (hasPureWhite(body)) reasons.push("pure white in the palette (whites must be warm)");
      if (!usesGeometry(body, css, src)) reasons.push("no layer driven by the directional geometry vars");
      if (!/anchor:\s*"(cast|aim|board)"/.test(chunk)) reasons.push("no declared anchor");

      if (reasons.length) findings.push({ id, module: mod, tier, scene, reasons });
    }
  }

  // Core SIGNATURES scenes, unless a single module was named with --file.
  let coreMeasured = 0;
  if (!only) {
    const sigSrc = read("sigVisuals.tsx");
    const byKey = visualComponents(sigSrc);
    // Core art draws on the shared vocabulary, not a per-module sheet, so the
    // geometry lookup gets the shared stylesheets.
    const coreCss = ["effects.css", "godPlays.css"]
      .map((f) => {
        try {
          return read(f);
        } catch {
          return "";
        }
      })
      .join("\n");
    for (const [id, { visual, chunk }] of coreSignatures()) {
      const comp = byKey.get(visual);
      const body = comp ? componentBody(sigSrc, comp) : null;
      if (!comp || !body) {
        unmeasurable++;
        continue;
      }
      coreMeasured++;
      measured++;
      gradedCore.add(id);
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
      const layers = layersOf(
        body + helpersOf(body).map((h) => componentBody(sigSrc, h) ?? "").join("\n"),
      );
      const floor = layerFloor(tier);
      if (layers < floor) reasons.push(`${layers} animated layers, tier ${tier} floor is ${floor}`);
      if (hasPureWhite(body)) reasons.push("pure white in the palette (whites must be warm)");
      if (!usesGeometry(body, coreCss, sigSrc)) {
        reasons.push("no layer driven by the directional geometry vars");
      }
      if (!/anchor:\s*"(cast|aim|board)"/.test(chunk)) reasons.push("no declared anchor");
      if (reasons.length) findings.push({ id, module: "core", tier, scene: comp, reasons });
    }
  }

  const below = findings.length;

  const filter = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  if (filter) {
    for (const f of findings.filter((x) => x.module.includes(filter))) {
      console.log(`  [t${f.tier}] ${f.module}.${f.scene} (${f.id})`);
      for (const r of f.reasons) console.log(`      - ${r}`);
    }
    console.log(`(${findings.filter((x) => x.module.includes(filter)).length} failing in ${filter})`);
  }

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

  // Full accounting, by CARD ID rather than by scene, so it cannot drift.
  // Every registry entry is attributed to the gate that actually checks it and
  // anything left over is NAMED, because a coverage number that quietly
  // excludes a population is worse than no number: it invites the conclusion
  // that the library has been checked when a quarter of it has not.
  //
  // Card counts and scene counts differ on purpose - the tables carry tier
  // 9/10 cards the tier-1-8 registry does not, and one scene can serve
  // several ids - so this counts ids, not scenes.
  const reg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs", "animation-registry.json"), "utf8"),
  ) as { entries: { id: string; animId: string }[] };
  let herePlugin = 0;
  let hereCore = 0;
  let passive = 0;
  let genLeft = 0;
  const unattributed: string[] = [];
  for (const e of reg.entries) {
    if (e.animId.startsWith("passive:")) passive++;
    else if (e.animId.startsWith("gen:")) genLeft++;
    else if (gradedCore.has(e.id)) hereCore++;
    else if (gradedPlugin.has(e.id)) herePlugin++;
    else unattributed.push(e.id);
  }
  console.log(
    `[scene-complexity] coverage of ${reg.entries.length} registry cards: ` +
      `${herePlugin} plugin + ${hereCore} core graded here, ` +
      `${passive} passive compositions graded by test:passive-registry, ` +
      `${genLeft} on the generated fallback (F5 in test:animations), ` +
      `${unattributed.length} unattributed`,
  );
  if (unattributed.length) {
    console.log(
      `[scene-complexity] UNATTRIBUTED (no gate checks these): ${unattributed
        .slice(0, 12)
        .join(", ")}${unattributed.length > 12 ? ` +${unattributed.length - 12} more` : ""}`,
    );
  }

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
