// ClockRaidLayer: the out-of-board spectacle for clock-touching cards.
//
// Consumes the engine's clock-fx events (game.fx) and physically raids the
// on-screen clocks: a themed grabber reaches the victim's [data-clock-seat]
// pill, the pill shudders inside a proxy frame, a packet of digits arcs
// across the screen into the caster's pill, which pops gold, and signed
// delta chips rise beside both. Fixed-position portal so the raid crosses
// the whole page (the sanctioned board escape). Purely cosmetic: displayed
// clock values always come from the authoritative clock frames.
//
// Skins resolve from the REQUEST SHAPE, so all eleven clock cards (and any
// future one) get a fitting raid without an id table: a steal runs the full
// grab-and-carry; a pure drain skips the carry and burns the victim pill; a
// pure gift skips the victim entirely and pops the caster. Time Thief keeps
// its signature hand.
//
// Hygiene: consumes each fx array once by reference, seeds silently on the
// first observation (rebuilds never replay), removes items on animationend
// with a timeout backstop, clears every timer on unmount.

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { ClockRequest } from "@/engine/buff";
import type { FxEvent } from "@/engine/fxEvents";
import type { Color } from "@/engine/types";
import { useFxHidden } from "@/lib/fxToggle";
import "./clockraid.css";

type RaidKind = "steal" | "drain" | "gift";

interface Raid {
  uid: number;
  kind: RaidKind;
  skin: "hand" | "siphon" | "buzzer";
  /** Victim pill rect (absent for pure gifts). */
  from: DOMRect | null;
  /** Caster pill rect. */
  to: DOMRect | null;
  lossLabel: string | null;
  gainLabel: string | null;
}

const CLEANUP_MS = 4200;
const MAX_RAIDS = 3;

function requestKind(r: ClockRequest): RaidKind {
  const steals = (r.stealFractionOfOpp ?? 0) > 0 || (r.stealFlatSec ?? 0) > 0;
  if (steals) return "steal";
  if ((r.subOppSec ?? 0) > 0) return "drain";
  return "gift";
}

/** Signed second labels. Fractional steals have no exact client-side number
 * (the server resolves them against the live clock), so they show no digits
 * and let the pill's own authoritative change carry the amount. */
function labels(r: ClockRequest, kind: RaidKind): { loss: string | null; gain: string | null } {
  if (kind === "drain") return { loss: `-${r.subOppSec}s`, gain: r.addSelfSec ? `+${r.addSelfSec}s` : null };
  if (kind === "gift") return { loss: null, gain: r.addSelfSec ? `+${r.addSelfSec}s` : null };
  const flat = r.stealFlatSec ?? 0;
  const exact = flat > 0 && !r.stealFractionOfOpp;
  return { loss: exact ? `-${flat}s` : null, gain: exact ? `+${flat}s` : null };
}

/** The visible pill for a seat: mobile and desktop copies share the seat
 * attribute, so pick the one actually laid out. */
function seatRect(seat: Color): DOMRect | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-clock-seat="${seat}"]`);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

/** Simple themed grabber glyphs, inline SVG (no external assets). */
function GrabGlyph({ skin }: { skin: Raid["skin"] }) {
  if (skin === "siphon") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <path d="M6 4h6v7a5 5 0 1 1-6 0V4Z" stroke="rgba(247,241,227,0.9)" strokeWidth="1.6" />
        <path d="M12 6h7M19 6v5" stroke="rgba(224,82,82,0.9)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (skin === "buzzer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle cx="12" cy="13" r="7" stroke="rgba(247,241,227,0.9)" strokeWidth="1.6" />
        <path d="M12 13V9M5 6 3 4m16 2 2-2" stroke="rgba(224,82,82,0.9)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  // The Time Thief hand.
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
      <path
        d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4.6 14a1.6 1.6 0 0 1 2.4-2l0 0"
        stroke="rgba(247,241,227,0.92)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockRaidLayer({ fx }: { fx?: FxEvent[] | null }) {
  const fxHidden = useFxHidden();
  const uidRef = React.useRef(0);
  const [raids, setRaids] = React.useState<Raid[]>([]);
  const timersRef = React.useRef(new Map<number, number>());
  const [mounted, setMounted] = React.useState(false);
  // Deferred like PassiveLayer's queue appends: the lint (correctly) rejects
  // synchronous setState inside an effect body.
  React.useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const remove = React.useCallback((uid: number) => {
    const t = timersRef.current.get(uid);
    if (t !== undefined) {
      window.clearTimeout(t);
      timersRef.current.delete(uid);
    }
    setRaids((cur) => cur.filter((r) => r.uid !== uid));
  }, []);

  const lastFxRef = React.useRef<FxEvent[] | null | undefined>(undefined);
  React.useEffect(() => {
    const prev = lastFxRef.current;
    lastFxRef.current = fx;
    if (prev === undefined) return; // seed silently: rebuilds never replay
    if (!fx || fx === prev || fxHidden) return;
    const fresh: Raid[] = [];
    for (const ev of fx) {
      if (ev.kind !== "clock-fx") continue;
      const kind = requestKind(ev.request);
      const caster = ev.caster;
      const victim: Color = caster === "w" ? "b" : "w";
      const { loss, gain } = labels(ev.request, kind);
      fresh.push({
        uid: ++uidRef.current,
        kind,
        skin:
          ev.sourceCardId === "time_thief"
            ? "hand"
            : kind === "drain"
              ? "buzzer"
              : kind === "steal"
                ? "siphon"
                : "hand",
        from: kind === "gift" ? null : seatRect(victim),
        to: seatRect(caster),
        lossLabel: loss,
        gainLabel: gain,
      });
      if (fresh.length >= MAX_RAIDS) break;
    }
    if (fresh.length === 0) return;
    for (const r of fresh) {
      timersRef.current.set(
        r.uid,
        window.setTimeout(() => remove(r.uid), CLEANUP_MS),
      );
    }
    queueMicrotask(() => setRaids((cur) => [...cur, ...fresh].slice(-MAX_RAIDS)));
  }, [fx, fxHidden, remove]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  if (!mounted || fxHidden || raids.length === 0) return null;

  return createPortal(
    <div className="craid-root" aria-hidden data-clock-raid>
      {raids.map((raid) => {
        const from = raid.from;
        const to = raid.to;
        const fromC = from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : null;
        const toC = to ? { x: to.left + to.width / 2, y: to.top + to.height / 2 } : null;
        return (
          <React.Fragment key={raid.uid}>
            {/* Grabber + shudder over the victim pill. */}
            {from && fromC && (
              <>
                <span className="craid-grab" style={{ left: fromC.x, top: from.top - 8 }}>
                  <GrabGlyph skin={raid.skin} />
                </span>
                <span
                  className="craid-shudder"
                  style={{ left: from.left - 3, top: from.top - 3, width: from.width + 6, height: from.height + 6 }}
                />
                {raid.lossLabel && (
                  <span className="craid-delta craid-delta--loss" style={{ left: fromC.x, top: from.top - 26 }}>
                    {raid.lossLabel}
                  </span>
                )}
              </>
            )}
            {/* The carried packet, victim -> caster (steals only). */}
            {raid.kind === "steal" && fromC && toC && (
              <span
                className="craid-packet"
                style={
                  {
                    left: fromC.x,
                    top: fromC.y,
                    "--raid-dx": `${toC.x - fromC.x}px`,
                    "--raid-dy": `${toC.y - fromC.y}px`,
                  } as React.CSSProperties
                }
              >
                <span className="craid-packet-lift">
                  <span className="craid-digits">0:00</span>
                </span>
              </span>
            )}
            {/* Caster pill pop + gain chip. The pop is the LAST-ending piece,
                so its end event retires the whole raid (timeout backstops). */}
            {to && toC && (
              <>
                <span
                  className="craid-pop"
                  style={{ left: to.left - 3, top: to.top - 3, width: to.width + 6, height: to.height + 6 }}
                  onAnimationEnd={() => remove(raid.uid)}
                />
                {raid.gainLabel && (
                  <span className="craid-delta craid-delta--gain" style={{ left: toC.x, top: to.top - 26 }}>
                    {raid.gainLabel}
                  </span>
                )}
              </>
            )}
            {/* No measurable pills (compact layouts mid-transition): nothing
                renders and the timeout quietly retires the raid. */}
          </React.Fragment>
        );
      })}
    </div>,
    document.body,
  );
}

export default ClockRaidLayer;
