"use client";

// Copy invite link (F239): copies the /c/<code> address for a friend game.
// That route (slice E2) carries its own title and preview card ("<name>
// challenged you to Nerf Chess, 5+3") and forwards to the lobby join flow, so
// a pasted link unfurls as an invitation instead of a bare code.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyInviteLink({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const id = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(id);
  }, [state]);

  const copy = async () => {
    const url = `${window.location.origin}/c/${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <span className={"inline-flex flex-col items-center gap-1 " + (className ?? "")}>
      <Button tone="default" size="sm" onClick={copy}>
        Copy invite link
      </Button>
      <span role="status" className="min-h-[1lh] text-[13px] text-parchment-400">
        {state === "copied" ? "Link copied." : state === "failed" ? "Could not copy. Share the code instead." : ""}
      </span>
    </span>
  );
}
