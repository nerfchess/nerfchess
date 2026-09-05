"use client";

// Real 3D props for the gambling plays: a coin that flips on a hinge and a
// die that tumbles as a cube, both built from CSS faces under `preserve-3d`
// and driven by the outcome the engine already rolled (gamblingOutcome.ts),
// so the coin lands on the face the rules chose. Transform/opacity only.

import type { CSSProperties } from "react";
import "./gambling3d.css";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
};

/** A gold coin that arcs up, spins on its horizontal axis, and lands showing
 *  `face`. Sized by `size` (CSS px); position it with an absolute wrapper. */
export function Coin3D({ face, delayMs = 0, size = 44, style }: { face: "heads" | "tails" | null; delayMs?: number; size?: number; style?: CSSProperties }) {
  // Heads is the front face (0deg); tails is the back (180deg). Whole spins
  // land the chosen face up; an unknown result lands on its edge, then heads.
  const spins = face === "tails" ? 5 : 6; // half turns
  return (
    <span
      className="g3d-coin"
      aria-hidden
      style={{ ...style, width: size, height: size, ["--g3d-delay" as string]: `${delayMs}ms`, ["--g3d-spins" as string]: `${spins * 180}deg` }}
    >
      <span className="g3d-coin__body">
        <span className="g3d-coin__face g3d-coin__face--front">H</span>
        <span className="g3d-coin__face g3d-coin__face--back">T</span>
        <span className="g3d-coin__rim" />
      </span>
      <span className="g3d-coin__shadow" />
    </span>
  );
}

/** A die that tumbles in from one side and settles with `value` on top. */
export function Die3D({ value, delayMs = 0, size = 30, style, tint = "#fdfbf4" }: { value: number | null; delayMs?: number; size?: number; style?: CSSProperties; tint?: string }) {
  // The cube's faces sit at fixed rotations; the final orientation rotates the
  // face carrying `value` to the front (toward the viewer).
  const v = value == null ? 1 : Math.max(1, Math.min(6, value));
  const FINAL: Record<number, string> = {
    1: "rotateX(0deg) rotateY(0deg)",
    2: "rotateX(-90deg) rotateY(0deg)",
    3: "rotateX(0deg) rotateY(-90deg)",
    4: "rotateX(0deg) rotateY(90deg)",
    5: "rotateX(90deg) rotateY(0deg)",
    6: "rotateX(180deg) rotateY(0deg)",
  };
  const faces: { n: number; t: string }[] = [
    { n: 1, t: "rotateY(0deg)" },
    { n: 6, t: "rotateY(180deg)" },
    { n: 3, t: "rotateY(90deg)" },
    { n: 4, t: "rotateY(-90deg)" },
    { n: 2, t: "rotateX(90deg)" },
    { n: 5, t: "rotateX(-90deg)" },
  ];
  const half = size / 2;
  return (
    <span
      className="g3d-die"
      aria-hidden
      style={{ ...style, width: size, height: size, ["--g3d-delay" as string]: `${delayMs}ms`, ["--g3d-final" as string]: FINAL[v], ["--g3d-half" as string]: `${half}px` }}
    >
      <span className="g3d-die__cube">
        {faces.map((f) => (
          <span key={f.n} className="g3d-die__face" style={{ transform: `${f.t} translateZ(${half}px)`, background: tint }}>
            {PIPS[f.n].map(([x, y], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </span>
        ))}
      </span>
      <span className="g3d-die__shadow" />
    </span>
  );
}
