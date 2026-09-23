"use client";

// The Quick pairing mode selector's two halves, in their own file so the
// lobby skeleton can draw the same buttons the page will (ModeSegmentSlots)
// without pulling in Quick Match and its socket.

import type { DraftMode } from "@/engine/buff";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/lib/session/SessionProvider";

// One half of the mode selector. The description rides on aria-label so the
// accessible names the mode-defaults e2e spec matches survive the compaction
// (buff: "...Start with normal chess..."; nerf: "Start with a secret
// handicap...").
export function ModeSegment({
  mode,
  rating,
  pending = false,
  selected,
  onClick,
}: {
  mode: DraftMode;
  rating: number | null;
  /** The rating is still being read: hold its width. */
  pending?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const isNerf = mode === "nerf";
  const label = isNerf ? "Nerf" : "Buff";
  const description = isNerf
    ? "Nerf. Start with a secret handicap. Draft curses for your opponent."
    : "Buff. Start with normal chess. Draft powers for your own army.";
  return (
    <Button
      tone={selected ? "primary" : "default"}
      size="sm"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={description}
      title={description}
      className="font-semibold"
    >
      {label}
      <span className="font-mono text-[12px] font-normal tabular-nums opacity-80">
        {pending ? <span aria-hidden className="skeleton inline-block w-[4ch]">&nbsp;</span> : (rating ?? "?")}
      </span>
    </Button>
  );
}

// The two segments before the lobby renders: the real buttons, inert, with
// the rating a registered player will see held by a skeleton and a "?" for a
// guest or a signed-out visitor, both read from the session at first paint.
// The skeleton used to draw two 63px blocks, and the page's segments (label
// plus a four-digit rating) replaced them 43px wider.
export function ModeSegmentSlots() {
  const { display } = useSession();
  const registered = !!display && !display.isGuest;
  return (
    <div className="flex items-stretch gap-1" aria-hidden inert>
      <ModeSegment mode="buff" rating={null} pending={registered} selected={false} onClick={() => {}} />
      <ModeSegment mode="nerf" rating={null} pending={registered} selected={false} onClick={() => {}} />
    </div>
  );
}
