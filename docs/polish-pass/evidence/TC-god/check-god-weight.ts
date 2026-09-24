// Regression check for ledger F221 and F227 (slice TC-god).
//
//   ./node_modules/.bin/tsx docs/polish-pass/evidence/TC-god/check-god-weight.ts
//
// F221: godPlays used to read tier-8 weight (the held rim vignette and the
// extra shockwave) from a hardcoded set of flourish keys that went stale as
// cards were re-tiered. Weight now comes from the card's live tier. This
// renders every godPlays lead scene to static markup and fails when:
//   - the tier bound to an entry is not the card's tier in BUFF_BY_ID;
//   - a card below tier 8 carries the tier-8 vignette;
//   - a tier-8+ card on a shared template (or a per-card scene that composes
//     the weight) is missing it.
// F227: cards at tier 5 and below play the god scenes on a faster clock
// (the Tempo wrapper); tier 6 and above never do.
//
// The play module imports CSS, so .css is stubbed before it is loaded.

const Module = require("node:module") as { _extensions: Record<string, () => void> };
Module._extensions[".css"] = () => {};

async function main(): Promise<void> {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { BUFF_BY_ID } = await import("../../../../src/engine/buffs/library");
  const { PLAYS, godPlayTier } = await import("../../../../src/components/effects/godPlays");

  const fails: string[] = [];
  const rows: string[] = [];
  for (const [id, plugin] of Object.entries(PLAYS)) {
    const live = BUFF_BY_ID[id]?.tier;
    const bound = godPlayTier(id);
    if (live !== bound) fails.push(`${id}: bound tier ${bound}, library tier ${live}`);
    const html = renderToStaticMarkup(React.createElement(plugin.Render, { lead: true, role: "lead", delayMs: 0 }));
    const vignette = html.includes("gp-vignette");
    const tempo = html.startsWith('<span class="contents">');
    if (bound < 8 && vignette) fails.push(`${id}: tier ${bound} carries the tier-8 vignette`);
    if (bound >= 8 && !vignette) fails.push(`${id}: tier ${bound} is missing the tier-8 vignette`);
    if (bound <= 5 && !tempo) fails.push(`${id}: tier ${bound} plays at full length (no short cut)`);
    if (bound >= 6 && tempo) fails.push(`${id}: tier ${bound} is shortened`);
    rows.push(`${id}\tT${bound}\t${vignette ? "heavy" : "-"}\t${tempo ? "short" : "-"}`);
  }
  if (process.argv.includes("--list")) console.log(rows.join("\n"));
  if (fails.length) {
    console.error(`god weight check FAILED (${fails.length}):`);
    for (const f of fails) console.error("  " + f);
    process.exit(1);
  }
  console.log(`god weight check: ${rows.length} godPlays entries, weight and tempo follow the live tier`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export {};
