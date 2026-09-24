import { InfoSection } from "@/components/InfoPageLayout";
import { TeamJsonLd } from "@/components/seo/JsonLd";
import { TEAM, TEAM_ANCHOR } from "@/lib/team";

// The team on /about (brief section 18): names, titles and what each person
// is responsible for at Nerf Chess, from src/lib/team.ts, plus the matching
// Person structured data. One row per person in a plain list, not three
// look-alike cards (docs/DESIGN.md, anti-slop guardrail). Each row carries an
// anchor, so the footer credit and the structured data can point at it.
export function TeamSection() {
  return (
    <InfoSection title="The team" id={TEAM_ANCHOR}>
      <TeamJsonLd />
      <p>Nerf Chess is made by a small team.</p>
      <ul className="divide-y divide-[color:var(--edge)] border-y border-[color:var(--edge)]">
        {TEAM.map((m) => (
          <li key={m.slug} id={m.slug} className="scroll-mt-20 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-display text-[15px] font-semibold text-parchment-50">{m.name}</span>
              <span className="text-[13px] text-parchment-400">{m.title}</span>
            </div>
            <p className="mt-1 text-[15px] text-parchment-200">{m.role}</p>
          </li>
        ))}
      </ul>
    </InfoSection>
  );
}
