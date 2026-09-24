"use client";

// The moderator gate shared by every /mod page (the console, the card editor,
// the house-bot editor and the stats pages).
//
// The answer comes from the shared session store (useSession), so these pages
// ride the one /api/auth/me request the header already makes. A session check
// that fails in transit (fetchMe() resolves undefined: offline, 5xx) used to
// read as "still loading" forever; it now stops and offers Retry, the same way
// /stats does.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fetchMe, type AccountUser } from "@/lib/authClient";
import { useSession } from "@/lib/session/SessionProvider";
import { Button } from "@/components/ui/Button";

export interface ModGateState {
  /** undefined until known; null when signed out. */
  me: AccountUser | null | undefined;
  /** The session check failed in transit, so the answer is still unknown. */
  failed: boolean;
  retry: () => void;
  isMod: boolean;
  isAdmin: boolean;
}

export function useModGate(): ModGateState {
  const { user } = useSession();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (user !== undefined) return undefined;
    let cancelled = false;
    // Shares the in-flight request when the header already asked.
    void fetchMe().then((answer) => {
      if (!cancelled && answer === undefined) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  const isMod = !!user && (user.role === "mod" || user.role === "admin");
  return { me: user, failed: failed && user === undefined, retry, isMod, isAdmin: user?.role === "admin" };
}

/** What a gated page shows until the mod check passes. */
export function ModGateNotice({ gate }: { gate: ModGateState }) {
  const path = usePathname() ?? "/mod";
  if (gate.me === undefined) {
    if (gate.failed) {
      return (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-parchment-200">
          <span>Could not check your session. The server did not answer.</span>
          <Button size="sm" onClick={gate.retry}>
            Retry
          </Button>
        </div>
      );
    }
    return <p className="text-sm text-parchment-400">Loading…</p>;
  }
  return (
    <p className="text-parchment-200">
      This page is for moderators.{" "}
      {!gate.me && (
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="text-parchment-50 underline underline-offset-2">
          Sign in
        </Link>
      )}
    </p>
  );
}
