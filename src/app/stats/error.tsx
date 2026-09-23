"use client";

// Error boundary for the /stats redirect shim. Scoped so the message names the
// real destination (the player's own statistics on their profile) rather than
// the root boundary's generic copy.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="Your statistics could not open"
      detail="This page only forwards you to the statistics on your profile, and that hand-off failed. Retry, or open your profile from the account menu."
    />
  );
}
