"use client";

// Error boundary for one saved replay. Scoped separately from /history so a
// replay whose stored moves no longer rebuild (a corrupt entry, or a rule that
// changed since the game was saved) cannot take the whole list down with it,
// and so the way out goes back to that list.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="This replay could not be rebuilt"
      detail="The saved moves for this game failed to replay in the browser. The game is still in your history on this device."
      back={{ href: "/history", label: "Back to history" }}
    />
  );
}
