// Regression check for ledger F222 (slice TC-great).
//
//   ./node_modules/.bin/tsx docs/polish-pass/evidence/TC-great/check-great-weight.ts
//
// greatPlays used to read its tier-6 weight (the board-edge glow and the
// second shock ring, GrandAccent) from a hardcoded set of flourish keys that
// went stale as cards were re-tiered: 38 live cards played the wrong weight.
// Weight now comes from the card's live tier. This renders every greatPlays
// lead scene to static markup and fails when:
//   - the tier bound to an entry is not the card's tier in BUFF_BY_ID;
//   - a card below tier 6 carries the tier-6 accent (grp-edgeglow);
//   - a card at tier 6 or above is missing it;
//   - a card at tier 4 or below plays at full length (no Tempo short cut),
//     or a card at tier 5 or above is shortened.
//
// The play module imports CSS, so .css is stubbed before it is loaded.

const Module = require("node:module") as { _extensions: Record<string, () => void> };
Module._extensions[".css"] = () => {};

async function main(): Promise<void> {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { BUFF_BY_ID } = await import("../../../../src/engine/buffs/library");
  const { PLAYS, greatPlayTier } = await import("../../../../src/components/effects/greatPlays");

  const fails: string[] = [];
  const rows: string[] = [];
  for (const [id, plugin] of Object.entries(PLAYS)) {
    const live = BUFF_BY_ID[id]?.tier;
    const bound = greatPlayTier(id);
    if (live !== bound) fails.push(`${id}: bound tier ${bound}, library tier ${live}`);
    const html = renderToStaticMarkup(React.createElement(plugin.Render, { lead: true, role: "lead", delayMs: 0 }));
    const accent = html.includes("grp-edgeglow");
    const tempo = html.startsWith('<span class="contents">');
    if (bound < 6 && accent) fails.push(`${id}: tier ${bound} carries the tier-6 accent`);
    if (bound >= 6 && !accent) fails.push(`${id}: tier ${bound} is missing the tier-6 accent`);
    if (bound <= 4 && !tempo) fails.push(`${id}: tier ${bound} plays at full length (no short cut)`);
    if (bound >= 5 && tempo) fails.push(`${id}: tier ${bound} is shortened`);
    // a target hit and an arrival are never shortened or accented
    const target = renderToStaticMarkup(React.createElement(plugin.Render, { lead: false, role: "target", delayMs: 0 }));
    if (target.startsWith('<span class="contents">')) fails.push(`${id}: target cut is shortened`);
    rows.push(`${id}\tT${bound}\t${accent ? "grand" : "-"}\t${tempo ? "short" : "-"}`);
  }
  if (process.argv.includes("--list")) console.log(rows.join("\n"));
  if (fails.length) {
    console.error(`great weight check FAILED (${fails.length}):`);
    for (const f of fails) console.error("  " + f);
    process.exit(1);
  }
  console.log(`great weight check: ${rows.length} greatPlays entries, weight and tempo follow the live tier`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
