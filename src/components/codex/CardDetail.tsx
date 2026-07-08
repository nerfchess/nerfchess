import Link from "next/link";
import type { ReactNode } from "react";
import { GlossaryText } from "@/components/GlossaryText";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import {
  type CardType,
  type RelatedCard,
  buffCategory,
  buffModes,
  buffType,
  modeLabel,
  nerfCategoryLabels,
  relatedBuffs,
  relatedNerfs,
  tierMeaning,
  tierName,
  turnCostMeaning,
} from "@/lib/cardCodex";
import { buffCollection, nerfCollection } from "@/lib/cardCollections";

// Server-rendered detail page for a single card, shared by /codex/buff/[id]
// and /codex/nerf/[id]. Everything here is plain HTML (no client component),
// so the full name, effect, and context of all ~1000 cards ship in the crawled
// markup: the codex list itself is a client component and never was.

// BreadcrumbList structured data: Home > Codex > (Buffs|Nerfs) > card.
function CardBreadcrumbJsonLd({ section, name, path }: { section: string; name: string; path: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nerf Chess", item: "https://nerfchess.com" },
      { "@type": "ListItem", position: 2, name: "Codex", item: "https://nerfchess.com/codex" },
      { "@type": "ListItem", position: 3, name: section, item: "https://nerfchess.com/codex" },
      { "@type": "ListItem", position: 4, name, item: `https://nerfchess.com${path}` },
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

function TypeBadge({ type }: { type: CardType }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-white/15 px-2 py-0.5 text-[11px] smallcaps text-parchment-300">
      {type}
    </span>
  );
}

// One row of the "At a glance" definition list.
function GlanceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="smallcaps text-[11px] text-parchment-400 sm:w-32 sm:shrink-0 sm:pt-0.5">{label}</dt>
      <dd className="text-[15px] text-parchment-100">{children}</dd>
    </div>
  );
}

function NotDraftedNote() {
  return (
    <p className="mb-4 rounded-sm border border-sun/30 bg-sun/5 px-4 py-2 text-sm text-parchment-200">
      This card is written but not yet appearing in drafts. Its wording and tier may still change.
    </p>
  );
}

function RelatedGrid({ title, cards }: { title: string; cards: RelatedCard[] }) {
  if (cards.length === 0) return null;
  return (
    <InfoSection title={title}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={c.path}
            className="flex items-center justify-between gap-3 rounded-sm border border-white/10 px-3 py-2 transition hover:border-gold/40 hover:bg-white/5"
          >
            <span className="font-display text-parchment-100">{c.name}</span>
            <span className="smallcaps text-[10px] text-parchment-400">{tierName(c.tier)}</span>
          </Link>
        ))}
      </div>
    </InfoSection>
  );
}

function CardCtas({ guideHref, guideLabel }: { guideHref: string; guideLabel: string }) {
  return (
    <div className="pt-4">
      <div className="smallcaps text-[11px] text-parchment-400">keep exploring</div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link href="/codex" className="rounded-sm btn-ghost px-4 py-2 font-display text-sm">
          Browse the full codex
        </Link>
        <Link href={guideHref} className="rounded-sm btn-ghost px-4 py-2 font-display text-sm">
          {guideLabel}
        </Link>
        <Link href="/play" className="rounded-sm btn-leaf px-4 py-2 font-display text-sm">
          Play a game
        </Link>
      </div>
    </div>
  );
}

export function BuffDetail({ buff }: { buff: Buff }) {
  const type = buffType(buff);
  const cat = buffCategory(buff);
  const modes = buffModes(buff);
  const where = modeLabel(modes);
  const path = `/codex/buff/${buff.id}`;
  const isHex = buff.category === "hex";
  const draftLine = isHex
    ? `You draft ${buff.name} in Nerf mode and cast it on your opponent.`
    : `You draft ${buff.name} in ${where === "Buff mode and Nerf mode" ? "either mode" : where}.`;

  return (
    <InfoPageLayout eyebrow={`codex · ${type.toLowerCase()}`} title={buff.name} intro={<GlossaryText text={buff.description} />}>
      <CardBreadcrumbJsonLd section="Buffs" name={buff.name} path={path} />
      {!buff.implemented && <NotDraftedNote />}

      <InfoSection title="At a glance">
        <dl className="space-y-3">
          <GlanceRow label="Type"><TypeBadge type={type} /></GlanceRow>
          <GlanceRow label="Tier">
            {tierName(buff.tier)}
            <span className="mt-0.5 block text-[13px] text-parchment-400">{tierMeaning(buff.tier)}</span>
          </GlanceRow>
          <GlanceRow label="Category">{cat.label}</GlanceRow>
          <GlanceRow label="Collection">{buffCollection(buff)}</GlanceRow>
          <GlanceRow label="Appears in">{where}</GlanceRow>
        </dl>
      </InfoSection>

      <InfoSection title="How it works">
        <p>
          {draftLine} {turnCostMeaning(buff)}
        </p>
        <p>As a {cat.label.toLowerCase()} card, it {cat.blurb}</p>
        {buff.flavor && <p className="border-l border-gold/40 pl-4 italic text-parchment-300">&ldquo;{buff.flavor}&rdquo;</p>}
      </InfoSection>

      <RelatedGrid title="Related cards" cards={relatedBuffs(buff)} />

      <CardCtas
        guideHref={isHex || where === "Nerf mode" ? "/guide/nerf-mode" : "/guide/buff-mode"}
        guideLabel={isHex || where === "Nerf mode" ? "How Nerf mode works" : "How Buff mode works"}
      />
    </InfoPageLayout>
  );
}

export function NerfDetail({ nerf }: { nerf: Nerf }) {
  const path = `/codex/nerf/${nerf.id}`;
  const cats = nerfCategoryLabels(nerf);

  return (
    <InfoPageLayout eyebrow="codex · nerf" title={nerf.name} intro={<GlossaryText text={nerf.description} />}>
      <CardBreadcrumbJsonLd section="Nerfs" name={nerf.name} path={path} />
      {!nerf.implemented && <NotDraftedNote />}

      <InfoSection title="At a glance">
        <dl className="space-y-3">
          <GlanceRow label="Type"><TypeBadge type="Nerf" /></GlanceRow>
          <GlanceRow label="Tier">
            {tierName(nerf.tier)}
            <span className="mt-0.5 block text-[13px] text-parchment-400">{tierMeaning(nerf.tier)}</span>
          </GlanceRow>
          {cats.length > 0 && <GlanceRow label="Focus">{cats.join(", ")}</GlanceRow>}
          <GlanceRow label="Collection">{nerfCollection(nerf)}</GlanceRow>
          <GlanceRow label="Appears in">Nerf mode</GlanceRow>
          <GlanceRow label="How it works">Passive and secret: it is always on, and your opponent cannot see it.</GlanceRow>
        </dl>
      </InfoSection>

      <InfoSection title="How it works">
        <p>
          {nerf.name} is one of Nerf Chess&apos;s secret handicaps. In Nerf mode you choose one of two nerfs
          before the first move, in secret, and carry it for the whole game.
        </p>
        <p>
          The board quietly enforces it: any move it forbids is simply never offered, so you cannot break it
          by accident. Your opponent never sees which nerf you took until the game ends, so every move you
          make is also a clue they are trying to read.
        </p>
        {nerf.flavor && <p className="border-l border-gold/40 pl-4 italic text-parchment-300">&ldquo;{nerf.flavor}&rdquo;</p>}
      </InfoSection>

      <RelatedGrid title="Related nerfs" cards={relatedNerfs(nerf)} />

      <CardCtas guideHref="/guide/nerf-mode" guideLabel="How Nerf mode works" />
    </InfoPageLayout>
  );
}
