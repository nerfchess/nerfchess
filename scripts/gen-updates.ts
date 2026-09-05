// Generates src/lib/updates.gen.ts, the player-facing updates wall, from
// docs/CHANGELOG.md. The changelog is an engineering log (PR numbers, build
// tokens, file paths, harness names, house-bot operations); the wall is for
// players, so this script keeps the headline, the opening paragraph and the
// bullet points of every block, and strips or drops everything that only an
// engineer would read.
//
// Changelog shape (see the file's own preamble): append-only, NEWEST AT THE
// BOTTOM, one block per `## <YYYY-MM-DD HH:MM Z (optional title)>` heading. The
// time and the parenthetical are both optional and the zone label varies (ET,
// EDT), so the heading parser is deliberately loose.
//
// Run: npx -y tsx scripts/gen-updates.ts          (writes src/lib/updates.gen.ts)
//      npx -y tsx scripts/gen-updates.ts --check  (verify it is current)
//
// --check also fails if any emitted string mentions the house (bots, personas,
// rosters): that machinery is never announced to players.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "docs", "CHANGELOG.md");
const OUT = join(ROOT, "src", "lib", "updates.gen.ts");

const TITLE_MAX = 90;
const SUMMARY_MAX = 240;
const BULLET_MAX = 200;
const MIN_BULLET = 15;

type GeneratedUpdate = {
  date: string;
  title: string;
  summary: string;
  anchor: string;
  bullets: string[];
};

// --- Filters ----------------------------------------------------------------

// Anything about the house machinery never reaches the wall. The narrow form
// names the phrases the changelog actually uses; the broad form is the gate
// --check enforces, and dropping on it here keeps the two from disagreeing.
const HOUSE_NARROW = /house[- ]?(bot|player|persona|presence|opponent|account|pfp|roster|fleet)|housebot|persona/i;
const HOUSE_BROAD = /house/i;

// A whole line that is PR bookkeeping and nothing else.
const PR_ONLY_LINE = /^\s*(PR #\d+\.?|OPEN|MERGED|CLOSED)\s*$/;

// Lines that are build, verification, process or bot-operations noise from
// top to bottom.
const NOISE_LINE =
  /buildVersion|\btsc\b|eslint|Playwright|check battery|typecheck|preview-deploy|Claude-in-Chrome|this changelog|CLAUDE\.md|merged current master|resolved (the )?conflicts|^Resolved PR|\bCLOSED\b|Known pre-existing failure|Delivered (by|from|with) a .*agent|re-enabled bots|stuck bots|bot activity|bot games?\b.*unrated|seeded bots|bot-vs-bot|bot churn|load-test|collaborator|\bmoderators?\b|\bmod\b|bot identity|fake players|seeded/i;

// Paragraphs and bullets that summarise verification, leftovers, tooling or
// the PR itself rather than a change.
const SKIP_PREFIX =
  /^(Verified|Still outstanding|Known outstanding|Recorded|Investigation findings|Notes?|Symptom|Root cause|Test|Design note|Tooling|Harness|Deploy \/ build|Continues|Owner follow-ups?|Implements docs|Not yet a PR|Exhaustive card|Delivered|Broad quality pass|New gate)\b/i;

// Text an engineer wrote for engineers: file paths, harness names, tables,
// identifiers, CSS tokens. A parenthetical carrying one is cut out; a
// sentence carrying one outside a parenthetical is dropped.
const DEV_TEXT =
  /\b(src|scripts|docs|migrations|e2e|arena-service|dist-server)\/|\/(api|dev|mod)\/|\.(ts|tsx|cjs|mjs|md|json|css)\b|\bnpm run\b|\btsc\b|eslint|buildVersion|Playwright|typecheck|harness|regenerat|registr(y|ies)|\bDO\b|Durable Object|\bD1\b|\bCDP\b|\bREPLAY_VERSION\b|\bPRs?\b|\bmigration\b|\bschema\b|\bcommit\b|\bbranch\b|\bcodebase\b|\bsubagent|\bagent\b|\bworkflow\b|\bfixtures?\b|\btest:|\bcheck-|\baudit-|\bfalse positives?\b|\bsrc\b|\bChromium\b|headless|viewport|\be2e\b|\bsuite\b|\bassert|\btests?\b|\bCI\b|\/healthz|\bscans?\b|\bthrottl|\[[a-z][a-z-]*\]|\b(JSX|AST|TSX|CSS|HTML|DOM|API|GET|POST|SQL|JSON|GC|CPU|SVG|JSONB|SQLite|Postgres)\b|\b(memos?|hooks?|re-?render(s|ed|ing)?|props?|imports?|chunks?|regex|selectors?|stylesheets?|keyframes?|listeners?|callbacks?|literal|const|parser|mounts?|mounted|endpoint|desync|determinism|dedupe|prefetch(ed)?|skeletons?|composited|profiling)\b|\w+\[[^\]]*\]|--[a-z]|(^|\s)\.[a-z]|\bfx-|\b[a-z]+-(?:\d+|dvh|none|full)\b|\S=\S|\w\(\)|\b[a-z]+:[a-z0-9]+\b|\b(?!chess\.com\b)(?!e\.g\b)(?!i\.e\b)[a-z]+\.[a-z]+\b|[A-Za-z0-9]+_[A-Za-z0-9_]+|\b[a-z]+[A-Z][A-Za-z]+\b|\b(?!NerfChess\b)[A-Z][a-z]+[A-Z][A-Za-z]+\b/;

// A sentence that only makes sense after the one just dropped.
const ORPHAN_START =
  /^(It|Its|They|Their|This|That|These|Those|Both|Now|Same|Also|Then|So|Instead|Result|Everything|Nothing|Which|Wired|Here|Helped|Kept|Capped|Clamped|Gated|Pinned|Added|Fixed|Always|Deliberately|Confirmed|Resolved|Plays|Before this|After this|Previously)\b/;

// --- Text cleanup ------------------------------------------------------------

function stripMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|\s)\*([^*\s][^*]*)\*(?=[\s.,;:)]|$)/g, "$1$2")
    .replace(/(^|\s)_([^_\s][^_]*)_(?=[\s.,;:)]|$)/g, "$1$2");
}

// Inline PR / status tokens: `PR #123`, `PR #140/#141`, `(#123)`, `. OPEN`,
// `. MERGED`, plus the dangling punctuation they leave behind.
function stripPrTokens(s: string): string {
  return s
    .replace(/\(\s*PRs? #\d+[^)]*\)/g, "")
    .replace(/\(#\d+(?:[,/ ]+#?\d+)*\)/g, "")
    .replace(/\b(?:as |in |see )?PRs? #\d+(?:\s*(?:,|and|\/)\s*#?\d+)*\.?/g, "")
    .replace(/#\d+(?:-\d+)?\b/g, "")
    .replace(/\.\s*\b(OPEN|MERGED|CLOSED)\b\.?/g, ".")
    .replace(/[,;:]?\s*\b(OPEN|MERGED|CLOSED)\b\.?/g, "")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\.\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Cut out every parenthetical that carries developer text, so the sentence
// around it can still be judged (and kept) on its own.
function dropDevParens(s: string): string {
  return s.replace(/\s*\(([^()]*)\)/g, (m, inner: string) => (DEV_TEXT.test(inner) ? "" : m));
}

function clean(s: string): string {
  return dropDevParens(stripPrTokens(stripMarkdown(s)))
    .replace(/\bNerfChess\b/g, "Nerf Chess")
    .replace(/\s*\u2014\s*/g, ", ")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function ensurePeriod(s: string): string {
  return /[.!?:]$/.test(s) ? s : s + ".";
}

// Sentence split on a terminator plus whitespace, leaving "e.g.", "i.e.",
// "vs." and "etc." alone (decimals carry no whitespace, so they are safe).
function sentences(s: string): string[] {
  return s
    .split(/(?<!\b(?:e\.g|i\.e|vs|etc))(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function isNoise(line: string): boolean {
  return HOUSE_NARROW.test(line) || HOUSE_BROAD.test(line) || NOISE_LINE.test(line);
}

// The reader-facing part of a line: developer sentences are cut; if the
// opening sentence was one of them, what follows only survives when it stands
// on its own (and never as a summary, which has to open cleanly). The result
// is capped at a sentence boundary when one fits, else at a word boundary
// with an ellipsis.
function playerText(cleaned: string, max: number, strict = false): string {
  const all = sentences(cleaned);
  if (!all.length) return "";
  const kept = all.filter((sen) => !DEV_TEXT.test(sen) && !isNoise(sen) && sen.split(/\s+/).length >= 3);
  if (!kept.length) return "";
  if (kept[0] !== all[0]) {
    const rest = kept.join(" ");
    if (strict || rest.length < 60 || ORPHAN_START.test(rest)) return "";
  }
  return fit(kept, max);
}

function fit(parts: string[], max: number): string {
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  // The first sentence alone is over the cap: cut it on a word.
  const first = parts[0];
  const cut = first.slice(0, max - 3);
  const at = cut.lastIndexOf(" ");
  return (at > max / 2 ? cut.slice(0, at) : cut).replace(/[,;:(]$/, "") + "...";
}

// --- Parsing ----------------------------------------------------------------

type Block = {
  date: string;
  time: string | null;
  headingTitle: string;
  paragraphs: string[][];
};

const HEADING = /^## (\d{4}-\d{2}-\d{2})\b(.*)$/;

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let para: string[] = [];
  const flush = () => {
    if (cur && para.length) cur.paragraphs.push(para);
    para = [];
  };
  for (const rawLine of md.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    const h = HEADING.exec(line);
    if (h) {
      flush();
      const rest = h[2];
      const t = /(\d{1,2}):(\d{2})/.exec(rest);
      const paren = /\(([^)]*)\)\s*$/.exec(rest);
      cur = {
        date: h[1],
        time: t ? `${t[1].padStart(2, "0")}${t[2]}` : null,
        headingTitle: paren ? paren[1].trim() : "",
        paragraphs: [],
      };
      blocks.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.trim() === "" || line.trim() === "---") {
      flush();
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

// A paragraph is either prose (no bullet lines) or a bullet group, optionally
// led by a "Section label:" line. Wrapped bullets continue on indented lines,
// or on any non-bullet line that follows a bullet inside the same paragraph.
function splitParagraph(lines: string[]): { prose: string; bullets: string[] } {
  const firstBullet = lines.findIndex((l) => /^\s*- /.test(l));
  if (firstBullet === -1) return { prose: lines.map((l) => l.trim()).join(" "), bullets: [] };
  const bullets: string[] = [];
  for (const l of lines.slice(firstBullet)) {
    if (/^\s*- /.test(l)) bullets.push(l.replace(/^\s*- /, "").trim());
    else if (bullets.length) bullets[bullets.length - 1] += " " + l.trim();
  }
  // Lines before the first bullet are a label ("Rule content:"), not prose.
  return { prose: "", bullets };
}

// Whether a cleaned line is worth reading at all.
function usable(line: string): boolean {
  return (
    line !== "" &&
    !PR_ONLY_LINE.test(line) &&
    !SKIP_PREFIX.test(line) &&
    !isNoise(line) &&
    !/^[(:;,]/.test(line)
  );
}

// Heading parentheticals name the sprint or wave first; the wall wants the
// contents. Their comma-separated segments are kept one by one, so a heading
// like "server crisis, bots, tournaments" still yields "Tournaments".
const TITLE_PREFIX = /^(sprint \d+|sprint overhaul|wave \d+|autonomous overhaul pass|owner follow-ups?):\s*/i;
const HEADING_SKIP = /\b(PRs?|server|crash\w*|tooling|CI|conflict\w*|bots?)\b/i;

function headingTitle(raw: string): string {
  if (/session/i.test(raw)) return "";
  const segs = clean(raw)
    .replace(TITLE_PREFIX, "")
    .split(/,\s*/)
    .map((x) => x.trim())
    .filter((x) => x && !HEADING_SKIP.test(x) && !DEV_TEXT.test(x) && !isNoise(x));
  return segs.join(", ");
}

// A title cut from a long sentence: parentheticals go first; if it is still
// over the cap, end it at the first clause break that leaves a real phrase.
function titleFromSentence(sen: string): string {
  const bare = sen.replace(/\s*\([^()]*\)/g, "").replace(/\s+([.,;:])/g, "$1").trim();
  if (bare.length <= TITLE_MAX) return bare;
  const m = /^(.{25,}?)(?::|;|,)\s/.exec(bare);
  if (m && m[1].length <= TITLE_MAX) return m[1];
  return fit([bare], TITLE_MAX);
}

// "Label: detail" bullets, as in "Draft picker: the ring...". Two or more of
// them make a title when the block offers nothing better.
function bulletLabel(b: string): string | null {
  const m = /^([A-Za-z][^:;,()]{2,40}):\s/.exec(b);
  return m ? m[1].trim() : null;
}

function buildEntry(b: Block, anchor: string): GeneratedUpdate | null {
  const prose: string[] = [];
  const bullets: string[] = [];
  for (const p of b.paragraphs) {
    const { prose: text, bullets: bs } = splitParagraph(p);
    if (text) {
      const c = clean(text);
      if (usable(c)) prose.push(c);
    }
    for (const raw of bs) {
      if (HOUSE_NARROW.test(raw)) continue;
      const c = clean(raw);
      if (!usable(c)) continue;
      const t = playerText(c, BULLET_MAX);
      if (t.length >= MIN_BULLET) bullets.push(ensurePeriod(capitalize(t)));
    }
  }

  // Title: the author's own parenthetical when the heading has one; else the
  // opening line when it is short and not a label; else the bullet labels;
  // else the first sentence of the summary.
  let title = b.headingTitle ? headingTitle(b.headingTitle) : "";
  if (!title && prose.length) {
    const first = sentences(prose[0].replace(/\s*\([^()]*\)/g, ""))[0] ?? "";
    if (first.length <= TITLE_MAX && !/:$/.test(first) && !DEV_TEXT.test(first)) title = first;
  }
  if (!title) {
    const labels = bullets.map(bulletLabel).filter((x): x is string => x !== null);
    if (labels.length >= 2 && labels.length * 2 >= bullets.length) {
      const joined = labels.map((l, i) => (i === 0 ? l : l[0].toLowerCase() + l.slice(1))).join(", ");
      if (joined.length <= TITLE_MAX) title = joined;
    }
  }

  // Summary: the first opening paragraph that still says something once the
  // bookkeeping is gone and that does not merely repeat the title; failing
  // that, the first such bullet (which then leaves the bullet list).
  const sameAsTitle = (s: string) => s.replace(/[.]+$/, "") === title.replace(/[.]+$/, "");
  let summary = "";
  for (const p of prose) {
    const t = playerText(p, SUMMARY_MAX, true);
    if (t.length >= 40 && !sameAsTitle(t)) {
      summary = t;
      break;
    }
  }
  if (!summary) {
    const i = bullets.findIndex((x) => x.length >= 40 && !sameAsTitle(x));
    if (i !== -1) summary = bullets.splice(i, 1)[0];
  }
  summary = ensurePeriod(capitalize(summary));

  if (!title && summary) title = titleFromSentence(sentences(summary)[0] ?? summary);
  title = title.replace(/[.]+$/, "");
  if (title.length > TITLE_MAX) title = fit([title], TITLE_MAX);
  title = capitalize(title);

  if (!title) return null;
  if (!bullets.length && summary.length < 40) return null;
  return { date: b.date, title, summary, anchor, bullets };
}

function generate(md: string): GeneratedUpdate[] {
  const blocks = parseBlocks(md);
  const used = new Set<string>();
  const perDate = new Map<string, number>();
  const out: GeneratedUpdate[] = [];
  for (const b of blocks) {
    const ymd = b.date.replace(/-/g, "");
    let anchor: string;
    if (b.time) anchor = `u-${ymd}-${b.time}`;
    else {
      const n = (perDate.get(b.date) ?? 0) + 1;
      perDate.set(b.date, n);
      anchor = `u-${ymd}-${n}`;
    }
    let unique = anchor;
    for (let i = 2; used.has(unique); i++) unique = `${anchor}-${i}`;
    used.add(unique);
    const e = buildEntry(b, unique);
    if (e) out.push(e);
  }
  // The changelog appends at the bottom; the wall reads newest first.
  return out.reverse();
}

// --- Emit -------------------------------------------------------------------

function render(entries: GeneratedUpdate[]): string {
  const lines: string[] = [
    "// GENERATED FILE. Do not edit by hand.",
    "// Built from docs/CHANGELOG.md by scripts/gen-updates.ts; regenerate with",
    "// `npm run gen:updates` (and `npm run test:updates` verifies it is current).",
    "",
    'import type { GeneratedUpdate } from "./updates";',
    "",
    "export const GENERATED_UPDATES: GeneratedUpdate[] = [",
  ];
  for (const e of entries) {
    lines.push("  {");
    lines.push(`    date: ${JSON.stringify(e.date)},`);
    lines.push(`    title: ${JSON.stringify(e.title)},`);
    lines.push(`    summary: ${JSON.stringify(e.summary)},`);
    lines.push(`    anchor: ${JSON.stringify(e.anchor)},`);
    if (e.bullets.length) {
      lines.push("    bullets: [");
      for (const b of e.bullets) lines.push(`      ${JSON.stringify(b)},`);
      lines.push("    ],");
    } else {
      lines.push("    bullets: [],");
    }
    lines.push("  },");
  }
  lines.push("];", "");
  return lines.join("\n");
}

// --- Write or check ---------------------------------------------------------

const entries = generate(readFileSync(SRC, "utf8"));
const text = render(entries);

const leaks: string[] = [];
for (const e of entries) {
  for (const s of [e.title, e.summary, ...e.bullets]) {
    if (HOUSE_BROAD.test(s) || s.includes("\u2014")) leaks.push(`${e.anchor}: ${s}`);
  }
}
if (leaks.length) {
  console.error(`[gen-updates] ${leaks.length} emitted string(s) mention the house or carry an em dash:`);
  for (const l of leaks) console.error("  " + l);
  process.exit(1);
}

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== text) {
    const a = current.split("\n");
    const b = text.split("\n");
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    console.error(`[gen-updates] src/lib/updates.gen.ts is stale (first difference at line ${i + 1}).`);
    console.error(`  on disk:   ${a[i] ?? "<end of file>"}`);
    console.error(`  generated: ${b[i] ?? "<end of file>"}`);
    console.error("  Run `npm run gen:updates` and commit the result.");
    process.exit(1);
  }
  console.log(`[gen-updates] check OK: ${entries.length} entries current.`);
} else {
  writeFileSync(OUT, text);
  console.log(`[gen-updates] wrote ${entries.length} entries to src/lib/updates.gen.ts`);
}
