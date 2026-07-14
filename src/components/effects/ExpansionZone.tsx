"use client";

// Expansion Permit (9x9) construction ring: while either side's permit is
// live, the board visually "grows" a ninth file on the right and a ninth
// rank on top — an under-construction strip OUTSIDE the crop (the mascot's
// mount area): faint tiles, dashed caution-stripe borders, scaffold lines,
// a couple of drifting dust/sparkle motes, and a small crane silhouette in
// the new corner. Pure decoration: the actual mechanic (horizontal cylinder
// wrap for rooks/queens) is real moves, so its destinations already show up
// as normal legal-move dots. pointer-events-none, hidden on small screens,
// gated by the fx-hidden switch at the mount site, static when animations are
// off in Settings (motes hide, tiles stay).

import React from "react";
import "./expansionZone.css";

function CraneSilhouette() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      {/* mast, jib, counter-jib, tie bars, hook and a dangling tile */}
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M14 44V12" />
        <path d="M6 14h34" />
        <path d="M14 4v8M14 4l26 10M14 4L6 14" />
        <path d="M34 14v12" />
      </g>
      <g fill="currentColor">
        <rect x="10" y="42" width="8" height="3" />
        <path d="M34 26l-2 3h4l-2-3Z" />
        <rect x="30" y="29" width="8" height="6" opacity="0.85" />
      </g>
    </svg>
  );
}

function Strip({ edge }: { edge: "right" | "top" | "corner" }) {
  const pos =
    edge === "right"
      ? "inset-y-2 sm:inset-y-3 right-2 sm:right-3 w-[12.5%] translate-x-full xz-strip-right"
      : edge === "top"
        ? "inset-x-2 sm:inset-x-3 top-2 sm:top-3 h-[12.5%] -translate-y-full xz-strip-top"
        : "top-2 sm:top-3 right-2 sm:right-3 h-[12.5%] w-[12.5%] translate-x-full -translate-y-full xz-strip-corner";
  return (
    <div aria-hidden="true" className={"xz-strip pointer-events-none absolute hidden sm:block " + pos}>
      <div className="xz-tiles absolute inset-0" />
      <div className="xz-scaffold absolute inset-0" />
      <div className="xz-caution absolute inset-0" />
      {edge !== "corner" && (
        <>
          <span className="xz-mote xz-mote-a" />
          <span className="xz-mote xz-mote-b" />
        </>
      )}
      {edge === "corner" && (
        <div className="xz-crane absolute inset-[8%]">
          <CraneSilhouette />
        </div>
      )}
    </div>
  );
}

export function ExpansionZone() {
  return (
    <>
      <Strip edge="right" />
      <Strip edge="top" />
      <Strip edge="corner" />
    </>
  );
}
