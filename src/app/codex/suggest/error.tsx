"use client";

// Error boundary for the card suggestion form. Scoped so the copy is about the
// form rather than the codex boundary's "rule library" line, and so the way
// out returns to the codex the reader came from.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="The suggestion form could not load"
      detail="The form failed to render before anything was sent. Retry to open it again; a suggestion you had started may need to be written again."
      back={{ href: "/codex", label: "Back to the codex" }}
    />
  );
}
