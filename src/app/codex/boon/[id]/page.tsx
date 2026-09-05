import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { BuffDetail } from "@/components/codex/CardDetail";
import { AffectedPieces } from "@/app/codex/_components/AffectedPieces";
import { BUFF_BY_ID, buffType, metaDescription, tierName } from "@/lib/cardCodex";

// One static page per boon, at the family path the codex's Boons tab implies.
// Boons also still render at /codex/buff/[id] (they live in ALL_BUFFS), but
// this path is the canonical one. Only pre-generated ids resolve; anything
// else 404s instead of spinning up the worker on demand.
// dynamicParams=true: every id is still prerendered at build time, but a
// deployment whose static-asset upload dropped a page (the live "codex 404
// no matter what" reports) now falls back to rendering it on demand in the
// worker instead of hard-404ing. Unknown ids still 404 via notFound().
export const dynamicParams = true;

export function generateStaticParams() {
  return ALL_BUFFS.filter((b) => buffType(b) === "Boon").map((b) => ({ id: b.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const buff = BUFF_BY_ID[params.id];
  if (!buff || buffType(buff) !== "Boon") return {};
  const lead = `${buff.name} is a ${tierName(buff.tier)} boon in Nerf Chess: a relief card you draft in Nerf mode to soften your own secret handicap.`;
  const description = metaDescription(buff.name, lead, buff.description);
  const path = `/codex/boon/${buff.id}`;
  return {
    title: buff.name,
    description,
    alternates: { canonical: path },
    robots: buff.implemented ? undefined : { index: false, follow: true },
    openGraph: { title: `${buff.name} · Nerf Chess`, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title: `${buff.name} · Nerf Chess`, description },
  };
}

export default function BoonCardPage({ params }: { params: { id: string } }) {
  const buff = BUFF_BY_ID[params.id];
  if (!buff || buffType(buff) !== "Boon") notFound();
  return (
    <>
      <BuffDetail buff={buff} extra={<AffectedPieces kind="buff" card={buff} />} />
    </>
  );
}
