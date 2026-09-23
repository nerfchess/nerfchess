"use client";

// Root error boundary: catches a render error in any segment without a scoped
// boundary of its own (guides, legal pages, about, faq, updates and so on), so
// the copy is generic. It uses the same RouteError body as every scoped
// boundary: the error is logged, the digest is shown, Retry re-fetches the
// segment and the lobby is the way out.

import { RouteError } from "@/components/ui/RouteError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      {...props}
      title="This page could not load"
      detail="Something on this page failed to render. Retry usually fixes it; if it keeps happening, head back to the lobby."
    />
  );
}
