import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { BuffDetail } from "@/components/codex/CardDetail";
import { AffectedPieces } from "@/app/codex/_components/AffectedPieces";
import { BUFF_BY_ID, buffType } from "@/lib/cardCodex";
import { cardPageMeta, buffSeo } from "@/lib/seoCards";

// One static page per hex, at the family path the codex's Hexes tab implies.
// Hexes also still render at /codex/buff/[id] (they live in ALL_BUFFS), but
// this path is the canonical one. Only pre-generated ids resolve; anything
// else 404s instead of spinning up the worker on demand.
// dynamicParams=true: every id is still prerendered at build time, but a
// deployment whose static-asset upload dropped a page (the live "codex 404
// no matter what" reports) now falls back to rendering it on demand in the
// worker instead of hard-404ing. Unknown ids still 404 via notFound().
export const dynamicParams = true;

export function generateStaticParams() {
  return ALL_BUFFS.filter((b) => buffType(b) === "Hex").map((b) => ({ id: b.id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const seo = buffSeo(id);
  return seo && seo.family === "Hex" ? cardPageMeta(seo) : {};
}

export default async function HexCardPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const buff = BUFF_BY_ID[params.id];
  if (!buff || buffType(buff) !== "Hex") notFound();
  return (
    <>
      <BuffDetail buff={buff} extra={<AffectedPieces kind="buff" card={buff} />} />
    </>
  );
}
