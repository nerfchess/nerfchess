"use client";

// SessionProvider + useSession: the single source of "who am I" for React.
//
// The root layout reads the display cookie (src/lib/session/who.ts) on the
// server and hands the hint in here, so the first paint, the hydration pass
// and every later render agree on the header's shape: a signed-in visitor
// never sees an unknown or signed-out header that grows once /api/auth/me
// answers (brief section 4, F001). The full user still comes from /me, once
// per page through authClient's shared request, and replaces the hint when it
// lands. The hint is never used for permissions.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ensureAccount, fetchMe, type AccountUser } from "@/lib/authClient";
import { getServerSessionUser, getSessionUser, publishSessionUser, subscribeSession } from "@/lib/session/store";
import type { SessionHint } from "@/lib/session/who";

type SessionSeed = {
  /** What the display cookie said at request time, if it parsed. */
  hint: SessionHint | null;
  /** Whether the request carried a session cookie at all. False means a
   *  first visit (or an expired session): the header will mint a guest. */
  hasSession: boolean;
  /** The last game mode this browser picked (nc_mode cookie), so pages that
   *  preselect a mode render it on the first paint (src/lib/modeState.ts). */
  lastMode: "nerf" | "buff" | null;
};

const SessionContext = createContext<SessionSeed>({ hint: null, hasSession: false, lastMode: null });

export function SessionProvider({
  hint,
  hasSession,
  lastMode,
  children,
}: SessionSeed & { children: React.ReactNode }) {
  const seed = useMemo(() => ({ hint, hasSession, lastMode }), [hint, hasSession, lastMode]);
  return <SessionContext.Provider value={seed}>{children}</SessionContext.Provider>;
}

/** The request-time mode cookie (null when the browser never picked one). */
export function useSeededMode(): "nerf" | "buff" | null {
  return useContext(SessionContext).lastMode;
}

/** Whether the request carried a session cookie. With no display hint beside
 *  it (a session from before the nc_who cookie), the account is unknown but
 *  real, so the header reserves the signed-in shape instead of the guest
 *  placeholder until /me answers (and stamps the hint for the next load). */
export function useSeededHasSession(): boolean {
  return useContext(SessionContext).hasSession;
}

/** The fields that decide the header's shape, from the user or the hint. */
export type SessionDisplay = SessionHint;

export interface Session {
  /** The full user from /api/auth/me: undefined until it answers, null when
   *  signed out. Use this for anything beyond layout (ratings, email, role
   *  gated actions). */
  user: AccountUser | null | undefined;
  /** What to draw right now: the user when known, else the server hint.
   *  undefined = genuinely unknown (first visit, or a session from before the
   *  display cookie existed); null = signed out. */
  display: SessionDisplay | null | undefined;
  /** Re-ask the server (after a rename, an avatar change, a sign-in). */
  refresh: () => Promise<AccountUser | null | undefined>;
  /** Replace the user locally after a write the server already accepted. */
  setUser: (user: AccountUser | null) => void;
}

// One /me per page, no matter how many components mount useSession: the
// first subscriber triggers it, the rest share the answer.
let bootRequested = false;

/**
 * Read the session. `ensure: true` also mints an instant guest account for a
 * signed-out visitor (the site header does this so everyone can play at once;
 * registering later upgrades the same account).
 */
export function useSession(options: { ensure?: boolean } = {}): Session {
  const { hint, hasSession } = useContext(SessionContext);
  const user = useSyncExternalStore(subscribeSession, getSessionUser, getServerSessionUser);
  const ensure = !!options.ensure;
  // While ensureAccount runs, an interim "signed out" answer from /me is not
  // something to draw: it would flash a Sign in link that the guest chip
  // replaces a moment later.
  const [minting, setMinting] = useState(ensure);

  useEffect(() => {
    const known = getSessionUser();
    if (ensure) {
      if (known) {
        // Already answered on this page (a client navigation remounted the
        // header): nothing to mint, nothing to refetch.
        queueMicrotask(() => setMinting(false));
        return undefined;
      }
      let cancelled = false;
      void ensureAccount().then(() => {
        if (!cancelled) setMinting(false);
      });
      return () => {
        cancelled = true;
      };
    }
    if (!bootRequested && known === undefined) {
      bootRequested = true;
      void fetchMe();
    }
    return undefined;
  }, [ensure]);

  const refresh = useCallback(() => fetchMe(), []);
  const setUser = useCallback((next: AccountUser | null) => publishSessionUser(next), []);

  let display: SessionDisplay | null | undefined;
  if (user) {
    display = {
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      isGuest: user.isGuest,
    };
  } else if (user === null) {
    display = minting ? undefined : null;
  } else {
    display = hasSession ? hint ?? undefined : ensure ? undefined : null;
  }
  return { user, display, refresh, setUser };
}
