// Route skeleton for /codex: the browser itself in shell mode, so the header,
// title, intro with its count, tabs, search and filter row, and the row
// skeletons sit exactly where the page puts them. It used to be a 6xl column
// of three-across card plates under a 40px title block, a different shape from
// the 7xl list of rows the page settles into. The controls are inert and the
// library is not loaded until the page itself mounts.

import { CodexBrowser } from "./_components/CodexBrowser";
import { CODEX_COUNTS, CODEX_TIERS } from "./_components/codexCounts";

export default function Loading() {
  return <CodexBrowser counts={CODEX_COUNTS} tiers={CODEX_TIERS} shell />;
}
