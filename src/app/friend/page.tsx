"use client";

import { MobileNavMenu } from "@/components/MobileNavMenu";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { OnlineMatch } from "@/components/OnlineMatch";
import {
  clearSavedFriendSession,
  loadSavedFriendSession,
  MPSession,
  MPStart,
} from "@/lib/multiplayer";

type View = "setup" | "lobby" | "joining" | "game";

const TIME_STEPS_SEC = [
  30,
  45,
  60,
  90,
  120,
  150,
  180,
  ...range(5 * 60, 10 * 60, 60),
  ...range(12 * 60, 30 * 60, 2 * 60),
  ...range(35 * 60, 2 * 60 * 60, 5 * 60),
];

export default function FriendPage() {
  const [view, setView] = useState<View>("setup");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [baseSec, setBaseSec] = useState(600);
  const [incrementSec, setIncrementSec] = useState(0);
  // Friend games always run the Draft ruleset and are always casual. The
  // host picks the section: Buff mode (no nerfs) or Nerf mode (secret
  // handicaps revealed at game end). Buff mode is the default. Picks stay
  // hidden; everything reveals at game end.
  const [gameMode, setGameMode] = useState<"nerf" | "buff">("buff");
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<MPStart | null>(null);
  // Direct challenge: ?challenge=NAME pre-addresses the game to that player;
  // creating it then notifies them instead of relying on a shared code.
  const [challenging, setChallenging] = useState<string | null>(null);

  const sessionRef = useRef<MPSession | null>(null);
  const expectedChallengeHostRef = useRef<string | null>(null);

  // Tell the target the game exists; failures degrade to a plain friend code.
  const registerChallenge = async (to: string, gameCode: string, timeSec: number, incSec: number) => {
    try {
      await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, code: gameCode, timeSec, incrementSec: incSec }),
      });
    } catch {}
  };

  const cancelChallenge = (gameCode: string) => {
    if (!gameCode) return;
    try {
      void fetch(`/api/challenges/${encodeURIComponent(gameCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancelled" }),
      });
    } catch {}
  };

  const claimIncomingChallenge = async (gameCode: string): Promise<{ ok: boolean; from?: string }> => {
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(gameCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accepted" }),
      });
      // Not every friend code is a direct challenge. Public codes, signed-out
      // users, and hosts simply fall through to the normal websocket join.
      if (res.status === 401 || res.status === 403 || res.status === 404) return { ok: true };
      const data = (await res.json().catch(() => null)) as { error?: string; from?: string } | null;
      if (res.ok) return { ok: true, from: data?.from };
      setError(data?.error ?? "That challenge is no longer available.");
      return { ok: false };
    } catch {
      return { ok: true };
    }
  };

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  // Set up the session event handler for the pre-game phase; once `start`
  // arrives, OnlineMatch takes over the event stream.
  const wireSession = (sess: MPSession) => {
    sess.on((e) => {
      if (e.type === "open") {
        setCode(e.code);
        setView("lobby");
      } else if (e.type === "start") {
        const expectedHost = expectedChallengeHostRef.current;
        if (expectedHost && e.setup.players?.w?.name !== expectedHost) {
          setError("That challenge no longer points to the player who sent it.");
          sess.destroy();
          if (sessionRef.current === sess) sessionRef.current = null;
          expectedChallengeHostRef.current = null;
          clearSavedFriendSession();
          setView("setup");
          return;
        }
        setStart(e.setup);
        setCode(e.setup.id);
        setError(null);
        setView("game");
      } else if (e.type === "error" && view !== "game") {
        setError(e.message);
      }
    });
  };

  useEffect(() => {
    if (sessionRef.current) return;
    const search = new URLSearchParams(window.location.search);
    // Arriving with a shared code (e.g. from the lobby's join box) joins
    // that game immediately.
    const codeParam = search.get("code")?.trim().toUpperCase();
    if (codeParam) {
      setJoinCode(codeParam);
      // A refresh mid-game lands here with the challenge code still in the
      // URL. By then the challenge record is consumed and the joiner seat is
      // taken, so a fresh join can never succeed; the saved seat token is the
      // only way back into the game. Resume it, and only fall back to a fresh
      // join when there is no saved seat for this code or the server refuses
      // the seat (game gone or archived).
      const savedForCode = loadSavedFriendSession();
      if (savedForCode && savedForCode.id === codeParam) {
        setCode(savedForCode.id);
        setView("joining");
        const sess = new MPSession();
        sessionRef.current = sess;
        wireSession(sess);
        sess.resume(savedForCode).catch(() => {
          if (sessionRef.current !== sess) return;
          sess.destroy();
          sessionRef.current = null;
          clearSavedFriendSession();
          void joinWithCode(codeParam);
        });
      } else {
        void joinWithCode(codeParam);
      }
      return;
    }
    // Mode preselected on the play page carries over (?mode=nerf|buff).
    const modeParam = search.get("mode");
    if (modeParam === "nerf" || modeParam === "buff") setGameMode(modeParam);
    const challengeParam = search.get("challenge")?.trim();
    if (challengeParam) {
      setChallenging(challengeParam);
      return;
    }
    const saved = loadSavedFriendSession();
    if (!saved) return;
    setCode(saved.id);
    setView("joining");
    let cancelled = false;
    const resumeSaved = async () => {
      // A finished game must never re-capture this page: if the saved game
      // is already archived, drop the stale session and show the setup form.
      try {
        const res = await fetch(`/api/games/${encodeURIComponent(saved.id)}`);
        if (cancelled) return;
        if (res.ok) {
          clearSavedFriendSession();
          setView("setup");
          return;
        }
      } catch {}
      if (cancelled || sessionRef.current) return;
      const sess = new MPSession();
      sessionRef.current = sess;
      wireSession(sess);
      sess.resume(saved).catch(() => {
        if (sessionRef.current !== sess) return;
        clearSavedFriendSession();
        sessionRef.current = null;
        setView("setup");
      });
    };
    void resumeSaved();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setError(null);
    clearSavedFriendSession();
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    try {
      const c = await sess.host(baseSec, incrementSec, {
        draft: true,
        mode: gameMode,
        // Direct challenge: the server reserves the opponent seat for them,
        // so a lobby stranger can never take it first.
        ...(challenging ? { invite: challenging } : {}),
      });
      if (sessionRef.current !== sess) return;
      setCode(c);
      setView("lobby");
      if (challenging) registerChallenge(challenging, c, baseSec, incrementSec);
    } catch (e) {
      if (sessionRef.current !== sess) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const joinWithCode = async (trimmed: string) => {
    setError(null);
    clearSavedFriendSession();
    expectedChallengeHostRef.current = null;
    if (!trimmed) {
      setError("Enter a code.");
      return;
    }
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    setView("joining");
    try {
      const claimed = await claimIncomingChallenge(trimmed);
      expectedChallengeHostRef.current = claimed.from ?? null;
      if (!claimed.ok) {
        if (sessionRef.current === sess) {
          sess.destroy();
          sessionRef.current = null;
          expectedChallengeHostRef.current = null;
          setView("setup");
        }
        return;
      }
      await sess.join(trimmed);
      // The game starts on receipt of the server `start` frame.
    } catch (e) {
      // Join refused (host left, seat taken, bad code): drop the session and
      // all challenge expectations so the setup form starts clean.
      if (sessionRef.current !== sess) return;
      sess.destroy();
      sessionRef.current = null;
      expectedChallengeHostRef.current = null;
      setError((e instanceof Error ? e.message : String(e)) || "Failed to connect. Check the code.");
      setView("setup");
    }
  };

  const handleJoin = () => joinWithCode(joinCode.trim().toUpperCase());

  const handleExit = () => {
    if (challenging && view === "lobby") cancelChallenge(code);
    clearSavedFriendSession();
    sessionRef.current?.destroy();
    sessionRef.current = null;
    expectedChallengeHostRef.current = null;
    setStart(null);
    setView("setup");
    setCode("");
    setJoinCode("");
    setError(null);
  };

  if (view === "game" && start && sessionRef.current) {
    return (
      <OnlineMatch
        session={sessionRef.current}
        start={start}
        subtitle={`code ${start.id}`}
        onExit={handleExit}
      />
    );
  }

  if (view === "lobby") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-xl mx-auto px-6 py-12 text-center">
          <div className="smallcaps text-[11px] text-parchment-400">
            {challenging ? `Challenge sent to ${challenging}` : "Share this code"}
          </div>
          <div className="mt-3 font-mono text-5xl tracking-[0.2em] text-gold-leaf">{code}</div>
          <p className="mt-6 text-parchment-200">
            {challenging
              ? `${challenging} has been notified. The game starts as soon as they accept.`
              : "Send the code to your friend. They open this page and tap “Join”."}
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 smallcaps text-[11px] text-parchment-400">
            <span className="w-1.5 h-1.5 rounded-full bg-verdigris animate-flicker" />
            Waiting for opponent…
          </div>
          {error && (
            <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
              {error}
            </div>
          )}
          <button
            onClick={handleExit}
            className="mt-8 px-5 py-2 rounded-sm btn-ghost font-body"
          >
            Cancel
          </button>
        </section>
      </main>
    );
  }

  if (view === "joining") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-xl mx-auto px-6 py-12 text-center">
          <div className="smallcaps text-[11px] text-parchment-400">Connecting…</div>
          <div className="mt-3 font-mono text-4xl tracking-[0.2em] text-gold-leaf">{joinCode || code}</div>
          {error && (
            <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
              {error}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display text-5xl">{challenging ? `Challenge ${challenging}` : "Play a Friend"}</h1>
        <p className="mt-3 text-parchment-200">
          {challenging
            ? `Pick a time control and create the game. ${challenging} gets a notification and the game starts when they accept.`
            : "Create a game and share the code, or join one with a code your friend sent you. Choose Buff mode (no nerfs, pure buff drafting) or Nerf mode (secret handicaps, revealed at the end)."}
        </p>

        {error && (
          <div className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
            {error}
          </div>
        )}

        <div className="mt-8 plate p-6 sm:p-7 space-y-6">
          <div className="space-y-4">
            <TimeSlider
              label="Time per Side"
              value={baseSec}
              values={[0, ...TIME_STEPS_SEC]}
              display={baseSec === 0 ? "Unlimited" : formatTimeControl(baseSec)}
              formatEdgeLabel={formatTimeControl}
              onChange={setBaseSec}
            />
            <TimeSlider
              label="Increment (Seconds)"
              value={incrementSec}
              values={range(0, 30, 1)}
              display={String(incrementSec)}
              disabled={baseSec === 0}
              onChange={setIncrementSec}
            />
          </div>

          <div>
            <div className="smallcaps text-[11px] text-parchment-400 mb-2">Game mode</div>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton selected={gameMode === "buff"} onClick={() => setGameMode("buff")}>
                Buff mode
              </OptionButton>
              <OptionButton selected={gameMode === "nerf"} onClick={() => setGameMode("nerf")}>
                Nerf mode
              </OptionButton>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-parchment-400">
              {gameMode === "buff"
                ? "No nerfs at all. Every few moves both players draft a buff; the strongest build wins. Always casual."
                : "Both players pick a secret nerf that only reveals when the game ends. Rare drafts, about every ten moves, can soften or remove it. Always casual."}
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="w-full py-3.5 rounded-sm btn-leaf font-body text-lg"
          >
            {challenging ? `Send challenge to ${challenging}` : "Create game"}
          </button>

          {!challenging && (
          <>
          <div className="rule-ornament">
            <span>or</span>
          </div>

          <div>
            <div className="smallcaps text-[11px] text-parchment-400 mb-2">Join with a code</div>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={6}
                className="min-w-0 flex-1 bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 text-lg font-mono tracking-widest uppercase focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="px-5 rounded-sm btn-ghost font-body disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
          </>
          )}
        </div>
      </section>
    </main>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 border transition text-xs font-display font-semibold tracking-wide " +
        (selected
          ? "border-gold/50 bg-gold/10 text-gold-leaf"
          : "border-white/15 bg-white/[0.03] text-parchment-200 hover:border-white/30 hover:bg-white/[0.06]")
      }
    >
      {children}
    </button>
  );
}

function range(start: number, end: number, step: number) {
  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

function formatTimeControl(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}:${remainingSec.toString().padStart(2, "0")}`;
}

function TimeSlider({
  label,
  value,
  values,
  display,
  disabled = false,
  formatEdgeLabel = String,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  display: string;
  disabled?: boolean;
  formatEdgeLabel?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const index = Math.max(0, values.indexOf(value));

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between mb-2">
        <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
        <div className="font-mono text-sm text-gold-leaf tabular-nums">{display}</div>
      </div>
      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        className="w-full accent-gold-leaf disabled:cursor-not-allowed"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-parchment-400">
        <span>{formatEdgeLabel(values[0])}</span>
        <span>{formatEdgeLabel(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

function SiteNav() {
  return (
    <nav className="flex items-center justify-between px-10 py-7">
      <Link href="/" className="font-display text-2xl tracking-tight">
        nerf<span className="text-gold-leaf">chess</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/play" className="hidden sm:inline-block px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">
          vs Bot
        </Link>
        <MobileNavMenu />
      </div>
    </nav>
  );
}
