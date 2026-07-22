// audit-cards.ts — the overhaul's Core Requirement 1 audit matrix.
//
//   npx -y tsx scripts/audit-cards.ts            # write docs/card-audit.{json,md}
//   npx -y tsx scripts/audit-cards.ts --check    # verify current (CI gate)
//
// One row for EVERY card in the game (every buff, hex, boon, item, apex, and
// nerf; enabled or not), each with:
//   id, name, kind (buff/hex/boon/item/nerf), tier, exact effect text,
//   trigger (mechanic kind + hooks), duration class, targets, mechanic
//   signature, animation coverage (bespoke/plugin/generated/canvas/passive),
//   implementation location (module file), test coverage (scripts referencing
//   the id), status flags (working / broken / duplicate-signature /
//   near-duplicate-description / dominated-candidate / misleading), and the
//   final action taken (merged from scripts/card-actions.json, the hand-
//   curated decision record the balance pass maintains).
//
// Everything except card-actions.json is DERIVED from the code, so the audit
// can never drift from reality; the actions file is the deliberate-review
// output the overhaul demands ("final action taken" per card).

import fs from "node:fs";
import path from "node:path";
import { ALL_BUFFS } from "../src/engine/buffs/library";
import { ALL_NERFS } from "../src/engine/nerfs/library";
import { isBoon } from "../src/engine/buff";
import type { Buff } from "../src/engine/buff";

const ROOT = path.join(__dirname, "..");
const OUT_JSON = path.join(ROOT, "docs", "card-audit.json");
const OUT_MD = path.join(ROOT, "docs", "card-audit.md");
const ACTIONS = path.join(__dirname, "card-actions.json");
const CHECK = process.argv.includes("--check");

// --- Implementation locations -------------------------------------------------

const ENGINE_DIRS = [
  path.join(ROOT, "src", "engine", "buffs"),
  path.join(ROOT, "src", "engine", "nerfs"),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** card id -> repo-relative module that defines it (first `id: "x"` hit). */
function buildLocations(): Map<string, string> {
  const loc = new Map<string, string>();
  for (const dir of ENGINE_DIRS) {
    for (const file of walk(dir)) {
      const text = fs.readFileSync(file, "utf8");
      const rel = path.relative(ROOT, file);
      const re = /id:\s*["']([a-z0-9_]+)["']/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (!loc.has(m[1])) loc.set(m[1], rel);
      }
    }
  }
  return loc;
}

// --- Test coverage --------------------------------------------------------------

/** card id -> test/sim scripts that mention it. */
function buildTestCoverage(ids: Set<string>): Map<string, string[]> {
  const cover = new Map<string, string[]>();
  const dirs = [path.join(ROOT, "scripts"), path.join(ROOT, "e2e")];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir)) {
      if (!/\.(ts|cjs|mjs|js)$/.test(e)) continue;
      if (e === "audit-cards.ts") continue;
      const text = fs.readFileSync(path.join(dir, e), "utf8");
      for (const id of ids) {
        // Word-boundary match keeps pawn_push from matching pawn_push_two.
        if (new RegExp(`["'\`]${id}["'\`]`).test(text)) {
          const arr = cover.get(id) ?? [];
          arr.push(e);
          cover.set(id, arr);
        }
      }
    }
  }
  return cover;
}

// --- Animation coverage ----------------------------------------------------------

type AnimCoverage = {
  bespoke: boolean;
  plugin: boolean;
  canvasVfx: boolean;
  passive: boolean;
  generated: boolean; // the guaranteed fallback for buff-family cards
};

function buildAnimationCoverage(): Map<string, AnimCoverage> {
  const map = new Map<string, AnimCoverage>();
  const effects = path.join(ROOT, "src", "components", "effects");
  const read = (rel: string) => fs.readFileSync(path.join(effects, rel), "utf8");

  const grabKeys = (text: string, anchor: RegExp): Set<string> => {
    const keys = new Set<string>();
    const start = text.search(anchor);
    if (start < 0) return keys;
    // Scan the object literal that follows: top-level `key:` / `"key":` lines.
    const body = text.slice(start);
    const re = /^\s{2}(?:"?([a-z0-9_]+)"?):\s/gm;
    let m: RegExpExecArray | null;
    let consumed = 0;
    // Stop at the closing `};` of the table.
    const end = body.search(/^\};/m);
    const table = end > 0 ? body.slice(0, end) : body;
    while ((m = re.exec(table))) {
      keys.add(m[1]);
      consumed++;
    }
    if (consumed === 0) throw new Error("audit-cards: table parse found no keys");
    return keys;
  };

  const bespoke = grabKeys(read("BoardEffects.tsx"), /export const SIGNATURES[^=]*=/);
  const vfx = grabKeys(read("vfxSpecs.ts"), /export const CARD_VFX[^=]*=/);
  let vfxExtra = new Set<string>();
  try {
    vfxExtra = grabKeys(read("vfxExtra.ts"), /export const EXTRA_CARD_VFX[^=]*=/);
  } catch {
    // vfxExtra optional
  }

  // Plugin modules: every file sigPluginsMerged imports, scanned for PLAYS keys.
  const merged = read("sigPluginsMerged.tsx");
  const pluginFiles = [...merged.matchAll(/from\s+["']\.\/(\w+)["']/g)].map((m) => m[1]);
  const plugin = new Set<string>();
  for (const f of pluginFiles) {
    let text = "";
    try {
      text = read(`${f}.tsx`);
    } catch {
      continue;
    }
    for (const m of text.matchAll(/^\s{2}(?:"?([a-z0-9_]+)"?):\s*\{/gm)) plugin.add(m[1]);
  }

  // Passive compositions.
  const compText = fs.readFileSync(
    path.join(effects, "passive", "compositions.ts"),
    "utf8",
  );
  const passive = new Set<string>();
  for (const m of compText.matchAll(/cardId:\s*["']([a-z0-9_]+)["']/g)) passive.add(m[1]);

  for (const b of ALL_BUFFS) {
    map.set(b.id, {
      bespoke: bespoke.has(b.id),
      plugin: plugin.has(b.id),
      canvasVfx: vfx.has(b.id) || vfxExtra.has(b.id),
      passive: passive.has(b.id),
      generated: true, // genSignature covers every buff-family card by design
    });
  }
  for (const n of ALL_NERFS) {
    map.set(n.id, {
      bespoke: bespoke.has(n.id),
      plugin: plugin.has(n.id),
      canvasVfx: vfx.has(n.id) || vfxExtra.has(n.id),
      passive: passive.has(n.id),
      generated: false, // nerfs animate through the passive system only
    });
  }
  return map;
}

// --- Mechanic signature ----------------------------------------------------------

const VERB_TERMS = [
  "summon", "spawn", "place", "revive", "resurrect", "return", "promote",
  "transform", "become", "convert", "swap", "teleport", "move", "advance",
  "freeze", "stun", "petrify", "sleep", "root", "remove", "destroy", "capture",
  "explode", "shield", "protect", "immune", "block", "wall", "barred", "steal",
  "control", "skip", "extra", "reroll", "draft", "reveal", "see", "clock",
  "seconds", "time", "pawn", "knight", "bishop", "rook", "queen", "king",
  "rank", "file", "square", "adjacent", "random", "draw", "nullify", "cleanse",
  "jump", "leap", "slide", "push", "pull", "castle", "check", "checkmate",
];

function descTerms(desc: string): string[] {
  const lc = desc.toLowerCase();
  return VERB_TERMS.filter((t) => lc.includes(t));
}

function durationClass(desc: string): string {
  const lc = desc.toLowerCase();
  if (/permanent|rest of the game|for good/.test(lc)) return "permanent";
  const m = lc.match(/(\d+)\s*(?:of\s+(?:your|their)\s+)?turn/);
  if (m) return `${m[1]}-turns`;
  if (/next (?:move|turn)/.test(lc)) return "next-turn";
  if (/once|immediately|now\b/.test(lc)) return "one-shot";
  return "unstated";
}

function targetsClass(b: Partial<Buff> & { description: string }): string {
  const lc = b.description.toLowerCase();
  if (/your opponent|enemy|opposing|their/.test(lc)) return "enemy";
  if (/your |you |one of your/.test(lc)) return "self";
  if (/board|every|all/.test(lc)) return "board";
  return "unstated";
}

function buffSignature(b: Buff): string {
  const hooks = [
    b.init && "init",
    b.effect && "effect",
    b.targets && "targets",
    b.augmentMoves && "aug",
    b.filterOpponentMoves && "filter",
    b.onMovePlayed && "onMove",
  ]
    .filter(Boolean)
    .join("+");
  return [
    b.category,
    b.kind,
    hooks || "none",
    durationClass(b.description),
    targetsClass(b),
    descTerms(b.description).sort().join(","),
  ].join("|");
}

// --- Near-duplicate description detection ----------------------------------------

function tokens(desc: string): Set<string> {
  return new Set(
    desc
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// --- Assemble ---------------------------------------------------------------------

type Row = {
  id: string;
  name: string;
  kind: "buff" | "hex" | "boon" | "item" | "apex" | "nerf";
  tier: number;
  effect: string;
  trigger: string;
  duration: string;
  targets: string;
  signature: string;
  animation: string; // summary string e.g. "bespoke+vfx" / "generated" / "passive"
  location: string;
  tests: string[];
  flags: string[];
  action: string;
};

function cardKind(b: Buff): Row["kind"] {
  if (b.tier >= 9 || b.special) return "apex";
  if (b.category === "hex") return "hex";
  if (b.category === "item") return "item";
  if (isBoon(b)) return "boon";
  return "buff";
}

const locations = buildLocations();
const anim = buildAnimationCoverage();
const allIds = new Set<string>([...ALL_BUFFS.map((b) => b.id), ...ALL_NERFS.map((n) => n.id)]);
const tests = buildTestCoverage(allIds);

// Hand-curated decision record: { id: { status?: "broken"|..., action: string } }
type ActionRec = { status?: string; action: string };
let actions: Record<string, ActionRec> = {};
if (fs.existsSync(ACTIONS)) actions = JSON.parse(fs.readFileSync(ACTIONS, "utf8"));

const rows: Row[] = [];

for (const b of ALL_BUFFS) {
  const a = anim.get(b.id)!;
  const animBits = [
    a.bespoke && "bespoke",
    a.plugin && "plugin",
    a.canvasVfx && "canvas",
    a.passive && "passive",
  ].filter(Boolean);
  rows.push({
    id: b.id,
    name: b.name,
    kind: cardKind(b),
    tier: b.tier,
    effect: b.description,
    trigger:
      b.kind +
      (b.freeAction ? "/free" : "") +
      (b.kind === "activated" && b.spendOnUse === false ? "/lingering" : ""),
    duration: durationClass(b.description),
    targets: targetsClass(b),
    signature: buffSignature(b),
    animation: animBits.length ? animBits.join("+") : "generated",
    location: locations.get(b.id) ?? "UNKNOWN",
    tests: tests.get(b.id) ?? [],
    flags: [],
    action: actions[b.id]?.action ?? "pending-review",
  });
}

for (const n of ALL_NERFS) {
  const a = anim.get(n.id)!;
  const animBits = [a.passive && "passive", a.bespoke && "bespoke", a.canvasVfx && "canvas"].filter(
    Boolean,
  );
  const desc = n.description ?? "";
  rows.push({
    id: n.id,
    name: n.name,
    kind: "nerf",
    tier: n.tier,
    effect: desc,
    trigger: "passive-rule",
    duration: "match",
    targets: "self",
    signature: ["nerf", durationClass(desc), descTerms(desc).sort().join(",")].join("|"),
    animation: animBits.length ? animBits.join("+") : "NONE",
    location: locations.get(n.id) ?? "UNKNOWN",
    tests: tests.get(n.id) ?? [],
    flags: [],
    action: actions[n.id]?.action ?? "pending-review",
  });
}

// --- Flagging ---------------------------------------------------------------------

// 1. Exact duplicate mechanic signatures among implemented same-kind cards.
const bySig = new Map<string, Row[]>();
for (const r of rows) {
  if (r.kind === "nerf") continue;
  const arr = bySig.get(r.signature) ?? [];
  arr.push(r);
  bySig.set(r.signature, arr);
}
for (const [, group] of bySig) {
  if (group.length < 2) continue;
  for (const r of group) {
    r.flags.push(`duplicate-signature(${group.map((g) => g.id).filter((id) => id !== r.id).join(",")})`);
  }
}

// 2. Near-duplicate descriptions (Jaccard >= 0.75) among same-kind cards.
const buffRows = rows.filter((r) => r.kind !== "nerf");
const tokenCache = new Map<string, Set<string>>(buffRows.map((r) => [r.id, tokens(r.effect)]));
for (let i = 0; i < buffRows.length; i++) {
  for (let j = i + 1; j < buffRows.length; j++) {
    const a = buffRows[i];
    const b = buffRows[j];
    if (a.signature === b.signature) continue; // already flagged as duplicates
    const sim = jaccard(tokenCache.get(a.id)!, tokenCache.get(b.id)!);
    if (sim >= 0.75) {
      a.flags.push(`near-duplicate(${b.id}:${sim.toFixed(2)})`);
      b.flags.push(`near-duplicate(${a.id}:${sim.toFixed(2)})`);
    }
  }
}

// 3. Dominated candidates: same signature at different tiers (the higher tier
//    must justify itself; goes to the balance queue for a human decision).
for (const [, group] of bySig) {
  if (group.length < 2) continue;
  const tiers = new Set(group.map((g) => g.tier));
  if (tiers.size < 2) continue;
  const maxTier = Math.max(...tiers);
  for (const r of group) {
    if (r.tier === maxTier) r.flags.push("dominated-candidate(higher-tier-of-duplicate-pair)");
  }
}

// 4. Misleading: buff-mode-reachable cards whose text mentions nerfs.
for (const r of rows) {
  if (r.kind === "hex" || r.kind === "nerf") continue; // nerf-mode-only cards may
  if (r.kind === "boon") continue; // boons are nerf-mode pool
  if (/\bnerf/i.test(r.effect) || /\bnerf/i.test(r.name)) {
    r.flags.push("misleading(nerf-reference-in-buff-mode-card)");
  }
}

// 5. Status from the curated record (broken cards found by root-causing).
for (const r of rows) {
  const rec = actions[r.id];
  if (rec?.status) r.flags.push(rec.status);
}

// --- Emit -------------------------------------------------------------------------

rows.sort((a, b) =>
  a.kind === b.kind ? a.tier - b.tier || a.id.localeCompare(b.id) : a.kind.localeCompare(b.kind),
);

const summary = {
  total: rows.length,
  byKind: Object.fromEntries(
    ["buff", "hex", "boon", "item", "apex", "nerf"].map((k) => [
      k,
      rows.filter((r) => r.kind === k).length,
    ]),
  ),
  flagged: {
    duplicateSignature: rows.filter((r) => r.flags.some((f) => f.startsWith("duplicate-signature"))).length,
    nearDuplicate: rows.filter((r) => r.flags.some((f) => f.startsWith("near-duplicate"))).length,
    dominatedCandidates: rows.filter((r) => r.flags.some((f) => f.startsWith("dominated"))).length,
    misleading: rows.filter((r) => r.flags.some((f) => f.startsWith("misleading"))).length,
    broken: rows.filter((r) => r.flags.includes("broken")).length,
    untested: rows.filter((r) => r.tests.length === 0).length,
    noAnimation: rows.filter((r) => r.animation === "NONE").length,
  },
  reviewed: rows.filter((r) => r.action !== "pending-review").length,
};

const json = JSON.stringify({ summary, rows }, null, 1);

const mdLines: string[] = [
  "# Card Audit Matrix (generated by scripts/audit-cards.ts; do not edit)",
  "",
  `Total cards: ${summary.total}. ` +
    `buffs ${summary.byKind.buff}, hexes ${summary.byKind.hex}, boons ${summary.byKind.boon}, ` +
    `items ${summary.byKind.item}, apex ${summary.byKind.apex}, nerfs ${summary.byKind.nerf}.`,
  "",
  `Flags: ${summary.flagged.duplicateSignature} duplicate-signature, ` +
    `${summary.flagged.nearDuplicate} near-duplicate, ${summary.flagged.dominatedCandidates} dominated-candidates, ` +
    `${summary.flagged.misleading} misleading, ${summary.flagged.broken} broken, ` +
    `${summary.flagged.untested} without direct test references, ${summary.flagged.noAnimation} without any animation.`,
  "",
  "| id | name | kind | tier | trigger | duration | targets | animation | location | tests | flags | action |",
  "|----|------|------|------|---------|----------|---------|-----------|----------|-------|-------|--------|",
];
for (const r of rows) {
  mdLines.push(
    `| ${r.id} | ${r.name.replace(/\|/g, "/")} | ${r.kind} | ${r.tier} | ${r.trigger} | ${r.duration} | ` +
      `${r.targets} | ${r.animation} | ${r.location} | ${r.tests.length} | ${r.flags.join(" ").replace(/\|/g, "/") || "-"} | ${r.action.replace(/\|/g, "/")} |`,
  );
}
const md = mdLines.join("\n") + "\n";

if (CHECK) {
  const curJson = fs.existsSync(OUT_JSON) ? fs.readFileSync(OUT_JSON, "utf8") : "";
  const curMd = fs.existsSync(OUT_MD) ? fs.readFileSync(OUT_MD, "utf8") : "";
  if (curJson !== json || curMd !== md) {
    console.error("card-audit is stale: run `npx -y tsx scripts/audit-cards.ts`");
    process.exit(1);
  }
  console.log("card-audit is current.");
} else {
  fs.writeFileSync(OUT_JSON, json);
  fs.writeFileSync(OUT_MD, md);
  console.log(`wrote ${rows.length} rows`);
  console.log(JSON.stringify(summary, null, 2));
}
