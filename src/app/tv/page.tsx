// /tv: a server page so the channel (?mode=nerf|buff) is read on the server
// and the header, heading and board frame render on the first paint. It used
// to be a client page reading useSearchParams inside <Suspense fallback={null}>,
// which could prerender an empty body, header included (F019).

import type { DraftMode } from "@/engine/buff";
import { TvView } from "./TvView";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TvPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = (await searchParams).mode;
  const mode = Array.isArray(raw) ? raw[0] : raw;
  const modeFilter: DraftMode | null = mode === "nerf" || mode === "buff" ? mode : null;
  return <TvView modeFilter={modeFilter} />;
}
