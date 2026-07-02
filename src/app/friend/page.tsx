"use client";

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
  5,
  10,
  15,
  20,
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
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState<MPStart | null>(null);

  const sessionRef = useRef<MPSession | null>(null);

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
    const saved = loadSavedFriendSession();
    if (!saved) return;
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    setCode(saved.id);
    setView("joining");
    sess.resume(saved).catch(() => {
      if (sessionRef.current !== sess) return;
      clearSavedFriendSession();
      sessionRef.current = null;
      setView("setup");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    setError(null);
    clearSavedFriendSession();
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    try {
      const c = await sess.host(baseSec, incrementSec);
      if (sessionRef.current !== sess) return;
      setCode(c);
      setView("lobby");
    } catch (e) {
      if (sessionRef.current !== sess) return;
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleJoin = async () => {
    setError(null);
    clearSavedFriendSession();
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter a code.");
      return;
    }
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    setView("joining");
    try {
      await sess.join(trimmed);
      // The game starts on receipt of the server `start` frame.
    } catch (e) {
      if (sessionRef.current !== sess) return;
      setError((e instanceof Error ? e.message : String(e)) || "Failed to connect. Check the code.");
      setView("setup");
    }
  };

  const handleExit = () => {
    clearSavedFriendSession();
    sessionRef.current?.destroy();
    sessionRef.current = null;
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
          <div className="smallcaps text-[11px] text-parchment-400">Share this code</div>
          <div className="mt-3 font-mono text-5xl tracking-[0.2em] text-gold-leaf">{code}</div>
          <p className="mt-6 text-parchment-200">
            Send the code to your friend. They open this page and tap “Join”.
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
        <h1 className="font-display text-5xl">Play a Friend</h1>
        <p className="mt-3 text-parchment-200">
          Create a game and share the code, or join one with a code your friend sent you.
          Both players get a random secret rule.
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

          <button
            onClick={handleCreate}
            className="w-full py-3.5 rounded-sm btn-leaf font-body text-lg"
          >
            Create game
          </button>

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
                className="flex-1 bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 text-lg font-mono tracking-widest uppercase focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
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
        </div>
      </section>
    </main>
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
      <Link href="/play" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">
        vs Bot
      </Link>
    </nav>
  );
}
