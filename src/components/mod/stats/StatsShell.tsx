"use client";

// Shared frame for the mod stats pages: top nav, the moderator gate, and the
// page heading. Gated the same way as /mod: these pages hide themselves from
// non-mods (the numbers come from /api/stats, which has always been public
// data; regular players see their own numbers on their profile instead).
//
// Children render only once the mod check passes, so anything they fetch
// (the stats payload, the lazy nerf library chunk) waits for the gate too.

import type { ReactNode } from "react";
import { ModGateNotice, useModGate } from "@/components/mod/ModGate";
import { ModShell } from "@/components/mod/ModShell";

export function StatsShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  const gate = useModGate();

  return (
    <ModShell title={title} isAdmin={gate.isAdmin}>
      {!gate.isMod ? (
        <ModGateNotice gate={gate} />
      ) : (
        <>
          <p className="text-[13px] text-parchment-400">{subtitle}</p>
          {children}
        </>
      )}
    </ModShell>
  );
}
