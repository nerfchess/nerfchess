"use client";

import { useMemo } from "react";
import { getNerf } from "@/engine/nerfs/library";
import type { Nerf } from "@/engine/nerf";

// Tier accent colors mirror the .tier-N classes in globals.css.
const TIER_HEX = ["#8e8775", "#7eb59a", "#8ba9c4", "#d8b56e", "#c79468", "#c66860"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];

// A curated spread of drawbacks across every tier — recognizable names so the
// orbit reads as a real sampler of the 150+ rules, not filler.
const OUTER_IDS = [
  "fog_of_war",
  "rising_water",
  "pacman",
  "cowardly",
  "scorched_earth",
  "shadow_queen",
  "three_check",
  "sleepy_king",
  "greedy",
];
const INNER_IDS = ["vegan", "hipster", "truant", "skittish", "simp"];

function Chip({ nerf }: { nerf: Nerf }) {
  const color = TIER_HEX[nerf.tier] ?? TIER_HEX[0];
  return (
    <div className="dc-chip" title={nerf.description}>
      <span className="dc-chip-dot" style={{ background: color }} />
      <span className="dc-chip-name" style={{ color }}>
        {nerf.name}
      </span>
      <span className="dc-chip-tier" style={{ color }}>
        {TIER_ROMAN[nerf.tier]}
      </span>
    </div>
  );
}

function Ring({
  nerfs,
  radius,
  reverse,
}: {
  nerfs: Nerf[];
  radius: number;
  reverse: boolean;
}) {
  const dir = reverse ? "spin-r" : "spin";
  const n = nerfs.length;
  return (
    <div className={`dc-orbit-ring ${dir}`} aria-hidden>
      {nerfs.map((nf, i) => {
        // Place each chip on the circle by computed x/y so it sits upright;
        // the ring orbits it and the counter-spin keeps it from tumbling.
        const theta = ((360 / n) * i - 90) * (Math.PI / 180);
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        return (
          <div
            key={nf.id}
            className="dc-orbit-slot"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className={`dc-orbit-counter ${dir}`}>
              <Chip nerf={nf} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NerfOrbit() {
  const outer = useMemo(
    () => OUTER_IDS.map(getNerf).filter((n): n is Nerf => Boolean(n)),
    [],
  );
  const inner = useMemo(
    () => INNER_IDS.map(getNerf).filter((n): n is Nerf => Boolean(n)),
    [],
  );

  return (
    // The fixed-size wrapper takes the *scaled* footprint so the 600px orbit
    // box (which CSS scale leaves at full layout size) doesn't overflow or
    // drift off-center on small screens.
    <div className="relative mx-auto w-[300px] h-[300px] sm:w-[444px] sm:h-[444px] lg:w-[570px] lg:h-[570px] xl:w-[600px] xl:h-[600px]">
      <div
        className="dc-orbit absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-50 sm:scale-[0.74] lg:scale-95 xl:scale-100"
        style={{ width: 600, height: 600 }}
        aria-hidden
      >
        {/* soft brass aura behind the rings */}
        <div className="absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(216,181,110,0.10),transparent_62%)]" />
        <Ring nerfs={outer} radius={226} reverse={false} />
        <Ring nerfs={inner} radius={138} reverse />
        <div className="dc-orbit-hub w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(17,26,43,0.92),rgba(10,17,30,0.55)_70%,transparent)]">
          <div className="text-center">
            <div className="font-display text-4xl font-extrabold text-parchment leading-none">
              150<span className="text-gold-leaf">+</span>
            </div>
            <div className="smallcaps text-[9px] text-parchment-400 mt-1">secret rules</div>
          </div>
        </div>
      </div>
    </div>
  );
}
