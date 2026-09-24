"use client";

// Error boundary for ONE conversation (F032). Without it a thread fell back to
// the inbox boundary, which says the whole inbox failed and sends the reader
// to the lobby. Scoped here so the message names the conversation and the way
// out is the inbox.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="This conversation could not load"
      detail="The thread failed to render. Nothing has been sent or lost; this is only the view."
      back={{ href: "/inbox", label: "Back to inbox" }}
    />
  );
}
