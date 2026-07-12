import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { BuffDetail } from "@/components/codex/CardDetail";
import { BUFF_BY_ID, buffType, cardPath, metaDescription, modeLabel, buffModes, tierName } from "@/lib/cardCodex";

// One static page per buff (including hexes, boons, and items: all live in
// ALL_BUFFS). Only these pre-generated ids resolve; anything else 404s instead
// of spinning up the worker on demand. Hexes and boons canonicalize to their
// family paths (/codex/hex, /codex/boon) but keep rendering here so old links
// and indexed URLs never 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_BUFFS.map((b) => ({ id: b.id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const buff = BUFF_BY_ID[params.id];
  if (!buff) return {};
  const type = buffType(buff);
  const where = modeLabel(buffModes(buff));
  const lead = `${buff.name} is a ${tierName(buff.tier)} ${type.toLowerCase()} in Nerf Chess, drafted in ${where}.`;
  const description = metaDescription(buff.name, lead, buff.description);
  const path = cardPath(buff);
  return {
    title: buff.name,
    description,
    alternates: { canonical: path },
    robots: buff.implemented ? undefined : { index: false, follow: true },
    openGraph: { title: `${buff.name} · Nerf Chess`, description, url: path, type: "article" },
    twitter: { card: "summary", title: `${buff.name} · Nerf Chess`, description },
  };
}

export default async function BuffCardPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const buff = BUFF_BY_ID[params.id];
  if (!buff) notFound();
  return <BuffDetail buff={buff} />;
}
