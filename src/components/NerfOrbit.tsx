"use client";

import { useMemo } from "react";
import { getNerf } from "@/engine/nerfs/library";
import type { Nerf } from "@/engine/nerf";

// Tier accent colors mirror the .tier-N classes in globals.css.
const TIER_HEX = ["#8a8783", "#7eb59a", "#8ba9c4", "#4a9fee", "#c79468", "#c66860"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];

// A curated spread of drawbacks across every tier — recognizable names and
// real rules so the orbit reads as a genuine sampler of the 150+ constraints.
const RING_IDS = [
  "fog_of_war",
  "shadow_queen",
  "pacman",
  "greedy",
  "scorched_earth",
  "three_check",
  "cowardly",
  "sleepy_king",
];

function Chip({ nerf }: { nerf: Nerf }) {
  const color = TIER_HEX[nerf.tier] ?? TIER_HEX[0];
  return (
    <div className="dc-chip" style={{ ["--chip-accent" as string]: color }} title={nerf.description}>
      <div className="dc-chip-head">
        <span className="dc-chip-dot" style={{ background: color }} />
        <span className="dc-chip-name" style={{ color }}>
          {nerf.name}
        </span>
        <span className="dc-chip-tier">{TIER_ROMAN[nerf.tier]}</span>
      </div>
      <div className="dc-chip-desc">{nerf.description}</div>
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
  const ring = useMemo(
    () => RING_IDS.map(getNerf).filter((n): n is Nerf => Boolean(n)),
    [],
  );

  return (
    // The fixed-size wrapper takes the *scaled* footprint so the 700px orbit
    // box (which CSS scale leaves at full layout size) doesn't overflow or
    // drift off-center on small screens.
    <div className="relative mx-auto w-[300px] h-[300px] sm:w-[448px] sm:h-[448px] lg:w-[560px] lg:h-[560px]">
      <div
        className="dc-orbit absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.43] sm:scale-[0.64] lg:scale-[0.8]"
        style={{ width: 700, height: 700 }}
        aria-hidden
      >
        {/* soft accent aura behind the ring */}
        <div className="absolute inset-16 rounded-full bg-[radial-gradient(circle,rgba(54,146,231,0.10),transparent_60%)]" />
        <Ring nerfs={ring} radius={250} reverse={false} />
        <div className="dc-orbit-hub w-[168px] h-[168px] bg-[radial-gradient(circle,rgba(22,21,18,0.96),rgba(22,21,18,0.55)_66%,transparent)]">
          <div className="text-center">
            <div className="font-display text-5xl font-extrabold text-parchment-100 leading-none">
              150<span className="text-gold-leaf">+</span>
            </div>
            <div className="smallcaps text-[9px] text-parchment-400 mt-2">drawbacks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
