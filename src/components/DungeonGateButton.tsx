"use client";

// The Open Lobby gate button: the one dungeon-dressed entrance into the
// matchmaking chamber. Full treatment lives in DungeonGateButton.css —
// carved granite, iron corner braces, rune lintel, torchlight, a clipped
// ember file — this component just assembles the flat DOM the stylesheet
// dresses, and picks <Link> vs <button> per call site.
//
// The label stays plain text on top of everything (z-3) for contrast; all
// dressing spans are aria-hidden. Ember positions/phases are fixed inline so
// no two sparks climb in step without any per-render randomness.

import Link from "next/link";
import type { ReactNode } from "react";
import "./DungeonGateButton.css";

const EMBERS = [
  { ex: "16%", edelay: "0s" },
  { ex: "38%", edelay: "1.6s" },
  { ex: "63%", edelay: "0.8s" },
  { ex: "84%", edelay: "2.7s" },
];

// The rune carvings flanking the label: real Elder Futhark glyphs, purely
// decorative (aria-hidden), reading as the gate's old inscription.
const RUNES_L = "ᚦᛟᚱ";
const RUNES_R = "ᚷᚨᛏ";

function GateDressing() {
  return (
    <>
      {EMBERS.map((e, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="dgn-gate__ember"
          style={{ "--ex": e.ex, "--edelay": e.edelay } as React.CSSProperties}
        />
      ))}
    </>
  );
}

export function DungeonGateButton({
  href,
  onClick,
  loading = false,
  disabled = false,
  className = "",
  children,
}: {
  /** Renders a Next <Link> when set (and not disabled/loading). */
  href?: string;
  onClick?: () => void;
  /** The gate is unbarring: runes cycle, input ignored. */
  loading?: boolean;
  /** Torches out: cold gray stone, no glow, no input. */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = "dgn-gate " + className;
  const label = (
    <span className="dgn-gate__label">
      {/* Runes render via CSS content so the button's textContent stays the
          plain label (screen readers, copy/paste, and text assertions all see
          only the real text). */}
      <span aria-hidden="true" className="dgn-gate__rune" data-runes={RUNES_L} />
      {children}
      <span
        aria-hidden="true"
        className="dgn-gate__rune dgn-gate__rune--r"
        data-runes={RUNES_R}
      />
    </span>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} onClick={onClick} className={cls} data-loading={loading || undefined}>
        <GateDressing />
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-loading={loading || undefined}
      className={cls}
    >
      <GateDressing />
      {label}
    </button>
  );
}
