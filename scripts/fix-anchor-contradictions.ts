// Bring declared anchors in line with the derived anchor rule.
//
//   npx -y tsx scripts/fix-anchor-contradictions.ts            # report
//   npx -y tsx scripts/fix-anchor-contradictions.ts --write    # rewrite
//
// WHY A CODEMOD AND NOT 467 EDITS
//
// The anchor rule (scripts/lib/anchor-rule.ts) found 494 cards whose declared
// anchor contradicts what the card actually does. The overwhelming majority
// are one mistake made repeatedly: a card with no board location at all - a
// draft reroll, a clock gain, a nerf suspension - declaring "cast" and so
// staging itself at a square, when the rule is that a general effect is
// centralized. Authoring agents reached for "cast" because the brief said
// anchoring was the point, and nothing told them which cards were exempt.
//
// WHAT THIS TOUCHES, AND WHAT IT REFUSES TO
//
// ONLY the direction that is safe without looking at the art: cast/aim -> board.
// "board" is the original staging every one of these scenes was written under
// and shipped with, so restoring it cannot break a composition; the geometry
// vars still carry the cast square's direction, so a scene that leans on
// --fx-side or --fx-ang keeps leaning the right way while playing centred.
//
// The other direction - board -> cast/aim - is NOT done here. Moving a scene
// off centre can drag board-scale layers (washes, horizons, edge rings) off
// the board with it, and whether it does depends on whether those layers sit
// inside <BoardFrame>. That is a judgement about the art, so those cards are
// listed for a human or an authoring pass and left alone.

import fs from "node:fs";
import path from "node:path";

import { allowedAnchors, type Anchor } from "./lib/anchor-rule";

const ROOT = path.join(__dirname, "..");
const EFFECTS = path.join(ROOT, "src", "components", "effects");
const WRITE = process.argv.includes("--write");

function cardFacts(): Map<string, { cat: string; rule: string }> {
  const t = fs.readFileSync(path.join(ROOT, "docs", "card-categories.md"), "utf8");
  const out = new Map<string, { cat: string; rule: string }>();
  let cat = "";
  for (const line of t.split("\n")) {
    const h = /^## ([a-z0-9-]+)/.exec(line);
    if (h) {
      cat = h[1];
      continue;
    }
    const c = line.split("|").map((x) => x.trim());
    if (c.length >= 8 && c[1] && c[1] !== "id" && !c[1].startsWith("---") && cat) {
      out.set(c[1], { cat, rule: c[6] ?? "" });
    }
  }
  return out;
}

/**
 * Every file that can carry a declared anchor: the plugin modules and core.
 *
 * `--skip=a,b` drops modules by name substring. Authoring runs edit these same
 * files, and a codemod rewriting one mid-edit silently loses whichever side
 * writes second, so a module still being authored is skipped and swept on the
 * next run rather than raced.
 */
function sourceFiles(): string[] {
  const skip = (process.argv.find((a) => a.startsWith("--skip="))?.slice(7) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const mods = fs
    .readdirSync(EFFECTS)
    .filter((f) => f.endsWith("Plays.tsx"))
    .filter((f) => !skip.some((s) => f.includes(s)))
    .map((f) => path.join(EFFECTS, f));
  return [...mods, path.join(EFFECTS, "BoardEffects.tsx")];
}

interface Hit {
  file: string;
  id: string;
  from: Anchor;
  to: Anchor;
}

/**
 * Entry boundaries inside a table, by indentation.
 *
 * A card entry starts at `  <id>:` on a two-space indent and runs until the
 * next one. Matching that rather than balancing braces keeps this robust to
 * the two shapes the tables use, `id: G(Comp, [...], {...})` and a bare
 * object literal, without needing to parse either.
 */
function entrySpans(src: string): { id: string; start: number; end: number }[] {
  const re = /^ {2}([a-z0-9_]+):/gm;
  const starts: { id: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) starts.push({ id: m[1], at: m.index });
  return starts.map((s, i) => ({
    id: s.id,
    start: s.at,
    end: i + 1 < starts.length ? starts[i + 1].at : src.length,
  }));
}

function main(): void {
  const facts = cardFacts();
  const fixed: Hit[] = [];
  const deferred: Hit[] = [];

  for (const file of sourceFiles()) {
    let src = fs.readFileSync(file, "utf8");
    let changed = false;

    // Recomputed each pass: a replacement shifts every later offset.
    for (;;) {
      const spans = entrySpans(src);
      let didOne = false;
      for (const sp of spans) {
        const chunk = src.slice(sp.start, sp.end);
        const dm = /anchor:\s*"(cast|aim|board)"/.exec(chunk);
        if (!dm) continue;
        const declared = dm[1] as Anchor;
        const f = facts.get(sp.id);
        if (!f) continue;
        const allowed = allowedAnchors(f.cat, f.rule);
        if (allowed.includes(declared)) continue;

        const hit: Hit = {
          file: path.basename(file),
          id: sp.id,
          from: declared,
          to: allowed[0],
        };
        if (!allowed.includes("board")) {
          // Would move a scene OFF centre. Not safe without reading the art.
          if (!deferred.some((d) => d.id === hit.id)) deferred.push(hit);
          continue;
        }
        if (fixed.some((d) => d.id === hit.id)) continue;
        fixed.push(hit);
        const at = sp.start + dm.index;
        src = `${src.slice(0, at)}anchor: "board"${src.slice(at + dm[0].length)}`;
        changed = true;
        didOne = true;
        break;
      }
      if (!didOne) break;
    }

    if (changed && WRITE) fs.writeFileSync(file, src);
  }

  const byFile = new Map<string, number>();
  for (const h of fixed) byFile.set(h.file, (byFile.get(h.file) ?? 0) + 1);
  console.log(
    `[fix-anchors] ${fixed.length} cards moved to "board" (a general effect is centralized)`,
  );
  for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${f}`);
  }

  console.log(
    `\n[fix-anchors] ${deferred.length} left alone: these must move OFF centre, ` +
      "which can drag board-scale layers off the board. Art review, not a codemod:",
  );
  for (const d of deferred) {
    console.log(`  ${d.file}  ${d.id}  "${d.from}" -> "${d.to}"`);
  }

  if (!WRITE) console.log("\n(dry run: pass --write to apply)");
}

main();
