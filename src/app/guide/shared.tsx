import Link from "next/link";
import { GlossaryText } from "@/components/GlossaryText";
import { InfoSection } from "@/components/InfoPageLayout";
import { LinkButton } from "@/components/ui/Button";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { GuideJsonLd } from "@/components/seo/GuideJsonLd";

// Shared plumbing for the /guide section: server-rendered evergreen pages
// written for search engines and AI answer engines. Everything here renders
// static HTML (no client components), so crawlers that do not execute
// JavaScript still see the full content.

export const GUIDE_PAGES = [
  { href: "/guide", label: "What is Nerf Chess?" },
  { href: "/guide/how-to-play", label: "How to play" },
  { href: "/guide/nerf-mode", label: "Nerf mode" },
  { href: "/guide/buff-mode", label: "Buff mode" },
  { href: "/guide/chess-with-power-ups", label: "Chess with power-ups" },
  { href: "/guide/capture-the-king", label: "Capture the king" },
  { href: "/guide/chess-roguelike", label: "Chess roguelike" },
  { href: "/guide/chess-variants", label: "Chess variants" },
  { href: "/guide/glossary", label: "Glossary" },
] as const;

export type FaqItem = { question: string; answer: string };

/** FAQPage structured data plus the visible Q&A section that backs it up.
 * Google requires the marked-up questions to be visible on the page. */
export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <>
      <FaqJsonLd items={items} />
      <InfoSection title="Frequently asked questions">
        {items.map((f) => (
          <div key={f.question}>
            <h3 className="font-display text-lg text-parchment">{f.question}</h3>
            {/* Answers render through GlossaryText so every game term in them
                is clickable; the JSON-LD above keeps the plain strings. */}
            <p className="mt-1">
              <GlossaryText text={f.answer} />
            </p>
          </div>
        ))}
      </InfoSection>
    </>
  );
}

/** Structured data for a guide subpage: an Article by the Nerf Chess team
 *  and its Home > Guide > page breadcrumb (src/components/seo/GuideJsonLd.tsx).
 *  The name is kept so every guide page's call site stays as it was. */
export function BreadcrumbJsonLd({ title, path }: { title: string; path: string }) {
  return <GuideJsonLd title={title} path={path} />;
}

/** Cross-links to the rest of the guide plus the main play surfaces, so every
 * guide page is reachable from every other one. */
export function GuideFooter({ current }: { current: string }) {
  return (
    <div className="pt-4">
      <div className="text-[12px] text-parchment-400">keep reading</div>
      <div className="mt-3 flex flex-wrap gap-3">
        {GUIDE_PAGES.filter((p) => p.href !== current).map((p) => (
          <LinkButton tone="ghost"
            key={p.href}
            href={p.href}
            className="px-4 py-2 text-sm">
            {p.label}
          </LinkButton>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <LinkButton tone="leaf" href="/play" className="px-5 py-2.5">
          Play vs the bot
        </LinkButton>
        <LinkButton tone="ghost" href="/lobby" className="px-5 py-2.5">
          Play online
        </LinkButton>
        <LinkButton tone="ghost" href="/codex" className="px-5 py-2.5">
          Browse the codex
        </LinkButton>
      </div>
    </div>
  );
}
