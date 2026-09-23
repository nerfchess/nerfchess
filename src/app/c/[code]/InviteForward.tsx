"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Sends a person who opened an invite link straight to the join flow (the
// lobby's Friends tab opens it when a code is present), exactly like the old
// /friend?code= links. Crawlers and chat unfurlers do not run it, so they
// read this route's own title and preview card instead of the lobby's.
export function InviteForward({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return null;
}
