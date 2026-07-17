"use client";

// The Open Lobby gate button: the one dungeon-dressed entrance into the
// matchmaking chamber. Full treatment lives in DungeonGateButton.css —
// a molten-gold slab in a forged frame, torchlight, a clipped ember file —
// this component just assembles the flat DOM the stylesheet dresses, and
// picks <Link> vs <button> per call site.
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

// The minor doors burn fewer sparks: same file, half the count.
const EMBERS_MINOR = [EMBERS[1], EMBERS[3]];

function GateDressing({ minor = false }: { minor?: boolean }) {
  return (
    <>
      {(minor ? EMBERS_MINOR : EMBERS).map((e, i) => (
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
  variant = "gate",
  className = "",
  children,
}: {
  /** Renders a Next <Link> when set (and not disabled/loading). */
  href?: string;
  onClick?: () => void;
  /** The gate is unbarring: label pulses, input ignored. */
  loading?: boolean;
  /** Torches out: cold gray stone, no glow, no input. */
  disabled?: boolean;
  /** "gate" is the full-size entrance; "minor" is the same forged-gold
   *  material at postern-door scale, for secondary actions beside it. */
  variant?: "gate" | "minor";
  className?: string;
  children: ReactNode;
}) {
  const minor = variant === "minor";
  const cls = "dgn-gate " + (minor ? "dgn-gate--minor " : "") + className;
  const label = <span className="dgn-gate__label">{children}</span>;

  if (href && !disabled && !loading) {
    return (
      <Link href={href} onClick={onClick} className={cls} data-loading={loading || undefined}>
        <GateDressing minor={minor} />
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
      <GateDressing minor={minor} />
      {label}
    </button>
  );
}
