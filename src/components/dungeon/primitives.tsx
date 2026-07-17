"use client";

// Shared dungeon-UI primitives for the lobby lane. Small, presentational, and
// leaning on the classes in dungeon-lobby.css so the whole matchmaking hall
// speaks the same carved-stone / torchlight language as the Open Lobby gate
// (DungeonGateButton). No data, no handlers of their own — pure dressing.

import type { ReactNode } from "react";
import "./dungeon-lobby.css";

// An engraved smallcaps section label led by a small guttering torch bead.
// The dungeon sibling of the plain `.eyebrow`, for section headers.
export function EngravedLabel({
  children,
  className = "",
  as: Tag = "div",
  torch = true,
}: {
  children: ReactNode;
  className?: string;
  /** Heading level or element to render as (defaults to a div). */
  as?: "div" | "h2" | "h3" | "span";
  /** Show the torch bead (off for inline uses that already sit beside one). */
  torch?: boolean;
}) {
  return (
    <Tag className={"dgn-engrave " + className}>
      {torch && <span aria-hidden className="dgn-engrave__torch" />}
      {children}
    </Tag>
  );
}
