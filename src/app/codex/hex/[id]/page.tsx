import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { BuffDetail } from "@/components/codex/CardDetail";
import { BUFF_BY_ID, buffType, metaDescription, tierName } from "@/lib/cardCodex";

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

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const buff = BUFF_BY_ID[params.id];
  if (!buff || buffType(buff) !== "Hex") return {};
  const lead = `${buff.name} is a ${tierName(buff.tier)} hex in Nerf Chess: a curse you draft in Nerf mode and cast on your opponent.`;
  const description = metaDescription(buff.name, lead, buff.description);
  const path = `/codex/hex/${buff.id}`;
  return {
    title: buff.name,
    description,
    alternates: { canonical: path },
    robots: buff.implemented ? undefined : { index: false, follow: true },
    openGraph: { title: `${buff.name} · Nerf Chess`, description, url: path, type: "article" },
    twitter: { card: "summary", title: `${buff.name} · Nerf Chess`, description },
  };
}

export default function HexCardPage({ params }: { params: { id: string } }) {
  const buff = BUFF_BY_ID[params.id];
  if (!buff || buffType(buff) !== "Hex") notFound();
  return <BuffDetail buff={buff} />;
}
