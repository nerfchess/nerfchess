"use client";

// The in-page load failure for a social detail page (a club, a tournament, a
// message thread) whose data the page fetches itself. It is the same three
// halves as components/ui/RouteError (what failed, a Retry, a way out), with
// the site header kept because only the data call failed, not the page. A 404
// is not this: those pages render NotFoundPanel with the shared copy (F031).

import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, LinkButton } from "@/components/ui/Button";

export function DetailLoadFailed({
  active,
  title,
  detail,
  retry,
  back,
}: {
  /** The header's active nav entry. */
  active: string;
  /** What failed, as a sentence. It is the page's h1 while it shows. */
  title: string;
  detail: string;
  /** Re-run the page's own load; the panel shows busy until it settles. */
  retry: () => Promise<unknown>;
  back: { href: string; label: string };
}) {
  const [busy, setBusy] = useState(false);
  const onRetry = async () => {
    setBusy(true);
    try {
      await retry();
    } catch {
      // The page keeps its own error state; this only ends the busy state.
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen">
      <SiteHeader active={active} />
      <section className="flex justify-center px-5 py-16 sm:px-6">
        <div className="plate w-full max-w-md p-5 sm:p-6" role="alert">
          <h1 className="page-title">{title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-parchment-300">{detail}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button tone="primary" onClick={onRetry} loading={busy}>
              Retry
            </Button>
            <LinkButton tone="default" href={back.href}>
              {back.label}
            </LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
