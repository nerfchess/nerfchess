import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { NerfDetail } from "@/components/codex/CardDetail";
import { AffectedPieces } from "@/app/codex/_components/AffectedPieces";
import { NERF_BY_ID } from "@/lib/cardCodex";
import { cardPageMeta, nerfSeo } from "@/lib/seoCards";

// One static page per nerf. Only pre-generated ids resolve; anything else 404s
// instead of spinning up the worker on demand.
// dynamicParams=true: every id is still prerendered at build time, but a
// deployment whose static-asset upload dropped a page (the live "codex 404
// no matter what" reports) now falls back to rendering it on demand in the
// worker instead of hard-404ing. Unknown ids still 404 via notFound().
export const dynamicParams = true;

export function generateStaticParams() {
  return ALL_NERFS.map((n) => ({ id: n.id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const seo = nerfSeo(id);
  return seo ? cardPageMeta(seo) : {};
}

export default async function NerfCardPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const nerf = NERF_BY_ID[params.id];
  if (!nerf) notFound();
  return (
    <>
      <NerfDetail nerf={nerf} extra={<AffectedPieces kind="nerf" card={nerf} />} />
    </>
  );
}
