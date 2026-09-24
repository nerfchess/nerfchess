import { CodexBrowser } from "../_components/CodexBrowser";
import { CODEX_COUNTS, CODEX_TIERS } from "../_components/codexCounts";
import { codexStateFromQuery } from "../_components/codexData";

// The codex list is a client experience (instant search, filters, windowed
// rows, expand-in-place). All of that lives in CodexBrowser; this route file
// is the server shell: it reads the URL's tab and filters so a shared or
// breadcrumb link (/codex?tab=hexes) renders that tab at the first paint
// instead of Buffs and then switching, and hands over the per-tab counts.
export default async function CodexPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (typeof first === "string") qs.set(k, first);
  }
  const initial = codexStateFromQuery(qs.toString());
  return <CodexBrowser counts={CODEX_COUNTS} tiers={CODEX_TIERS} initial={initial} />;
}
