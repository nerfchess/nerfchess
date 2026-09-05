"use client";

// The stats landing: a thin fork between the two scopes. The numbers
// themselves live on /mod/stats/all (every game, bots included) and
// /mod/stats/humans (human-vs-human archive rows only); this page just points
// at them.

import { StatsShell } from "@/components/mod/stats/StatsShell";
import { LinkButton } from "@/components/ui/Button";

export default function ModStatsPage() {
  return (
    <StatsShell
      title="Site statistics"
      subtitle="Two views of the same numbers: pick a scope."
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <ScopeCard
          href="/mod/stats/all"
          name="All numbers"
          blurb="Every game on the site, bots included"
        />
        <ScopeCard
          href="/mod/stats/humans"
          name="Humans only"
          blurb="Human vs human games, no bot seats"
        />
      </div>
    </StatsShell>
  );
}

/** One big tappable card per scope. The card is a LinkButton so it wears the
 *  theme's button material; the inner span gives it its height. */
function ScopeCard({ href, name, blurb }: { href: string; name: string; blurb: string }) {
  return (
    <LinkButton href={href} tone="ghost" block>
      <span className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="font-display text-2xl text-parchment-50">{name}</span>
        <span className="text-sm font-normal text-parchment-400">{blurb}</span>
      </span>
    </LinkButton>
  );
}
