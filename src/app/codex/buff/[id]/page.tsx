import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { BuffDetail } from "@/components/codex/CardDetail";
import { SocialsRow } from "@/components/SocialsRow";
import { BUFF_BY_ID, buffType, cardPath, metaDescription, modeLabel, buffModes, tierName } from "@/lib/cardCodex";

// One static page per buff (including hexes, boons, and items: all live in
// ALL_BUFFS). Only these pre-generated ids resolve; anything else 404s instead
// of spinning up the worker on demand. Hexes and boons canonicalize to their
// family paths (/codex/hex, /codex/boon) but keep rendering here so old links
// and indexed URLs never 404.
// dynamicParams=true: every id is still prerendered at build time, but a
// deployment whose static-asset upload dropped a page (the live "codex 404
// no matter what" reports) now falls back to rendering it on demand in the
// worker instead of hard-404ing. Unknown ids still 404 via notFound().
export const dynamicParams = true;

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

// The five NewJeans member cards carry their stylized portrait art
// (public/newjeans/<id>.svg) right on the codex page.
const NEWJEANS_PORTRAITS = new Set(["minji", "hanni", "danielle", "haerin", "hyein"]);

export default async function BuffCardPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const buff = BUFF_BY_ID[params.id];
  if (!buff) notFound();
  return (
    <>
      {NEWJEANS_PORTRAITS.has(buff.id) && (
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <div className="plate corner-cut mx-auto w-40 overflow-hidden p-2 sm:w-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/newjeans/${buff.id}.svg`}
              alt={`${buff.name} portrait`}
              className="h-auto w-full rounded-sm"
              draggable={false}
            />
          </div>
        </div>
      )}
      <BuffDetail buff={buff} />
      {/* The one card that literally links out: Check Out Our Socials shows the
          real accounts right on its codex page. */}
      {buff.id === "check_out_our_socials" && (
        <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
          <SocialsRow label="Check out our socials" className="mt-2" />
        </div>
      )}
    </>
  );
}
