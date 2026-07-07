import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { NerfDetail } from "@/components/codex/CardDetail";
import { NERF_BY_ID, metaDescription, tierName } from "@/lib/cardCodex";

// One static page per nerf. Only pre-generated ids resolve; anything else 404s
// instead of spinning up the worker on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_NERFS.map((n) => ({ id: n.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const nerf = NERF_BY_ID[params.id];
  if (!nerf) return {};
  const lead = `${nerf.name} is a ${tierName(nerf.tier)} nerf in Nerf Chess: a secret handicap you carry in Nerf mode.`;
  const description = metaDescription(nerf.name, lead, nerf.description);
  const path = `/codex/nerf/${nerf.id}`;
  return {
    title: nerf.name,
    description,
    alternates: { canonical: path },
    robots: nerf.implemented ? undefined : { index: false, follow: true },
    openGraph: { title: `${nerf.name} · Nerf Chess`, description, url: path, type: "article" },
    twitter: { card: "summary", title: `${nerf.name} · Nerf Chess`, description },
  };
}

export default function NerfCardPage({ params }: { params: { id: string } }) {
  const nerf = NERF_BY_ID[params.id];
  if (!nerf) notFound();
  return <NerfDetail nerf={nerf} />;
}
