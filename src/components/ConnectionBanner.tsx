"use client";

import { useEffect, useRef, useState } from "react";
import type { MPSession } from "@/lib/multiplayer";

// Non-blocking connection status banner for the online game and spectator
// surfaces. It subscribes to the session's coarse connection-state callback
// (socket lifecycle only, independent of the game frame stream) and floats a
// pill at the top of the screen without covering the board:
//   - while the socket is down: "Connection lost. Reconnecting… Ns" with a
//     live elapsed-seconds counter;
//   - once the socket comes back: "Reconnected" for three seconds, then it
//     dismisses itself.
// The confirmation only appears after an actual drop, so the initial connect
// never flashes a spurious "Reconnected". aria-live is polite and the only
// motion (the lost-state dot pulse) is gated behind motion-safe.
type Phase = "idle" | "lost" | "reconnected";

export function ConnectionBanner({ session }: { session: MPSession }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const lostAtRef = useRef<number | null>(null);

  useEffect(() => {
    const off = session.onConnectionState((state) => {
      if (state === "lost" || state === "reconnecting") {
        setPhase((prev) => {
          if (prev !== "lost") lostAtRef.current = Date.now();
          return "lost";
        });
      } else if (state === "connected") {
        // Only celebrate a reconnect if we had actually dropped; an initial
        // connect leaves the banner idle.
        setPhase((prev) => (prev === "lost" ? "reconnected" : "idle"));
      }
    });
    return off;
  }, [session]);

  // Tick the elapsed-seconds counter while the socket is down.
  useEffect(() => {
    if (phase !== "lost") return;
    const tick = () => {
      const start = lostAtRef.current ?? Date.now();
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Auto-dismiss the "Reconnected" confirmation after three seconds.
  useEffect(() => {
    if (phase !== "reconnected") return;
    const id = window.setTimeout(() => setPhase("idle"), 3000);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "idle") return null;

  const lost = phase === "lost";
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-3"
    >
      <div
        className={
          "plate flex max-w-[92vw] items-center gap-2 px-4 py-2 font-display text-xs font-semibold shadow-plate " +
          (lost
            ? "border-oxblood-glow/60 bg-oxblood/20 text-oxblood-glow"
            : "border-verdigris/60 bg-verdigris/20 text-verdigris-glow")
        }
      >
        <span
          aria-hidden
          className={
            "h-2 w-2 shrink-0 rounded-full " +
            (lost ? "bg-oxblood-glow motion-safe:animate-pulse" : "bg-verdigris-glow")
          }
        />
        {lost ? <span>Connection lost. Reconnecting… {seconds}s</span> : <span>Reconnected</span>}
      </div>
    </div>
  );
}
