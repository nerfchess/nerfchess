/**
 * audit-animations.ts — the tier 1-8 ANIMATION REGISTRY and its CI gate.
 *
 *   npm run test:animations            # verify (exit 1 on any violation)
 *   npm run test:animations -- --write # regenerate docs/animation-registry.json
 *                                      # and re-baseline the shared-flagship ratchet
 *
 * Builds one registry entry for EVERY implemented tier 1-8 upgrade (buff, hex,
 * nerf) recording: name, tier, keep/redesign status, animation id, main object,
 * entrance style, motion path, particle type, board reaction, piece reaction,
 * persistent effect, sound family and ending effect — then uses the registry to
 * detect duplicated flagship animations.
 *
 * Sources of truth (never duplicated here, always read from the real tables):
 *   - engine card data:      src/engine/buffs/library.ts, src/engine/nerfs/library.ts
 *   - core signatures:       BoardEffects.tsx SIGNATURES        (text-parsed; CSS import
 *                            keeps it un-importable under tsx, same as check-sig-plugins)
 *   - plugin plays:          the *Plays.tsx modules named by sigPluginsMerged.tsx
 *   - canvas specs:          src/components/effects/vfxSpecs.ts (imported)
 *   - passive compositions:  src/components/effects/passive/registry.ts (imported)
 *
 * Coverage layers (checked in order): core signature (BoardEffects SIGNATURES),
 * plugin play (*Plays.tsx), then the deterministic generated-signature pipeline
 * (genSignatureCore.ts) which composes a unique family/variant/palette/glyph/
 * finisher play per card id. Nerf flagships are passive-registry compositions.
 *
 * Failure conditions:
 *   F1  an implemented tier 1-8 nerf with NO passive-registry composition
 *       (buffs/hexes can no longer be uncovered: the generated pipeline is
 *       total, and its self-check enforces per-card uniqueness)
 *   F2  two upgrades whose flagship identity AND dressing (palette + emblem)
 *       are byte-identical — a true copy-paste duplicate
 *   F3  the count of tier>=5 upgrades sharing a template without a structural
 *       flourish GREW past the committed baseline (scripts/anim-baseline.json).
 *       Shared low-tier machinery with per-card emblems is allowed (utility
 *       effects), but it must never spread further up the tiers.
 *   F4  a parsed module whose entry parse missed one of its PLAYS keys
 *       (parser drift guard, so F1-F3 can never silently under-count).
 */

import fs from "node:fs";
import path from "node:path";
import { ALL_BUFFS } from "../src/engine/buffs/library";
import { PLAYABLE_NERFS } from "../src/engine/nerfs/library";
import { resolveCardVfx } from "../src/components/effects/vfxSpecs";
import { PASSIVE_REGISTRY, passiveKey } from "../src/components/effects/passive/registry";
import { genSignatureConfig } from "../src/components/effects/genSignatureCore";

const ROOT = path.join(__dirname, "..");
const EFFECTS = path.join(ROOT, "src", "components", "effects");
const OUT_JSON = path.join(ROOT, "docs", "animation-registry.json");
const BASELINE = path.join(__dirname, "anim-baseline.json");
const WRITE = process.argv.includes("--write");

// ---------------------------------------------------------------------------
// Registry entry shape (the fields the audit mandates).
// ---------------------------------------------------------------------------

type Status = "keep" | "polish" | "partial" | "full";

interface RegistryEntry {
  id: string;
  name: string;
  tier: number;
  kind: "buff" | "hex" | "nerf";
  mechanic: "passive" | "instant" | "activated" | "rule";
  status: Status;
  /** Flagship identity used for duplicate detection. */
  animId: string;
  /** True when the flagship is shared with at least one other upgrade. */
  sharedFlagship: boolean;
  mainObject: string;
  entranceStyle: string;
  motionPath: string;
  particleType: string;
  boardReaction: string;
  pieceReaction: string;
  persistentEffect: string;
  soundFamily: string;
  endingEffect: string;
}

// ---------------------------------------------------------------------------
// Source parsing (mirrors scripts/check-sig-plugins.cjs conventions).
// ---------------------------------------------------------------------------

function read(rel: string): string {
  return fs.readFileSync(path.join(EFFECTS, rel), "utf8");
}

/** Slice the body of `export const NAME ... = {` ... matching `^};`. */
function objectBlock(src: string, name: string, file: string): string {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\{`);
  const m = re.exec(src);
  if (!m) throw new Error(`${file}: no "export const ${name}" found`);
  const start = m.index + m[0].length;
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error(`${file}: unterminated ${name} block`);
  return src.slice(start, end);
}

/** Split a PLAYS/SIGNATURES block into per-entry chunks keyed by card id. */
function entryChunks(block: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /\n  ([a-z][a-z0-9_]*):\s/g;
  const hits: { id: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) hits.push({ id: m[1], at: m.index });
  for (let i = 0; i < hits.length; i++) {
    out.set(hits[i].id, block.slice(hits[i].at, hits[i + 1]?.at ?? block.length));
  }
  return out;
}

const field = (chunk: string, key: string): string | undefined =>
  chunk.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];

const victimsOf = (chunk: string): string => {
  const v = chunk.match(/victims:\s*("all"|\[[^\]]*\])/)?.[1] ?? "";
  return v === '"all"' ? "all" : v.replace(/["\s[\]]/g, "") || "-";
};

interface PlayInfo {
  module: string;
  /** Shared template component, or the bespoke per-card scene name. */
  template: string;
  /** Per-card structural flourish key (shared templates only). */
  flourish?: string;
  /** Per-card dressing: palette string and emblem/glyph key. */
  palette?: string;
  emblem?: string;
  /** True when the template is a per-card bespoke scene, not shared machinery. */
  bespokeScene: boolean;
  ordering: string;
  sound: string;
  victims: string;
  source?: string;
}

/** Parse one plugin module's PLAYS table into per-card play info. */
function parsePlaysModule(fileBase: string): Map<string, PlayInfo> {
  const file = `${fileBase}.tsx`;
  const src = read(file);
  const block = objectBlock(src, "PLAYS", file);
  const out = new Map<string, PlayInfo>();
  for (const [id, chunk] of entryChunks(block)) {
    const base = {
      module: fileBase,
      ordering: field(chunk, "ordering") ?? "radial",
      sound: field(chunk, "sound") ?? "-",
      victims: victimsOf(chunk),
      source: field(chunk, "source"),
    };
    // Builder forms: B(Template, [palette], "emblem", {...})
    //                G(Template, [palette], GLYPH.key, {...}, "flourish"?)
    //                S(Scene, {...})
    let m = chunk.match(/:\s*[A-Z]\(\s*(\w+),\s*\[([^\]]*)\],\s*(?:"([a-z0-9_]+)"|GLYPH\.(\w+))/);
    if (m) {
      // The flourish/signet is the argument right after the config object. It
      // may be followed by one more positional flag (basicPlays' `bold` cut),
      // so allow that tail rather than only matching a bare trailing string.
      const flourish = chunk.match(
        /\}\s*,\s*"([a-z0-9_]+)"\s*(?:,\s*(?:true|false)\s*)?\)\s*,?\s*$/m,
      )?.[1];
      out.set(id, {
        ...base,
        template: m[1],
        palette: m[2].replace(/["\s]/g, ""),
        emblem: m[3] ?? m[4],
        flourish,
        bespokeScene: false,
      });
      continue;
    }
    m = chunk.match(/:\s*[A-Z]\(\s*(\w+),\s*\{/); // S(Scene, {...}) — scene per card
    if (m) {
      out.set(id, { ...base, template: m[1], bespokeScene: true });
      continue;
    }
    // Object form: { config: {...}, Render: Scene } or Render: (...) => <Scene id="..."/>
    m = chunk.match(/Render:\s*(\w+)\s*,?/) ?? chunk.match(/Render:.*?=>\s*<(\w+)/s);
    if (m) {
      const idParam = chunk.match(/<\w+[^>]*\bid="([a-z0-9_]+)"/)?.[1];
      out.set(id, {
        ...base,
        template: m[1],
        // A parameterized shared scene keeps per-card identity through its id
        // prop; an unparameterized shared scene would collide (flagged below).
        flourish: idParam,
        bespokeScene: !idParam,
      });
      continue;
    }
    throw new Error(`${file}: could not parse PLAYS entry "${id}"`);
  }
  return out;
}

/** Module list + precedence from sigPluginsMerged.tsx (same as the drift check). */
function pluginModules(): string[] {
  const src = read("sigPluginsMerged.tsx");
  const aliasToFile = new Map<string, string>();
  for (const m of src.matchAll(/import\s*\{\s*PLAYS\s+as\s+(\w+)\s*\}\s*from\s*["']\.\/(\w+)["']/g))
    aliasToFile.set(m[1], m[2]);
  const mi = src.indexOf("const MERGED");
  const body = src.slice(src.indexOf("{", mi), src.indexOf("}", src.indexOf("{", mi)));
  const files: string[] = [];
  for (const m of body.matchAll(/\.\.\.(\w+)/g)) {
    const f = aliasToFile.get(m[1]);
    if (!f) throw new Error(`sigPluginsMerged.tsx: spread ${m[1]} has no PLAYS import`);
    files.push(f);
  }
  return files;
}

interface CoreInfo {
  visual: string;
  ordering: string;
  sound: string;
  victims: string;
  source?: string;
}

function parseCoreSignatures(): Map<string, CoreInfo> {
  const src = fs.readFileSync(path.join(EFFECTS, "BoardEffects.tsx"), "utf8");
  const block = objectBlock(src, "SIGNATURES", "BoardEffects.tsx");
  const out = new Map<string, CoreInfo>();
  for (const [id, chunk] of entryChunks(block)) {
    out.set(id, {
      visual: field(chunk, "visual") ?? "-",
      ordering: field(chunk, "ordering") ?? "radial",
      sound: field(chunk, "sound") ?? "-",
      victims: victimsOf(chunk),
      source: field(chunk, "source"),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assemble the registry.
// ---------------------------------------------------------------------------

// Declared before the assembly loop below, which calls fail() for F4. `problems`
// is a const, so leaving it after that loop put it in the temporal dead zone and
// a real F4 violation threw a ReferenceError instead of reporting itself.
const problems: string[] = [];
function fail(msg: string) {
  problems.push(msg);
}

const core = parseCoreSignatures();
const modules = pluginModules();
const plays = new Map<string, PlayInfo>();
for (const mod of modules) {
  const table = parsePlaysModule(mod);
  // F4 drift guard: every key present in the module's PLAYS parsed correctly.
  const rawKeys = new Set(entryChunks(objectBlock(read(`${mod}.tsx`), "PLAYS", mod)).keys());
  for (const k of rawKeys) if (!table.has(k)) fail(`F4: ${mod}.tsx PLAYS key "${k}" failed to parse`);
  for (const [id, info] of table) if (!plays.has(id)) plays.set(id, info); // first module wins (merge precedence)
}

const entries: RegistryEntry[] = [];

// Buffs and hexes (tier 1-8, implemented) — flagship is the play signature.
const buffs = ALL_BUFFS.filter((b) => b.implemented && b.tier >= 1 && b.tier <= 8);
for (const b of buffs) {
  const kind = b.category === "hex" ? "hex" : "buff";
  const coreInfo = core.get(b.id);
  const play = plays.get(b.id);
  const vfx = resolveCardVfx(b.id, b.tier);
  const persistent =
    b.fx?.motif ??
    coreInfo?.source ??
    play?.source ??
    (b.kind === "passive" && PASSIVE_REGISTRY.get(passiveKey("buff", b.id))
      ? `passive:${PASSIVE_REGISTRY.get(passiveKey("buff", b.id))!.auraKey}`
      : "-");

  let animId: string;
  let entranceStyle: string;
  let mainObject: string;
  let motionPath: string;
  let sound: string;
  let victims: string;
  let ending: string | undefined;
  if (coreInfo) {
    animId = `core:${coreInfo.visual}`;
    entranceStyle = `core signature "${coreInfo.visual}"`;
    mainObject = coreInfo.visual;
    motionPath = coreInfo.ordering;
    sound = coreInfo.sound;
    victims = coreInfo.victims;
  } else if (play) {
    animId = play.bespokeScene
      ? `${play.module}:${play.template}`
      : `${play.module}:${play.template}#${play.flourish ?? "-"}`;
    entranceStyle = play.bespokeScene
      ? `bespoke scene ${play.template}`
      : `${play.template} template${play.flourish ? ` + "${play.flourish}" flourish` : " (shared)"}`;
    mainObject = play.emblem ?? play.flourish ?? play.template;
    motionPath = play.ordering;
    sound = play.sound;
    victims = play.victims;
  } else {
    // Generated signature fallback: cards with no bespoke core scene and no
    // plugin play are rendered by the deterministic generated-signature
    // pipeline (genSignatureCore.ts -> GenSignaturePlay). The config is pure
    // and hash-derived, so the registry can record the exact composition the
    // player sees. The animId captures every visual dimension (family,
    // structural variant, both hues, rotation seed, glyph, finisher), so F2's
    // byte-identical detection still bites if two cards ever hash to the same
    // full composition.
    const g = genSignatureConfig(b.id, b.category, b.tier);
    const v = g.visual;
    animId = `gen:${v.family}#${v.variant}|h${v.hue}/${v.hue2}|r${v.rot}|${v.glyph}|${v.finisher}`;
    entranceStyle = `generated ${v.family} signature (variant ${v.variant}, ${v.glyph} glyph)`;
    mainObject = `${v.family}:${v.glyph}`;
    motionPath = g.ordering;
    sound = g.sound;
    victims = g.victims === "all" ? "all" : g.victims.join("+");
    ending = `finisher:${v.finisher}`;
  }

  entries.push({
    id: b.id,
    name: b.name,
    tier: b.tier,
    kind,
    mechanic: b.kind,
    status: "keep", // provisional; sharing analysis below may downgrade
    animId,
    sharedFlagship: false,
    mainObject,
    entranceStyle,
    motionPath,
    particleType: vfx ? `${vfx.travel}/${vfx.impact}` : "-",
    boardReaction: vfx?.shake ? `shake:${vfx.shake}` : "none",
    pieceReaction: victims,
    persistentEffect: String(persistent),
    soundFamily: sound,
    endingEffect: ending ?? vfx?.aftermath ?? "none",
  });
}

// Nerfs (tier 1-8) — flagship is the passive reveal composition (the passive
// effect language), which the coverage test already keeps unique per card.
for (const n of PLAYABLE_NERFS.filter((n) => n.tier >= 1 && n.tier <= 8)) {
  const v = PASSIVE_REGISTRY.get(passiveKey("nerf", n.id));
  if (!v) {
    fail(`F1: nerf "${n.id}" (t${n.tier}) has no passive-registry composition`);
    continue;
  }
  entries.push({
    id: n.id,
    name: n.name,
    tier: n.tier,
    kind: "nerf",
    mechanic: "rule",
    status: "keep",
    animId: `passive:${v.family}|${v.composition.join("+")}|${v.targetType}|${v.sigilIcon}`,
    sharedFlagship: false,
    mainObject: v.sigilIcon,
    entranceStyle: `${v.family} reveal (${v.composition.join(" + ")})`,
    motionPath: v.targetType,
    particleType: `nodes<=${v.maxNodes}`,
    boardReaction: v.targetType === "board" ? "board-edge ripple" : "none",
    pieceReaction: v.targetType,
    persistentEffect: `aura:${v.auraKey}`,
    soundFamily: v.soundCue ?? "-",
    endingEffect: `exit:${v.exitKey}`,
  });
}

// ---------------------------------------------------------------------------
// Duplicate flagship detection + classification.
// ---------------------------------------------------------------------------

const byAnim = new Map<string, RegistryEntry[]>();
for (const e of entries) {
  (byAnim.get(e.animId) ?? byAnim.set(e.animId, []).get(e.animId)!).push(e);
}

for (const [, group] of byAnim) {
  if (group.length < 2) continue;
  for (const e of group) {
    e.sharedFlagship = true;
    // Shared flagship classification by tier band: low tiers may lean on
    // shared machinery + per-card emblems (utility), high tiers may not.
    e.status = e.tier <= 4 ? "polish" : e.tier <= 6 ? "partial" : "full";
  }
}

// F2: byte-identical dressing on a shared flagship (same template AND same
// palette AND same emblem) — nothing distinguishes the two plays at all.
const exact = new Map<string, string[]>();
for (const e of entries) {
  if (e.kind === "nerf") continue;
  const play = plays.get(e.id);
  const dress = play ? `${e.animId}|${play.palette ?? ""}|${play.emblem ?? ""}` : e.animId;
  (exact.get(dress) ?? exact.set(dress, []).get(dress)!).push(e.id);
}
for (const [dress, ids] of exact) {
  if (ids.length > 1 && dress.includes("|"))
    fail(`F2: byte-identical flagship dressing shared by [${ids.join(", ")}] (${dress})`);
}

// F3 ratchet: shared flagships at tier >= 5 may only shrink.
const sharedHigh = entries.filter((e) => e.sharedFlagship && e.tier >= 5);
const sharedAll = entries.filter((e) => e.sharedFlagship);
let baseline = { sharedFlagshipTier5plus: Infinity as number, sharedFlagshipTotal: Infinity as number };
if (fs.existsSync(BASELINE)) baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
if (!WRITE) {
  if (sharedHigh.length > baseline.sharedFlagshipTier5plus)
    fail(
      `F3: tier>=5 shared flagships grew: ${sharedHigh.length} > baseline ${baseline.sharedFlagshipTier5plus}. ` +
        `Give the new cards their own scene or flourish (or re-baseline deliberately with --write).`,
    );
  if (sharedAll.length > baseline.sharedFlagshipTotal)
    fail(`F3: total shared flagships grew: ${sharedAll.length} > baseline ${baseline.sharedFlagshipTotal}.`);
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

entries.sort((a, b) => a.tier - b.tier || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

const counts = { keep: 0, polish: 0, partial: 0, full: 0 } as Record<Status, number>;
for (const e of entries) counts[e.status]++;

const dupGroups = Array.from(byAnim.entries())
  .filter(([, g]) => g.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(
  `animation registry: ${entries.length} tier 1-8 upgrades ` +
    `(${entries.filter((e) => e.kind === "buff").length} buffs, ` +
    `${entries.filter((e) => e.kind === "hex").length} hexes, ` +
    `${entries.filter((e) => e.kind === "nerf").length} nerfs)`,
);
console.log(
  `status: keep ${counts.keep} | minor polish ${counts.polish} | partial ${counts.partial} | full ${counts.full}`,
);
console.log(
  `shared flagships: ${sharedAll.length} total, ${sharedHigh.length} at tier>=5 across ${dupGroups.length} groups`,
);
for (const [animId, g] of dupGroups.slice(0, 12)) {
  console.log(`  ${String(g.length).padStart(3)}x ${animId}  e.g. ${g.slice(0, 4).map((e) => e.id).join(", ")}`);
}

if (WRITE) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      { generated: "scripts/audit-animations.ts --write", counts, entries },
      null,
      1,
    ) + "\n",
  );
  fs.writeFileSync(
    BASELINE,
    JSON.stringify(
      { sharedFlagshipTier5plus: sharedHigh.length, sharedFlagshipTotal: sharedAll.length },
      null,
      2,
    ) + "\n",
  );
  console.log(`wrote ${path.relative(ROOT, OUT_JSON)} and re-baselined the ratchet.`);
}

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("PASS: animation registry OK.");

// --dump: full duplicate-group listing for redesign planning.
if (process.argv.includes("--dump")) {
  for (const [animId, g] of dupGroups) {
    console.log(`\n${g.length}x ${animId}`);
    for (const e of g) console.log(`   t${e.tier} ${e.kind.padEnd(4)} ${e.id.padEnd(28)} ${e.name}`);
  }
}
