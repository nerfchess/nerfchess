import Link from "next/link";
import { InfoSection } from "@/components/InfoPageLayout";

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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InfoSection title="Frequently asked questions">
        {items.map((f) => (
          <div key={f.question}>
            <h3 className="font-display text-lg text-parchment">{f.question}</h3>
            <p className="mt-1">{f.answer}</p>
          </div>
        ))}
      </InfoSection>
    </>
  );
}

/** BreadcrumbList structured data for a guide subpage. */
export function BreadcrumbJsonLd({ title, path }: { title: string; path: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Nerf Chess", item: "https://nerfchess.com" },
      { "@type": "ListItem", position: 2, name: "Guide", item: "https://nerfchess.com/guide" },
      { "@type": "ListItem", position: 3, name: title, item: `https://nerfchess.com${path}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** Cross-links to the rest of the guide plus the main play surfaces, so every
 * guide page is reachable from every other one. */
export function GuideFooter({ current }: { current: string }) {
  return (
    <div className="pt-4">
      <div className="smallcaps text-[11px] text-parchment-400">keep reading</div>
      <div className="mt-3 flex flex-wrap gap-3">
        {GUIDE_PAGES.filter((p) => p.href !== current).map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="px-4 py-2 rounded-sm btn-ghost font-display text-sm"
          >
            {p.label}
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/play" className="px-5 py-2.5 rounded-sm btn-leaf font-display">
          Play vs the bot
        </Link>
        <Link href="/lobby" className="px-5 py-2.5 rounded-sm btn-ghost font-display">
          Play online
        </Link>
        <Link href="/codex" className="px-5 py-2.5 rounded-sm btn-ghost font-display">
          Browse the codex
        </Link>
      </div>
    </div>
  );
}
