"use client";

// Error boundary for ONE club (F032). Without it a club page fell back to the
// directory's boundary, whose copy talks about the club directory and sends
// the reader to the lobby. Scoped here so the message names the club and the
// way out is the club list.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="This club could not load"
      detail="The club page failed to render. Your membership and the club board are unaffected."
      back={{ href: "/clubs", label: "All clubs" }}
    />
  );
}
