"use client";

// /stats no longer hosts the site-wide numbers (those moved to the moderation
// area at /mod/stats). It now sends players to their own numbers: the profile's
// Statistics section. Signed-in visitors land straight on their profile;
// signed-out visitors have no personal statistics, so they are routed through
// sign-in with `next=/stats`, which lands them on their own numbers the moment
// they authenticate rather than dead-ending on an unrelated wall.
//
// A session check that fails in transit (`fetchMe()` resolves undefined) is
// not "signed out": sending a signed-in player to the sign-in page on a flaky
// connection was the old behaviour. It now stops and offers Retry.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/authClient";
import { Button, LinkButton } from "@/components/ui/Button";

export default function StatsRedirect() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      if (me === undefined) {
        setFailed(true);
        return;
      }
      router.replace(me ? `/u/${encodeURIComponent(me.username)}` : "/login?next=/stats");
    });
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  return (
    <main className="min-h-screen grid place-items-center px-5 py-10 sm:px-6">
      {/* A redirect shim still renders for a beat, and often longer than a
          beat on a slow connection while fetchMe resolves. Without a heading
          the route cannot be identified by anyone arriving with a screen
          reader, and the sweep counts it as a route with no h1, which it is. */}
      <h1 className="sr-only">Your statistics</h1>
      {failed ? (
        <div className="plate w-full max-w-md p-5 sm:p-6" role="alert">
          <p className="text-[13px] leading-relaxed text-parchment-300">
            Could not check your account, so there is nowhere to send you yet. Your
            statistics live on your profile.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              tone="primary"
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              Retry
            </Button>
            <LinkButton tone="default" href="/lobby">
              Back to lobby
            </LinkButton>
          </div>
        </div>
      ) : (
        <p className="text-parchment-400" role="status">
          Redirecting…
        </p>
      )}
    </main>
  );
}
