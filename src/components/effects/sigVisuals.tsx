"use client";

// Signature play visuals — the LAZY half of BoardEffects.tsx (code split; see
// the prefetchSignatureVisuals note there). Everything here is render-only
// art for SignatureOverlay's SigVisual switch: the burst components plus the
// switch itself (default-exported as SignatureVisual). No game logic lives
// here — configs (SIGNATURES / PLUGIN_SIGNATURES) stay in the eager modules,
// so a late chunk can only ever delay art, never sounds/ordering/zones.
// Styles: effects.css + godPlays.css are also imported by the eager
// BoardEffects, but import them here too so the classes provably travel with
// the art (global CSS imports dedupe).

import React from "react";
import {
  BrainrotFigure,
  BURST_BIG,
  BURST_MED,
  FlameLicks,
  ShardBurst,
  SigShard,
  type SigVisual,
  SparkStar,
} from "./BoardEffects";
// Plug-in signature visuals (`x:<key>`): the merged plugin registry rides in
// this same lazy chunk (sigPluginsMerged.tsx pulls all six plugin modules and
// publishes their configs into the eager sigPlugins registry as a side
// effect of loading).
import { renderPluginVisual } from "./sigPluginsMerged";
import "./effects.css";
import "./godPlays.css";

/** A jagged lightning bolt that fills its wrapper (BoltGlyph is fixed-size). */
function JagBolt() {
  return (
    <svg viewBox="0 0 24 40" className="h-full w-full" aria-hidden="true">
      <polygon
        points="14,0 5,20 11,20 8,40 20,16 13,16"
        fill="#fff6c8"
        stroke="#e6b800"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STONE_SHARDS = [
  { left: "28%", top: "22%", w: "20%", c: "#9a9a9f", d: 0 },
  { left: "56%", top: "28%", w: "16%", c: "#7f7f85", d: 40 },
  { left: "36%", top: "48%", w: "22%", c: "#8c8c92", d: 70 },
  { left: "22%", top: "38%", w: "14%", c: "#71717a", d: 30 },
  { left: "62%", top: "52%", w: "15%", c: "#86868c", d: 55 },
  { left: "44%", top: "18%", w: "12%", c: "#6b6b73", d: 22 },
];

const PIN_STARS = [
  { dx: "300%", dy: "-210%", rot: "230deg", delay: 0 },
  { dx: "-280%", dy: "-170%", rot: "-220deg", delay: 14 },
  { dx: "260%", dy: "180%", rot: "270deg", delay: 8 },
  { dx: "-250%", dy: "210%", rot: "-190deg", delay: 22 },
  { dx: "20%", dy: "-320%", rot: "120deg", delay: 5 },
];

const NOVA_STARS = [
  { dx: "260%", dy: "-200%", rot: "160deg", d: 0 },
  { dx: "-240%", dy: "-170%", rot: "-150deg", d: 20 },
  { dx: "280%", dy: "150%", rot: "200deg", d: 40 },
  { dx: "-260%", dy: "180%", rot: "-190deg", d: 10 },
  { dx: "40%", dy: "-300%", rot: "120deg", d: 30 },
];
function NovaBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE SUPERNOVA: the pawn's star swells at the board's
  // heart, detonates a blinding column straight up its file, throws a corona
  // of star shards, and rolls a single white shockwave past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,255,255,0.26)" delayMs={delayMs} />
        {/* the light column, blown straight up the file */}
        <span
          className="fx-sig-shaft absolute left-[45%] top-[6%] block h-[60%] w-[10%]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(255,255,255,0.9) 35%, rgba(255,214,106,0.8))",
            animationDelay: `${delayMs + 160}ms`,
          }}
        />
        {/* the swelling star core */}
        <span
          className="fx-sig-flash absolute left-[41%] top-[40%] block h-[16%] w-[18%] rounded-full"
          style={{
            background: "radial-gradient(circle, #ffffff, rgba(255,214,106,0.6) 55%, transparent 75%)",
            animationDelay: `${delayMs + 340}ms`,
          }}
        />
        {/* the corona of star shards */}
        {NOVA_STARS.map((v, i) => (
          <span
            key={i}
            className="fx-sig-star absolute left-[47%] top-[45%] block h-[6%] w-[6%]"
            style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 420 + v.d}ms` } as React.CSSProperties}
          >
            <SparkStar />
          </span>
        ))}
        <BoardBoom delayMs={delayMs + 480} color="rgba(255,255,255,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[24%] block rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95), rgba(220,235,255,0.4) 60%, transparent 72%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-ring absolute inset-[16%] block rounded-full"
        style={{ border: "1px solid rgba(233,244,255,0.95)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(120,120,130,0.6), transparent 70%)",
          animationDelay: `${delayMs + 90}ms`,
        }}
      />
    </span>
  );
}

function TrapdoorBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead square drops the WHOLE
  // floor — a dark board-wide dim while pit-mouths yawn open across the crop
  // and a pale dust cloud kicks up.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(20,12,6,0.35)" delayMs={delayMs} />
        {[
          { l: "28%", t: "32%", w: "12%", d: 0 },
          { l: "52%", t: "42%", w: "14%", d: 120 },
          { l: "36%", t: "58%", w: "11%", d: 240 },
          { l: "60%", t: "26%", w: "10%", d: 320 },
          { l: "44%", t: "30%", w: "9%", d: 180 },
        ].map((h, i) => (
          <span
            key={i}
            className="fx-sig-hole absolute block rounded-[2px]"
            style={{ left: h.l, top: h.t, width: h.w, height: `calc(${h.w} * 0.7)`, background: "rgba(10,8,6,0.85)", border: "1px solid #2a1a0d", animationDelay: `${delayMs + h.d}ms` }}
          />
        ))}
        <span
          className="fx-sig-ash absolute left-[38%] top-[40%] block h-[20%] w-[24%] rounded-full"
          style={{ background: "rgba(196,178,142,0.45)", animationDelay: `${delayMs + 280}ms` }}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-hole absolute inset-[26%] block rounded-[1px]"
        style={{ background: "rgba(10,8,6,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flap-l absolute left-[20%] top-[24%] block h-[52%] w-[30%] rounded-[1px]"
        style={{ background: "#5a3d22", border: "1px solid #2a1a0d", transformOrigin: "left center", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flap-r absolute right-[20%] top-[24%] block h-[52%] w-[30%] rounded-[1px]"
        style={{ background: "#5a3d22", border: "1px solid #2a1a0d", transformOrigin: "right center", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[22%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(196,178,142,0.7), transparent 70%)",
          animationDelay: `${delayMs + 70}ms`,
        }}
      />
    </span>
  );
}

function StoneBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — EXTINCTION AS AN EVENT: the crop greys out, ash-light
  // blazes up out of the ground and a colossal horned extinction-idol rises
  // over the board while stone chips rain the central band; twin dust
  // shockwaves roll past the edges.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(120,116,110,0.3)"
        rays="rgba(154,143,138,0.7)"
        boom="rgba(150,150,155,0.85)"
        flare="rgba(178,170,160,0.75)"
        sparkFill="#9a8f8a"
        sparkStroke="#2b2320"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* horned ashen idol: the extinction god looms up out of the dust */}
            <path d="M6 10 C3 6 3 3 5 1 C9 4 10 7 10 10 Z" fill="rgba(120,116,110,0.9)" stroke="#4a4a44" strokeWidth="1" strokeLinejoin="round" />
            <path d="M34 10 C37 6 37 3 35 1 C31 4 30 7 30 10 Z" fill="rgba(120,116,110,0.9)" stroke="#4a4a44" strokeWidth="1" strokeLinejoin="round" />
            <path d="M12 44 V30 C8 28 7 22 9 15 C11 9 15 6 20 6 C25 6 29 9 31 15 C33 22 32 28 28 30 V44 Z" fill="rgba(150,150,155,0.88)" stroke="#4a4a44" strokeWidth="1.2" strokeLinejoin="round" />
            {/* hollow eyes + cracked jaw seams */}
            <path d="M14.5 16 L18 17.5 M25.5 16 L22 17.5" stroke="#e6432c" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M14 24 H26 M17 28 L20 25 L23 28" stroke="rgba(74,74,68,0.85)" strokeWidth="0.9" fill="none" />
          </svg>
        }
      >
        <BoardRain
          delayMs={delayMs + 100}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <polygon points="6,0 11,3 10,9 4,11 1,6 2,2" fill="rgba(150,150,155,0.9)" stroke="#4a4a44" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[18%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(150,150,155,0.85), transparent 72%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {STONE_SHARDS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <span
        className="fx-sig-ash absolute inset-x-[26%] bottom-[18%] block h-[16%] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(120,116,110,0.6), transparent 70%)",
          animationDelay: `${delayMs + 130}ms`,
        }}
      />
    </span>
  );
}

function StrikeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead whites the sky over the
  // whole crop while three colossal bolts crack down the central band and a
  // shock ring rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(210,225,255,0.3)" delayMs={delayMs} />
        {[
          { l: "32%", d: 0 },
          { l: "48%", d: 140 },
          { l: "62%", d: 260 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-bolt absolute top-[4%] block h-[52%] w-[8%]" style={{ left: b.l, animationDelay: `${delayMs + b.d}ms` }}>
            <JagBolt />
          </span>
        ))}
        <BoardBoom delayMs={delayMs + 320} color="rgba(230,240,255,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-reticle absolute inset-[16%] block rounded-full"
        style={{ border: "1.5px solid rgba(210,225,255,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-bolt absolute left-1/2 top-[1%] ml-[-16%] block h-[66%] w-[32%]" style={{ animationDelay: `${delayMs + 175}ms` }}>
        <JagBolt />
      </span>
      <span
        className="fx-sig-scorch absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(24,18,12,0.75), transparent 72%)",
          animationDelay: `${delayMs + 200}ms`,
        }}
      />
    </span>
  );
}

function AtomicBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // Ground zero: a white-out flash, a climbing mushroom fireball on a hot
    // stem, twin shockwaves blown past the square, and flame licks thrown
    // clear — the fiery storm the name promises. Overflows its square on
    // purpose (pointer-events-none, purely decorative).
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span
          className="fx-sig-flash absolute inset-[-32%] block rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.98), rgba(255,180,90,0.6) 46%, transparent 72%)",
            animationDelay: `${delayMs}ms`,
          }}
        />
        {/* The stem: a hot column rising out of the square. */}
        <span
          className="fx-fire-stem absolute bottom-[8%] left-[34%] block h-[95%] w-[32%]"
          style={{
            background: "linear-gradient(180deg, rgba(255,157,61,0.9), rgba(230,67,44,0.75) 55%, rgba(58,28,18,0.4))",
            animationDelay: `${delayMs + 60}ms`,
          }}
        />
        {/* The cap: the mushroom fireball swelling as it climbs. */}
        <span
          className="fx-fireball absolute inset-[-10%] bottom-auto block h-[80%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 68%, rgba(255,240,200,0.98), rgba(255,157,61,0.9) 40%, rgba(230,67,44,0.75) 66%, rgba(40,20,14,0.5) 88%, transparent 100%)",
            animationDelay: `${delayMs + 60}ms`,
          }}
        />
        <span
          className="fx-sig-shock absolute inset-[-30%] block rounded-full"
          style={{ border: "3px solid rgba(255,157,61,0.95)", animationDelay: `${delayMs + 40}ms` }}
        />
        <span
          className="fx-sig-shock absolute inset-[-20%] block rounded-full"
          style={{ border: "2px solid rgba(255,209,102,0.9)", animationDelay: `${delayMs + 150}ms` }}
        />
        <span
          className="fx-sig-soot absolute inset-[2%] block rounded-full"
          style={{ border: "3px solid rgba(30,24,20,0.7)", animationDelay: `${delayMs + 120}ms` }}
        />
        <FlameLicks delayMs={delayMs + 80} sizePct={20} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,210,140,0.95), rgba(230,67,44,0.5) 60%, transparent 76%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-fireball absolute inset-[20%] block rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 62%, rgba(255,240,200,0.92), rgba(255,157,61,0.8) 46%, rgba(230,67,44,0.6) 72%, transparent 100%)",
          animationDelay: `${delayMs + 40}ms`,
        }}
      />
      <span
        className="fx-sig-shock absolute inset-[12%] block rounded-full"
        style={{ border: "2px solid rgba(255,157,61,0.9)", animationDelay: `${delayMs + 60}ms` }}
      />
      <span
        className="fx-sig-soot absolute inset-[22%] block rounded-full"
        style={{ border: "2px solid rgba(30,24,20,0.6)", animationDelay: `${delayMs + 100}ms` }}
      />
      <FlameLicks delayMs={delayMs + 60} sizePct={13} />
    </span>
  );
}

function PinBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE QUEEN MADE MANIFEST: gold god-rays split the sky and a
  // colossal war-queen descends over the board, greatsword swept low, before
  // her touchdown flare and twin gilded shockwaves rake past the edges.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(230,191,106,0.24)"
        rays="rgba(255,214,120,0.85)"
        boom="rgba(230,191,106,0.9)"
        flare="rgba(255,232,150,0.8)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* colossal war-queen: crown, gown, and a low-swept greatsword */}
            <path d="M13 10 L14 4 L17 7.5 L20 3 L23 7.5 L26 4 L27 10 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="20" cy="13.5" r="3.2" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M20 17 C16 17 14.5 20 14 24 L10 42 H30 L26 24 C25.5 20 24 17 20 17 Z" fill="rgba(214,35,79,0.85)" stroke="#5a1512" strokeWidth="1" strokeLinejoin="round" />
            {/* the rampage blade, swung across the whole board line */}
            <path d="M2 34 L15 27 L16.5 29.5 L4 37 Z" fill="#e3ecf4" stroke="#5b6672" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M15 26 L18 31" stroke="#7a5b23" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M17 24 V40 M23 24 V40" stroke="rgba(90,21,18,0.5)" strokeWidth="0.7" fill="none" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-spin absolute inset-[28%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(230,191,106,0.5), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {PIN_STARS.map((v, i) => (
        <span
          key={i}
          className="fx-sig-star absolute left-1/2 top-1/2 ml-[-6%] mt-[-6%] block h-[12%] w-[12%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}
        >
          <SparkStar />
        </span>
      ))}
    </span>
  );
}

function SiegeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the cannon's muzzle flash now lances
  // across the WHOLE crop — a powder wash while the blast tongue streaks the
  // board's full width and a concussion ring rolls past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,244,200,0.22)" delayMs={delayMs} />
        <span
          className="fx-sig-muzzle absolute left-[22%] top-[44%] block h-[12%] w-[56%] rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(255,244,200,0.95), rgba(255,170,70,0.5) 60%, transparent)",
            animationDelay: `${delayMs}ms`,
          }}
        />
        <BoardBoom delayMs={delayMs + 220} color="rgba(255,170,70,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-splat absolute inset-x-[12%] top-[36%] block h-[28%] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(150,146,140,0.85), transparent 72%)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ash absolute inset-[26%] block rounded-full"
        style={{ background: "radial-gradient(circle, rgba(120,116,110,0.55), transparent 70%)", animationDelay: `${delayMs + 60}ms` }}
      />
    </span>
  );
}

// --- 10b. Batch 2 signature visuals (effect-data sourced) --------------------
// Each is one square's slice of a Batch 2 spectacle: a keyed one-shot mounted
// only on an affected square, transform/opacity only, hidden under reduced
// motion (see effects.css). All decorate pieces that STAY on the board, so
// Board feeds them squares from an fx zone rather than the removal diff (see
// the SIGNATURES note). A shared crown glyph backs the coronation family.

/** The jeweled crown that descends in the coronation / regalia spectacles. */
function SigCrown() {
  return (
    <svg viewBox="0 0 24 14" className="h-full w-full" aria-hidden="true">
      <path
        d="M2 12 L2 4.5 L7 8 L12 1.5 L17 8 L22 4.5 L22 12 Z"
        fill="#e6bf6a"
        stroke="#7a5b23"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="10.5" r="0.9" fill="#7a5b23" />
      <circle cx="12" cy="10.5" r="0.9" fill="#7a5b23" />
      <circle cx="17" cy="10.5" r="0.9" fill="#7a5b23" />
    </svg>
  );
}

/** Amazon Knight / God Knight: a shaft of light drops, a crown lowers onto the
 * piece, and a coronation flash blooms (lead). */
function CoronationBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE CORONATION: one great shaft of light parts the sky
  // and a COLOSSAL jeweled crown descends onto the board's heart, gold stars
  // fanning off the touchdown before a single gilded shockwave rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,244,200,0.26)" delayMs={delayMs} />
        {/* the anointing shaft */}
        <span
          className="fx-sig-shaft absolute left-[42%] top-[4%] block h-[52%] w-[16%]"
          style={{
            background: "linear-gradient(180deg, rgba(255,244,200,0.9), rgba(255,220,130,0.25) 70%, transparent)",
            animationDelay: `${delayMs + 100}ms`,
          }}
        />
        {/* the colossal crown, lowering in */}
        <span className="fx-sig-crown absolute left-[38%] top-[30%] block h-[16%] w-[24%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
          <SigCrown />
        </span>
        {/* gold stars off the touchdown */}
        {[
          { dx: "240%", dy: "-160%", rot: "160deg", d: 0 },
          { dx: "-220%", dy: "-140%", rot: "-150deg", d: 25 },
          { dx: "200%", dy: "140%", rot: "200deg", d: 50 },
          { dx: "-240%", dy: "120%", rot: "-190deg", d: 12 },
        ].map((v, i) => (
          <span
            key={i}
            className="fx-sig-star absolute left-[47%] top-[42%] block h-[5.5%] w-[5.5%]"
            style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 700 + v.d}ms` } as React.CSSProperties}
          >
            <SparkStar />
          </span>
        ))}
        <span
          className="fx-sig-flash absolute left-[43%] top-[42%] block h-[10%] w-[14%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,244,200,0.9), transparent 70%)", animationDelay: `${delayMs + 680}ms` }}
        />
        <BoardBoom delayMs={delayMs + 760} color="rgba(255,220,130,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[38%] top-0 block h-[72%] w-[24%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,244,200,0.85), rgba(255,220,130,0.15) 70%, transparent)",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-crown absolute left-[27%] top-[8%] block h-[30%] w-[46%]"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <SigCrown />
      </span>
    </span>
  );
}

const CROWN_RAIN = [
  { left: "14%", w: "30%", d: 0 },
  { left: "50%", w: "26%", d: 90 },
  { left: "32%", w: "34%", d: 180 },
];

/** Double / Triple Amazon, Amazon Army: crowns rain down onto the piece. */
function CrownRainBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE CORONATRIX: gold god-rays break the sky and a colossal
  // Amazon war-goddess descends, spear planted, while crowns rain the whole
  // central band; her touchdown throws sparks and twin gilded shockwaves.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(230,191,106,0.22)"
        rays="rgba(255,231,150,0.85)"
        boom="rgba(230,191,106,0.85)"
        flare="rgba(255,236,178,0.8)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* Amazon war-goddess: plumed crown, breastplate, planted spear */}
            <path d="M14 9 L15 3.5 L18 6.5 L20 2.5 L22 6.5 L25 3.5 L26 9 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="20" cy="12.5" r="3.1" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M20 16 C16.5 16 15 18.5 14.5 22 L11 42 H29 L25.5 22 C25 18.5 23.5 16 20 16 Z" fill="rgba(168,119,216,0.85)" stroke="#4a2a6e" strokeWidth="1" strokeLinejoin="round" />
            <path d="M15 23 H25 M16 27 H24" stroke="rgba(74,42,110,0.6)" strokeWidth="0.8" fill="none" />
            {/* the planted spear */}
            <path d="M32 42 V10" stroke="#8a6a3a" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M32 9 L29.5 13 H34.5 Z" fill="#e3ecf4" stroke="#5b6672" strokeWidth="0.7" strokeLinejoin="round" />
          </svg>
        }
      >
        <BoardRain delayMs={delayMs + 80} render={() => <SigCrown />} />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {CROWN_RAIN.map((c, i) => (
        <span
          key={i}
          className="fx-sig-crownfall absolute top-0 block h-[26%]"
          style={{ left: c.left, width: c.w, animationDelay: `${delayMs + c.d}ms` }}
        >
          <SigCrown />
        </span>
      ))}
    </span>
  );
}

/** Colossus / Titan: a stone shell grows over the piece and it stomps a ring
 * (lead). */
function ColossusBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — TITANOGENESIS: dust-light blazes up from the ground and
    // the colossal stone figure heaves out of the board, shoulders past the
    // crop line, its footfall flaring and thumping twin shockwaves outward.
    return (
      <GodEvent
        wash="rgba(150,150,158,0.24)"
        rays="rgba(200,200,208,0.7)"
        boom="rgba(120,120,128,0.85)"
        flare="rgba(216,168,90,0.7)"
        sparkFill="#d8a85a"
        sparkStroke="#4c4c53"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* colossus silhouette: head, massive shoulders, planted arms */}
            <path
              d="M14 44 V30 C10 29 7 26 7 21 L2 22 L7 17 C8 11 12 7 17 6 C16 3 18 1 20 1 C22 1 24 3 23 6 C28 7 32 11 33 17 L38 22 L33 21 C33 26 30 29 26 30 V44 Z"
              fill="rgba(120,120,128,0.85)"
              stroke="#4c4c53"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* stone seams + eyes */}
            <path d="M13 20 H27 M15 26 H25" stroke="rgba(76,76,83,0.8)" strokeWidth="0.8" fill="none" />
            <path d="M16.5 13 H19 M21 13 H23.5" stroke="#e6bf6a" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-grow absolute inset-[16%] block rounded-full"
        style={{
          border: "2px solid rgba(150,150,158,0.85)",
          background: "radial-gradient(circle, rgba(120,120,128,0.28), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
    </span>
  );
}

/** Time Skip: a SNOOZE button slams down over the king (lead) and a Z drifts
 * up. */
function SnoozeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span
          className="fx-sig-snooze absolute left-[16%] top-[32%] block h-[34%] w-[68%] rounded-[1px]"
          style={{
            background: "rgba(60,72,92,0.92)",
            border: "1px solid rgba(190,205,225,0.8)",
            animationDelay: `${delayMs}ms`,
          }}
        >
          <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden="true">
            <path d="M12 6 h9 l-9 8 h9" fill="none" stroke="#e8eef6" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M23 8 h5 l-5 5 h5" fill="none" stroke="#e8eef6" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span
        className="fx-sig-zzz absolute left-[54%] top-[4%] block h-[34%] w-[34%]"
        style={{ animationDelay: `${delayMs + 160}ms` }}
      >
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 5 h9 l-9 9 h9" fill="none" stroke="#cdd8e6" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Time Prison: iron clock-hand bars drop into a cage around the king, a clock
 * face stamped on the front (lead). */
function ClockCageBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE WARDEN OF HOURS: cold steel-light splits the sky and
    // a colossal clock-faced prison cage is lowered over the board by the time
    // god's chains; it slams home with a flare and twin iron shockwaves.
    return (
      <GodEvent
        wash="rgba(20,30,43,0.28)"
        rays="rgba(185,196,214,0.7)"
        boom="rgba(185,196,214,0.85)"
        flare="rgba(205,216,230,0.7)"
        sparkFill="#b9c4d6"
        sparkStroke="#3a4556"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 36 44" className="h-full w-full" aria-hidden="true">
            {/* hoisting chains */}
            <path d="M10 0 L12 8 M26 0 L24 8" stroke="#8a97ab" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 1.6" />
            {/* the colossal cage */}
            <g stroke="#b9c4d6" strokeWidth="2" strokeLinecap="round">
              <path d="M8 9 V41 M14 9 V41 M22 9 V41 M28 9 V41" />
            </g>
            <g stroke="#8a97ab" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 10 H30 M6 40 H30" />
            </g>
            {/* the clock face bolted to its front, hands stopped */}
            <circle cx="18" cy="24" r="6.5" fill="rgba(20,30,43,0.85)" stroke="#b9c4d6" strokeWidth="1.4" />
            <path d="M18 24 L18 19.5 M18 24 L21.5 26" stroke="#e6bf6a" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-cage absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#b9c4d6" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3 V29 M13 3 V29 M19 3 V29 M26 3 V29" />
          </g>
          <g stroke="#8a97ab" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 4 H28 M4 28 H28" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Time Freeze: a frost-rimmed clock crashes down and entombs the king in an
 * ice block, its face cracked (lead). */
function ClockIceBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE GLACIAL HOROLOGE: pale rays split the sky and a
    // colossal cracked clock, already entombed in a berg of ice, is lowered
    // onto the board; it lands in a frost flare and twin rime shockwaves.
    return (
      <GodEvent
        wash="rgba(200,235,255,0.26)"
        rays="rgba(223,242,255,0.8)"
        boom="rgba(223,242,255,0.85)"
        flare="rgba(235,250,255,0.75)"
        sparkFill="#bfe6ff"
        sparkStroke="#3f6f9f"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 36 44" className="h-full w-full" aria-hidden="true">
            {/* the ice block, faceted */}
            <path d="M6 14 L18 4 L30 13 L32 32 L20 42 L5 34 Z" fill="rgba(200,235,255,0.45)" stroke="rgba(220,245,255,0.85)" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M6 14 L20 20 L32 32 M20 20 L20 42 M18 4 L20 20" fill="none" stroke="rgba(235,250,255,0.6)" strokeWidth="0.8" />
            {/* the entombed clock, its face split */}
            <circle cx="19" cy="23" r="7.5" fill="rgba(20,30,43,0.7)" stroke="#bfe6ff" strokeWidth="1.4" />
            <path d="M19 23 L19 17.5 M19 23 L23 25.5" stroke="#e6bf6a" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M14 18 L19 23 L16 28" fill="none" stroke="rgba(235,250,255,0.9)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[14%] block rounded-[1px]"
        style={{
          background: "linear-gradient(135deg, rgba(200,235,255,0.45), rgba(150,205,240,0.32))",
          border: "1px solid rgba(220,245,255,0.8)",
          animationDelay: `${delayMs}ms`,
        }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path d="M8 4 L14 14 L9 20 L16 30" fill="none" stroke="rgba(235,250,255,0.75)" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

const BLITZ_IMGS = [
  { left: "18%", d: 0 },
  { left: "36%", d: 55 },
  { left: "50%", d: 110 },
  { left: "64%", d: 165 },
];

/** Blitzkrieg: four forked-lightning after-images streak across in sequence,
 * with a combo flash on the lead square. */
function BlitzBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE STORM MARSHAL: a colossal winged war-god of speed
    // drops out of a gold-white sky, a fistful of strike-bolts raking the crop
    // beneath him — four moves, four cracks — before the concussion rings.
    return (
      <GodEvent
        wash="rgba(255,246,200,0.24)"
        rays="rgba(255,220,130,0.85)"
        boom="rgba(255,200,90,0.85)"
        flare="rgba(255,243,201,0.8)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* swept war-wings */}
            <path d="M14 16 C7 12 3 13 1 17 C6 18 9 20 12 23 Z" fill="rgba(255,231,150,0.8)" stroke="#8a6414" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M30 16 C37 12 41 13 43 17 C38 18 35 20 32 23 Z" fill="rgba(255,231,150,0.8)" stroke="#8a6414" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the marshal: crested helm, war-coat */}
            <path d="M19 6 L22 2 L25 6 Z" fill="#e6432c" stroke="#7a1a10" strokeWidth="0.7" strokeLinejoin="round" />
            <circle cx="22" cy="10" r="3.2" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M22 14 C18.5 14 17 17 16.5 21 L13 42 H31 L27.5 21 C27 17 25.5 14 22 14 Z" fill="rgba(230,67,44,0.85)" stroke="#7a1a10" strokeWidth="1" strokeLinejoin="round" />
            {/* the fistful of bolts hurled down */}
            <path d="M16 26 L11 34 L14 34 L9 42 M28 26 L33 34 L30 34 L35 42" fill="none" stroke="#ffe9b0" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        }
      >
        {/* the four raking strike-bolts under him */}
        <span className="fx-sig-streak absolute left-[26%] top-[38%] block h-[26%] w-[48%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 48 32" className="h-full w-full" aria-hidden="true">
            <g stroke="#e6bf6a" strokeWidth="2.2" strokeLinejoin="round" fill="none">
              <path d="M4 4 L14 12 L10 14 L20 22" />
              <path d="M16 2 L26 10 L22 12 L32 20" />
              <path d="M28 6 L38 14 L34 16 L44 24" />
            </g>
            <path d="M10 24 L20 28 L16 29 L26 31" stroke="#fff3c9" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {BLITZ_IMGS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute top-[6%] block h-[70%] w-[22%]"
          style={{ left: b.left, animationDelay: `${delayMs + b.d}ms` }}
        >
          <JagBolt />
        </span>
      ))}
    </span>
  );
}

/** Mass / Deep / Eternal Freeze: a flash-frost sweep glazes the square, a rime
 * pop at its heart. */
function FrostSweepBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-frost absolute inset-[6%] block rounded-[1px]"
        style={{
          background: "linear-gradient(90deg, rgba(210,240,255,0.7), rgba(170,215,245,0.4))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-flash absolute inset-[26%] block rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(230,248,255,0.85), transparent 70%)",
          animationDelay: `${delayMs}ms`,
        }}
      />
    </span>
  );
}

/** Medusa / Basilisk: a grey stone wave washes foot-to-head over the piece,
 * with a green stare glint (lead). */
function PetrifyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute bottom-[8%] left-[18%] right-[18%] top-[8%] block rounded-[1px]"
        style={{
          background: "linear-gradient(0deg, rgba(140,140,146,0.78), rgba(170,170,176,0.32))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      {lead && (
        <span
          className="fx-sig-flash absolute left-[30%] top-[24%] block h-[18%] w-[40%] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(150,220,150,0.85), transparent 70%)",
            animationDelay: `${delayMs + 90}ms`,
          }}
        />
      )}
    </span>
  );
}

/** Petrified Forest: bark creeps up the piece and a stone leaf drifts off. */
function PetrifiedForestBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE PETRIFIED TREANT: grey grove-light blazes up from the
  // ground and a colossal stone-barked treant god rises over the board, its
  // canopy already rock, while stone leaves rain the central band.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(96,72,44,0.3)"
        rays="rgba(158,158,148,0.65)"
        boom="rgba(138,138,128,0.85)"
        flare="rgba(178,170,150,0.7)"
        sparkFill="#8a8a80"
        sparkStroke="#4a4a44"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* petrified canopy */}
            <path d="M20 2 C29 2 34 8 33 15 C37 17 37 22 33 24 L28 22 C25 25 15 25 12 22 L7 24 C3 22 3 17 7 15 C6 8 11 2 20 2 Z" fill="rgba(138,138,128,0.85)" stroke="#4a4a44" strokeWidth="1.1" strokeLinejoin="round" />
            {/* stone trunk with a hollow face */}
            <path d="M15 44 V28 C13 25 13 22 15 20 H25 C27 22 27 25 25 28 V44 Z" fill="rgba(110,92,72,0.9)" stroke="#4a3a2a" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M17.5 23.5 L19 25 M22.5 23.5 L21 25 M18 29 C19.5 30.5 20.5 30.5 22 29" stroke="#2f3a26" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* bark seams turning to rock */}
            <path d="M16 34 V42 M24 33 V41 M20 31 V44" stroke="rgba(74,58,42,0.7)" strokeWidth="0.7" fill="none" />
          </svg>
        }
      >
        <BoardRain
          delayMs={delayMs + 100}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <path d="M6 1 C9 3 9 8 6 11 C3 8 3 3 6 1 Z" fill="#8a8a80" stroke="#4a4a44" strokeWidth="0.6" />
            </svg>
          )}
        />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute bottom-[6%] left-[22%] right-[22%] top-[10%] block rounded-[1px]"
        style={{
          background: "linear-gradient(0deg, rgba(96,72,44,0.82), rgba(130,102,66,0.4))",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="fx-sig-ash absolute left-[52%] top-[14%] block h-[18%] w-[18%]"
        style={{ animationDelay: `${delayMs + 120}ms` }}
      >
        <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
          <path d="M6 1 C9 3 9 8 6 11 C3 8 3 3 6 1 Z" fill="#8a8a80" stroke="#4a4a44" strokeWidth="0.6" />
        </svg>
      </span>
    </span>
  );
}

/** Aegis: a board-wide shield flash rings the piece, a shield glyph settling on
 * the lead square. */
function AegisBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE SHIELD SERAPH: verdant god-rays break the sky and a
    // colossal winged warden descends bearing the aegis before it, planting it
    // with a flare and twin green shockwaves.
    return (
      <GodEvent
        wash="rgba(123,181,47,0.24)"
        rays="rgba(163,209,96,0.8)"
        boom="rgba(123,181,47,0.85)"
        flare="rgba(196,230,140,0.75)"
        sparkFill="#a3d160"
        sparkStroke="#3f6f1f"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* warden wings */}
            <path d="M12 14 C5 10 2 12 1 17 C6 17 9 19 11 22 Z" fill="rgba(196,230,140,0.75)" stroke="#3f6f1f" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M32 14 C39 10 42 12 43 17 C38 17 35 19 33 22 Z" fill="rgba(196,230,140,0.75)" stroke="#3f6f1f" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the warden behind the great shield */}
            <circle cx="22" cy="8" r="3" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M22 12 C18 12 16 15 15.5 19 L14 30 H30 L28.5 19 C28 15 26 12 22 12 Z" fill="rgba(90,130,50,0.8)" stroke="#3f6f1f" strokeWidth="1" strokeLinejoin="round" />
            {/* the colossal aegis, borne before it */}
            <path d="M22 16 L33 20 V29 C33 36 28.5 41.2 22 43 C15.5 41.2 11 36 11 29 V20 Z" fill="rgba(22,30,22,0.88)" stroke="#7bb52f" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M22 22 V37 M16 28 H28" stroke="rgba(163,209,96,0.85)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[12%] block rounded-full"
        style={{ border: "1.5px solid rgba(123,181,47,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flash absolute inset-[24%] block rounded-full"
        style={{ background: "radial-gradient(circle, rgba(163,209,96,0.65), transparent 70%)", animationDelay: `${delayMs}ms` }}
      />
    </span>
  );
}

/** Divine Fortress: a cathedral dome descends over the square, a bright apex
 * glint (lead). */
function CathedralBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE RISEN CATHEDRAL: consecrated light blazes up out of
    // the squares and a colossal spired cathedral heaves out of the board,
    // rose window aglow, its bells answered by twin silver shockwaves.
    return (
      <GodEvent
        wash="rgba(30,40,55,0.26)"
        rays="rgba(200,215,235,0.75)"
        boom="rgba(200,215,235,0.85)"
        flare="rgba(230,240,255,0.7)"
        sparkFill="#c8d7eb"
        sparkStroke="#3a4a5e"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* twin spires + central dome */}
            <path d="M7 44 V20 L11 12 L15 20 V44 Z" fill="rgba(30,40,55,0.6)" stroke="rgba(200,215,235,0.85)" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M25 44 V20 L29 12 L33 20 V44 Z" fill="rgba(30,40,55,0.6)" stroke="rgba(200,215,235,0.85)" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M15 44 V24 C15 16 17 12 20 10 C23 12 25 16 25 24 V44 Z" fill="rgba(30,40,55,0.5)" stroke="rgba(200,215,235,0.9)" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M20 10 V4 M18 6 H22" stroke="#e6bf6a" strokeWidth="1.2" strokeLinecap="round" />
            {/* rose window + lancets, lit from within */}
            <circle cx="20" cy="22" r="3" fill="rgba(230,191,106,0.75)" stroke="rgba(200,215,235,0.9)" strokeWidth="0.8" />
            <path d="M10 30 V38 M30 30 V38 M18 32 V42 M22 32 V42" stroke="rgba(230,191,106,0.65)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-dome absolute left-[14%] right-[14%] top-[10%] block h-[64%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 3 C31 3 36 14 36 26 V38 H4 V26 C4 14 9 3 20 3 Z" fill="rgba(30,40,55,0.35)" stroke="rgba(200,215,235,0.85)" strokeWidth="1.4" />
          <path d="M20 3 V38 M12 8 V38 M28 8 V38" stroke="rgba(200,215,235,0.5)" strokeWidth="0.8" fill="none" />
        </svg>
      </span>
    </span>
  );
}

/** Immortal King: the king returns wreathed in translucent shades. */
function ShadesBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE DEATHLESS KING: pale sepulchre-light splits the sky
    // and a colossal crowned shade-king descends over the board, lesser shades
    // trailing his mantle, settling in a cold flare and twin spectral rings.
    return (
      <GodEvent
        wash="rgba(210,225,255,0.24)"
        rays="rgba(180,205,255,0.7)"
        boom="rgba(180,205,255,0.85)"
        flare="rgba(220,232,255,0.7)"
        sparkFill="#cdd8e6"
        sparkStroke="#4a5a78"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the colossal shade-king: cross-crown, hollow gaze, wraith robe */}
            <path d="M20 1 V6 M17 3.5 H23" stroke="rgba(180,205,255,0.95)" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M15 10 L16 6.5 L18.5 9 L20 5.5 L21.5 9 L24 6.5 L25 10 Z" fill="rgba(210,225,255,0.6)" stroke="rgba(180,205,255,0.9)" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="20" cy="14" r="3.4" fill="rgba(210,225,255,0.4)" stroke="rgba(180,205,255,0.9)" strokeWidth="0.9" />
            <path d="M18.4 13.6 H19.4 M20.6 13.6 H21.6" stroke="#2c3e6b" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M13 42 C10 30 13 19 20 19 C27 19 30 30 27 42 C24.5 39.5 23 40.5 22 43 C21 40.5 19 40.5 18 43 C17 40.5 15.5 39.5 13 42 Z" fill="rgba(210,225,255,0.45)" stroke="rgba(180,205,255,0.85)" strokeWidth="1.1" strokeLinejoin="round" />
            {/* trailing lesser shades */}
            <path d="M6 34 C5 28 7 24 9 24 C10.5 24 11.5 27 11 32 Z" fill="rgba(210,225,255,0.35)" stroke="rgba(180,205,255,0.6)" strokeWidth="0.7" />
            <path d="M34 34 C35 28 33 24 31 24 C29.5 24 28.5 27 29 32 Z" fill="rgba(210,225,255,0.35)" stroke="rgba(180,205,255,0.6)" strokeWidth="0.7" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shade absolute left-[24%] top-[14%] block h-[66%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
          <path
            d="M10 1 L10 5 M8 3 H12 M6.5 22 C4.5 15 7 10 10 10 C13 10 15.5 15 13.5 22 Z"
            fill="rgba(210,225,255,0.5)"
            stroke="rgba(180,205,255,0.85)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

const WALL_BRICKS = [
  { left: "12%", bottom: "10%", d: 0 },
  { left: "40%", bottom: "10%", d: 60 },
  { left: "66%", bottom: "10%", d: 120 },
  { left: "26%", bottom: "34%", d: 180 },
  { left: "54%", bottom: "34%", d: 240 },
];

/** Rampart / Great Wall: an uncapturable wall builds brick by brick from the
 * ground up. */
function WallBuildBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead raises the WHOLE
  // rampart — an earthen wash while a course of bricks stacks the full width
  // of the crop, merlons rising on top.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(120,86,58,0.24)" delayMs={delayMs} />
        <span className="fx-sig-brick absolute left-[24%] bottom-[36%] block h-[8%] w-[52%] rounded-[2px]" style={{ background: "rgba(120,86,58,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + 60}ms` }} />
        {[
          { l: "28%", d: 170 },
          { l: "40%", d: 260 },
          { l: "52%", d: 350 },
          { l: "64%", d: 440 },
        ].map((m, i) => (
          <span key={i} className="fx-sig-brick absolute bottom-[44%] block h-[5%] w-[7%] rounded-[1px]" style={{ left: m.l, background: "rgba(132,96,64,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + m.d}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {WALL_BRICKS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute block h-[22%] w-[24%] rounded-[1px]"
          style={{
            left: b.left,
            bottom: b.bottom,
            background: "rgba(120,86,58,0.9)",
            border: "1px solid rgba(60,40,24,0.8)",
            animationDelay: `${delayMs + b.d}ms`,
          }}
        />
      ))}
    </span>
  );
}

// --- 10c. Batch 3 signature visuals (distinctness split + fantasy set) -------
// Same rules as Batch 1/2: keyed one-shots, transform/opacity only, hidden
// under reduced motion (added to the effects.css block). These split apart the
// families that used to share one visual (freeze, petrify, walls) and cover the
// FANTASY card set, matching each card's real effect. Flat SVG fills and solid
// discs only: no gradients, no glow halos, bolder MOTION and MORE shapes.
// (The shared SigShard/ShardBurst kit these lean on stays in BoardEffects.tsx
// — CastSpectacle needs it eagerly — and is imported above.)

// --- Board-wide takeover stage (brainrot lead spectacles) --------------------
// The brainrot lead flourishes escape their one square: painted inside an
// oversized canvas centred on the (arbitrary) signature square, big enough to
// blanket the whole 8x8 board wherever that square lands, clipped to the board
// by its overflow-hidden frame. The computer-virus cascade uses the same trick.
// Children lay out in the canvas's 0..100% space (its centre is the caster
// square), so a full-canvas wash covers the board and a central-band particle
// field / sweeping character reads as board-wide.
function BoardWideStage({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

// A full-board colour wash (freeze glaze, time-grey, banana-gold, honk-flash).
function BoardWash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="fx-sig-bwash absolute inset-0 block"
      style={{ background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

// A scatter of objects raining down the central board band, each tumbling from
// above the board through it and out the bottom, staggered and spinning.
// `render(i)` draws one faller (sized to its column). Left values sit in the
// canvas's central ~40% so they concentrate over the board, not the wide margin.
const RAIN_COLS = [
  { l: "31%", d: 0, s: "300deg", sz: 8 }, { l: "37%", d: 150, s: "-260deg", sz: 6 },
  { l: "43%", d: 60, s: "340deg", sz: 9 }, { l: "49%", d: 210, s: "-300deg", sz: 7 },
  { l: "55%", d: 30, s: "280deg", sz: 8 }, { l: "61%", d: 175, s: "-330deg", sz: 6 },
  { l: "67%", d: 95, s: "310deg", sz: 9 }, { l: "34%", d: 250, s: "-280deg", sz: 6 },
  { l: "64%", d: 320, s: "360deg", sz: 8 }, { l: "50%", d: 380, s: "-320deg", sz: 7 },
];
function BoardRain({ delayMs, render }: { delayMs: number; render: (i: number) => React.ReactNode }) {
  return (
    <>
      {RAIN_COLS.map((c, i) => (
        <span
          key={i}
          className="fx-sig-rain absolute top-[30%] block"
          style={
            { left: c.l, height: `${c.sz}%`, width: `${c.sz}%`, "--spin": c.s, animationDelay: `${delayMs + c.d}ms` } as React.CSSProperties
          }
        >
          {render(i)}
        </span>
      ))}
    </>
  );
}

// A colossal shockwave ring bloomed from the board centre (goose HONK, ape
// chest-thump). Sized as a fraction of the canvas so it sweeps well past the
// board edges as it expands.
function BoardBoom({ delayMs, color, thickness = 3 }: { delayMs: number; color: string; thickness?: number }) {
  return (
    <span
      className="fx-sig-boom absolute left-1/2 top-1/2 block rounded-full"
      style={{ height: "70%", width: "70%", marginLeft: "-35%", marginTop: "-35%", border: `${thickness}px solid ${color}`, animationDelay: `${delayMs}ms` }}
    />
  );
}

// Batch 13 — board-wide lead upgrade: shared takeover stage for the signatures
// whose lead flourish used to be a square-local flash or ring. Washes the whole
// crop in the card's tint, floats the card's own per-square motif writ large
// over the centre (animated by the same fx-sig class it uses per square, so the
// motion fiction carries over), and rolls a shockwave out past the board edges.
// Composes only existing helpers/classes: transform/opacity, one-shot, hidden
// under reduced motion.
function BoardWideLead({
  wash,
  boom,
  delayMs,
  motifClass = "fx-sig-grow",
  children,
}: {
  wash: string;
  boom: string;
  delayMs: number;
  motifClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <BoardWideStage>
      <BoardWash color={wash} delayMs={delayMs} />
      {children && (
        // Owner size pass: inset 31% leaves a 38%-of-canvas motif, ~2/3 of the
        // visible board (was 34% / ~56%).
        <span className={motifClass + " absolute inset-[31%] block"} style={{ animationDelay: `${delayMs + 100}ms` }}>
          {children}
        </span>
      )}
      <BoardBoom delayMs={delayMs + 300} color={boom} />
    </BoardWideStage>
  );
}

// --- God-scale staged lead (tier 7+ divine-event guarantee) -------------------
// Owner: "I want all of them to be like gods and stuff... all above tier 6 at
// least." Bar = LivingGodBurst. Every tier 7+ lead composes the same four-act
// arc, keeping the card's own motif art as the colossal centerpiece:
//   (a) build-up  — the crop washes in the card's tint while a five-ray god-fan
//                   breaks from the heavens (or blazes up out of the ground for
//                   risers),
//   (b) manifest  — the card's colossal central figure descends / rises over
//                   the board,
//   (c) climax    — touchdown flare, a spark burst, and twin shockwaves rolled
//                   past the board edges,
//   (d) aftermath — the second, softer ring fading out.
// Composes only existing fx-sig-* classes (transform/opacity, one-shot, hidden
// when animations are off in Settings by effects.css), stays inside BoardWideStage's
// oversized-clipped crop, and finishes well inside the 2.5s play budget.
const GOD_FAN = [
  { r: "-28deg", d: 0, w: "7%" },
  { r: "-14deg", d: 60, w: "9%" },
  { r: "0deg", d: 30, w: "11%" },
  { r: "14deg", d: 90, w: "9%" },
  { r: "28deg", d: 120, w: "7%" },
];
function GodEvent({
  wash,
  rays,
  boom,
  flare,
  delayMs,
  motion = "descend",
  sparkFill = "#ffd95e",
  sparkStroke = "#8a6414",
  figure,
  children,
}: {
  /** Build-up wash tint over the whole crop. */
  wash: string;
  /** God-fan ray colour (bright, translucent). */
  rays: string;
  /** Shockwave ring colour. */
  boom: string;
  /** Touchdown flare colour. */
  flare: string;
  delayMs: number;
  /** How the colossal figure enters: lowered from the sky or up from below. */
  motion?: "descend" | "rise";
  sparkFill?: string;
  sparkStroke?: string;
  /** The colossal central manifestation (card-unique SVG). */
  figure: React.ReactNode;
  /** Optional card-specific extra staging layered over the arc. */
  children?: React.ReactNode;
}) {
  const rise = motion === "rise";
  return (
    <BoardWideStage>
      <BoardWash color={wash} delayMs={delayMs} />
      {/* (a) the god-fan: five staggered rays break over the board (flipped to
          blaze out of the ground for risers — grave-light, magma, frost). */}
      {GOD_FAN.map((s, i) => (
        <span
          key={i}
          className={"absolute left-1/2 block h-[62%] " + (rise ? "top-[32%]" : "top-[6%]")}
          style={{
            width: s.w,
            marginLeft: `calc(${s.w} / -2)`,
            transform: `rotate(${s.r})${rise ? " scaleY(-1)" : ""}`,
            transformOrigin: rise ? "50% 100%" : "50% 0%",
          }}
        >
          <span
            className="fx-sig-shaft absolute inset-0 block"
            style={{
              background: `linear-gradient(180deg, ${rays}, transparent 78%)`,
              animationDelay: `${delayMs + s.d}ms`,
            }}
          />
        </span>
      ))}
      {/* (b) the colossal manifestation, entering the board (owner size pass:
          34% of the canvas is ~60% of the visible board — the god should feel
          like it barely fits the arena) */}
      <span
        className={(rise ? "fx-sig-rise" : "fx-sig-shade") + " absolute left-[33%] top-[18%] block h-[54%] w-[34%]"}
        style={{ animationDelay: `${delayMs + 170}ms` }}
      >
        {figure}
      </span>
      {children}
      {/* (c) climax: touchdown flare + sparks + twin shockwaves */}
      <span
        className="fx-sig-flash absolute left-[36%] top-[54%] block h-[21%] w-[28%] rounded-full"
        style={{ background: flare, animationDelay: `${delayMs + 470}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill={sparkFill} stroke={sparkStroke} delayMs={delayMs + 500} sizePct={7} />
      <BoardBoom delayMs={delayMs + 520} color={boom} thickness={4} />
      {/* (d) aftermath: the second, softer ring */}
      <BoardBoom delayMs={delayMs + 680} color={boom} />
    </BoardWideStage>
  );
}

// --- APEX band (tier 9/10) — RIDICULOUS set pieces ----------------------------
// Owner: "Make the tier 9 and 10 animations absolutely RIDICULOUS — you can go
// above and beyond and have fun with it. Stuff like a rage quit and then a big
// fist slamming down on the chessboard." Every tier 9/10 lead below is a
// bespoke physical-comedy set piece a clear notch ABOVE the tier 7/8 GodEvent
// arc: letterbox bars, colossal props (fists, guillotines, rubber stamps,
// breaker levers), up to THREE shockwaves, and a ~3s budget (vs 2.5s). The
// gp-* keyframes live in godPlays.css (imported at the top of this file);
// everything stays transform/opacity-only, one-shot, inside the oversized-
// clipped BoardWideStage crop, and hidden when animations are off in Settings.

/** Cinema letterbox bars along the crop's top and bottom edges (the board is
 * the canvas's central 21.5%..78.5% band). */
function Letterbox({ delayMs }: { delayMs: number }) {
  return (
    <>
      <span
        className="gp-bar absolute left-0 right-0 block"
        style={{ top: "21.5%", height: "6%", background: "rgba(8,8,12,0.82)", transformOrigin: "50% 0%", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gp-bar absolute left-0 right-0 block"
        style={{ top: "72.5%", height: "6%", background: "rgba(8,8,12,0.82)", transformOrigin: "50% 100%", animationDelay: `${delayMs}ms` }}
      />
    </>
  );
}

/** A flat chess-piece silhouette for apex staging (rattled bystanders, armies
 * dropping out of the sky, souls climbing back out of the ground). */
function ApexPiece({ kind, fill, stroke }: { kind: "pawn" | "knight" | "rook" | "bishop" | "queen"; fill: string; stroke: string }) {
  const body = { fill, stroke, strokeWidth: 1, strokeLinejoin: "round" as const };
  switch (kind) {
    case "knight":
      return (
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <path d="M4 22 C4 15 6 13 6 10 C4.5 11 3 10.5 3.4 8.5 C4 6 7 3.5 10 3.5 C13 5 13.5 9 13 14 L12 22 Z" {...body} />
        </svg>
      );
    case "rook":
      return (
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" {...body} />
        </svg>
      );
    case "bishop":
      return (
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <circle cx="8" cy="3.4" r="1.2" {...body} />
          <path d="M8 5 C10.5 7 11.5 9.5 11.5 12 C11.5 14.5 10 16 8 16 C6 16 4.5 14.5 4.5 12 C4.5 9.5 5.5 7 8 5 Z" {...body} />
          <path d="M4.5 22 C5 18.5 6 17 8 17 C10 17 11 18.5 11.5 22 Z" {...body} />
        </svg>
      );
    case "queen":
      return (
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <path d="M3 8 L2.6 3.4 L5 5.6 L8 2 L11 5.6 L13.4 3.4 L13 8 Z" {...body} />
          <path d="M4 9 C3.6 15 3.2 18.5 2.8 22 H13.2 C12.8 18.5 12.4 15 12 9 Z" {...body} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <circle cx="8" cy="6" r="3.2" {...body} />
          <path d="M3 22 C3.6 14 5 12 8 12 C11 12 12.4 14 13 22 Z" {...body} />
        </svg>
      );
  }
}

// --- Freeze family (each ice card its own read) ------------------------------

/** Mass Freeze: a quick spike-frost SNAP, shards flick outward, rime flashes. */
function SnapFrostBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead snap glazes the WHOLE
  // board — an icy wash, rime panes wiping in across the crop, and a frost
  // ring rolling out past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(198,234,255,0.3)" delayMs={delayMs} />
        {[
          { l: "26%", t: "30%", w: "18%", h: "9%", d: 0 },
          { l: "50%", t: "48%", w: "22%", h: "10%", d: 130 },
          { l: "34%", t: "60%", w: "16%", h: "8%", d: 250 },
          { l: "58%", t: "28%", w: "15%", h: "8%", d: 340 },
        ].map((p, i) => (
          <span key={i} className="fx-sig-frost absolute block rounded-[2px]" style={{ left: p.l, top: p.t, width: p.w, height: p.h, background: "rgba(198,234,255,0.45)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs + p.d}ms` }} />
        ))}
        <BoardBoom delayMs={delayMs + 300} color="rgba(224,246,255,0.9)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-frost absolute inset-[4%] block rounded-[1px]"
        style={{ background: "rgba(198,234,255,0.5)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs} sizePct={13} />
      <span
        className="fx-sig-flash absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(234,248,255,0.8)", animationDelay: `${delayMs}ms` }}
      />
    </span>
  );
}

/** Deep Freeze: a heavy glacier slab heaves up and slams over the piece, its
 * face veined with cracks; a rime crack flash on the lead square. */
function DeepGlacierBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE GLACIER TITAN: cold light wells up out of the board
    // and a colossal slab-shouldered titan of veined glacier ice grinds up
    // over the crop, flash-flaring as its mass sets with twin rime shockwaves.
    return (
      <GodEvent
        wash="rgba(176,220,245,0.26)"
        rays="rgba(224,246,255,0.75)"
        boom="rgba(224,246,255,0.85)"
        flare="rgba(235,250,255,0.7)"
        sparkFill="#e6f6ff"
        sparkStroke="#82bcdf"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the glacier titan: faceted slab body, jagged berg shoulders */}
            <path d="M8 44 L6 26 L2 22 L9 18 L12 8 L20 3 L28 9 L31 18 L38 22 L34 26 L32 44 Z" fill="rgba(176,220,245,0.55)" stroke="rgba(224,246,255,0.9)" strokeWidth="1.3" strokeLinejoin="round" />
            {/* crack veins running its face */}
            <path d="M14 10 L18 18 L13 24 L18 34 M26 11 L22 18 L27 24 L23 36" fill="none" stroke="rgba(235,250,255,0.75)" strokeWidth="1.1" strokeLinejoin="round" />
            {/* cold sunk eyes */}
            <path d="M16 15 H18.5 M21.5 15 H24" stroke="#3f6f9f" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-slab absolute inset-x-[8%] bottom-[6%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(176,220,245,0.5)", border: "1.5px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path
            d="M8 2 L13 12 L7 18 L14 30 M23 3 L18 11 L25 17 L20 31"
            fill="none"
            stroke="rgba(235,250,255,0.7)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

/** Eternal Freeze: an ice block sets, then EXPLODES into a wide shard shatter
 * with a shockwave ring: the most violent of the three. */
function IceShatterBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE WINTER EMPRESS: white rays split the sky and a
    // colossal ice empress descends, sceptre levelled, the board flash-flaring
    // under her as a wide shard-shatter and twin frost shockwaves erupt.
    return (
      <GodEvent
        wash="rgba(190,230,250,0.26)"
        rays="rgba(230,246,255,0.85)"
        boom="rgba(230,246,255,0.85)"
        flare="rgba(235,250,255,0.8)"
        sparkFill="#e6f6ff"
        sparkStroke="#82bcdf"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* spiked ice diadem */}
            <path d="M14 9 L15 3 L17.5 6.5 L20 1.5 L22.5 6.5 L25 3 L26 9 Z" fill="rgba(230,246,255,0.85)" stroke="#82bcdf" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="20" cy="12.5" r="3.1" fill="rgba(235,250,255,0.9)" stroke="#82bcdf" strokeWidth="0.8" />
            {/* crystalline gown */}
            <path d="M20 16 C16.5 16 15 19 14.5 23 L10 42 L15 39 L20 43 L25 39 L30 42 L25.5 23 C25 19 23.5 16 20 16 Z" fill="rgba(190,230,250,0.6)" stroke="rgba(224,246,255,0.9)" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M17 22 L20 26 L23 22 M20 26 V38" stroke="rgba(235,250,255,0.7)" strokeWidth="0.8" fill="none" />
            {/* the levelled sceptre, tipped in a snow-star */}
            <path d="M28 20 L37 14" stroke="#82bcdf" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M37 14 L37 10.5 M37 14 L40 15 M37 14 L34.5 11.5 M37 14 L39 11" stroke="rgba(235,250,255,0.95)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[10%] block rounded-[1px]"
        style={{ background: "rgba(190,230,250,0.42)", border: "1px solid rgba(224,246,255,0.8)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <path d="M16 2 L11 14 L18 18 L13 30 M4 12 L14 16 M28 12 L18 16" fill="none" stroke="rgba(235,250,255,0.7)" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e6f6ff" stroke="#82bcdf" delayMs={delayMs + 220} sizePct={13} />
    </span>
  );
}

/** Staff of Stasis: iced chain-links drape and freeze solid over the piece. */
function ChainFreezeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(190,230,250,0.24)" boom="rgba(207,233,250,0.85)" delayMs={delayMs} motifClass="fx-sig-cage">
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#cfe9fa" strokeWidth="2.4" fill="none">
            <ellipse cx="9" cy="9" rx="3.6" ry="2.4" transform="rotate(45 9 9)" />
            <ellipse cx="16" cy="16" rx="3.6" ry="2.4" transform="rotate(45 16 16)" />
            <ellipse cx="23" cy="23" rx="3.6" ry="2.4" transform="rotate(45 23 23)" />
          </g>
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ice absolute inset-[12%] block rounded-[1px]"
        style={{ background: "rgba(190,230,250,0.4)", border: "1px solid rgba(224,246,255,0.8)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute inset-[10%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#cfe9fa" strokeWidth="2.4" fill="none">
            <ellipse cx="9" cy="9" rx="3.6" ry="2.4" transform="rotate(45 9 9)" />
            <ellipse cx="16" cy="16" rx="3.6" ry="2.4" transform="rotate(45 16 16)" />
            <ellipse cx="23" cy="23" rx="3.6" ry="2.4" transform="rotate(45 23 23)" />
          </g>
        </svg>
      </span>
    </span>
  );
}

// --- Petrify / stone family --------------------------------------------------

/** Gorgon Stare (single champion / basilisk): a green petrifying beam bores in
 * as grey stone climbs the piece; a slit-pupil eye glares on the lead square. */
function GorgonStareBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[16%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(150,150,156,0.7)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-shaft absolute left-[40%] top-0 block h-[70%] w-[20%]"
        style={{ background: "rgba(126,181,154,0.5)", animationDelay: `${delayMs}ms` }}
      />
      {lead && (
        <span className="fx-sig-flash absolute left-[28%] top-[30%] block h-[24%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 24 12" className="h-full w-full" aria-hidden="true">
            <ellipse cx="12" cy="6" rx="11" ry="5" fill="rgba(20,30,24,0.85)" stroke="#8fd694" strokeWidth="1.2" />
            <ellipse cx="12" cy="6" rx="1.7" ry="4.2" fill="#b6f0b8" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Medusa's full gaze: grey stone washes up as snake-hair tendrils whip round
 * a gaze ring; a green glint on the lead square. */
function MedusaGazeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE GORGON RISEN: sickly green grave-light blazes up and
    // a colossal snake-haired gorgon head rises over the board, its slit gaze
    // sweeping the crop before the stone-flare and twin petrifying shockwaves.
    return (
      <GodEvent
        wash="rgba(146,146,152,0.26)"
        rays="rgba(143,181,154,0.7)"
        boom="rgba(143,181,154,0.85)"
        flare="rgba(182,240,184,0.6)"
        sparkFill="#a6a6ac"
        sparkStroke="#3a3a40"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* writhing snake crown */}
            <g stroke="#8fb59a" strokeWidth="1.8" fill="none" strokeLinecap="round">
              <path d="M12 12 C8 8 8 4 11 2 M20 10 C19 5 21 2 24 2 M28 12 C32 8 32 4 29 2 M8 18 C4 16 3 12 5 9 M32 18 C36 16 37 12 35 9" />
            </g>
            <circle cx="11" cy="2" r="1" fill="#3a5a40" />
            <circle cx="24" cy="2" r="1" fill="#3a5a40" />
            <circle cx="29" cy="2" r="1" fill="#3a5a40" />
            {/* the colossal stone face */}
            <path d="M20 8 C28 8 32 15 32 24 C32 34 27 40 20 40 C13 40 8 34 8 24 C8 15 12 8 20 8 Z" fill="rgba(146,146,152,0.85)" stroke="#5c5c63" strokeWidth="1.2" strokeLinejoin="round" />
            {/* slit-pupil gaze */}
            <path d="M12 21 C14 19 17 19 18.5 21 C17 23 14 23 12 21 Z M28 21 C26 19 23 19 21.5 21 C23 23 26 23 28 21 Z" fill="#b6f0b8" stroke="#3a5a40" strokeWidth="0.8" />
            <path d="M15.2 20 V22.2 M24.8 20 V22.2" stroke="#1c2e20" strokeWidth="1" strokeLinecap="round" />
            <path d="M16 32 C18 34 22 34 24 32" stroke="#5c5c63" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(146,146,152,0.72)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-gaze absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#8fb59a" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M20 6 q4 3 2 8 M34 20 q-3 4 -8 2 M20 34 q-4 -3 -2 -8 M6 20 q3 -4 8 -2" />
            <path d="M30 10 q1 4 -3 6 M30 30 q-4 1 -6 -3 M10 30 q-1 -4 3 -6 M10 10 q4 -1 6 3" />
          </g>
          <circle cx="20" cy="20" r="5.5" fill="none" stroke="#b6f0b8" strokeWidth="1.4" />
        </svg>
      </span>
    </span>
  );
}

/** Serpent Brood: stone-scaled serpents coil round the clergy and set solid. */
function SerpentStoneBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[20%] bottom-[8%] top-[10%] block rounded-[1px]"
        style={{ background: "rgba(138,138,146,0.72)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-gaze absolute inset-[16%] block" style={{ animationDelay: `${delayMs + 40}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 30 C8 20 20 24 20 16 C20 8 30 12 32 8" fill="none" stroke="#a6a6ac" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 30 C8 20 20 24 20 16 C20 8 30 12 32 8" fill="none" stroke="#6e6e76" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="32" cy="8" r="1.1" fill="#3a3a40" />
        </svg>
      </span>
    </span>
  );
}

const WITHER_MOTES = [
  { left: "30%", top: "24%", w: "13%", c: "#5f584e", d: 0 },
  { left: "52%", top: "30%", w: "11%", c: "#6b6358", d: 40 },
  { left: "38%", top: "48%", w: "15%", c: "#544e46", d: 70 },
  { left: "58%", top: "50%", w: "10%", c: "#726a5e", d: 55 },
];

/** Withering Touch: a grey pall drains up the piece as flesh crumbles to dust. */
const WITHER_FALL = [
  { l: "52%", t: "38%", w: "2.4%", d: 0 },
  { l: "58%", t: "44%", w: "2%", d: 90 },
  { l: "55%", t: "52%", w: "2.6%", d: 180 },
  { l: "62%", t: "40%", w: "1.8%", d: 260 },
  { l: "49%", t: "47%", w: "2%", d: 340 },
];
function WitherBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE WITHERED REACH: a colossal gaunt hand stretches in
  // from the wing, its touch crumbling the board's heart to husk-motes before
  // a single dust-grey shockwave rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(108,102,92,0.26)" delayMs={delayMs} />
        {/* the withered hand, reaching across the crop */}
        <span className="fx-sig-punch absolute left-[22%] top-[34%] block h-[26%] w-[34%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
            {/* gaunt forearm off the left edge */}
            <path d="M0 10 C7 8 13 8 19 9.6 L19 17 C13 18.6 7 18.6 0 17 Z" fill="rgba(122,110,96,0.92)" stroke="#3f382c" strokeWidth="1" strokeLinejoin="round" />
            <path d="M4 11 C8 10.4 12 10.4 16 11 M4 15.6 C8 16.2 12 16.2 16 15.6" fill="none" stroke="rgba(63,56,44,0.55)" strokeWidth="0.6" />
            {/* skeletal fingers, splayed toward the heart of the board */}
            <path d="M19 10 C25 6.4 30 5.4 35 6.6 M19 12.4 C26 10.6 32 10.6 38 12 M19 14.8 C26 15.8 32 16.4 37 18 M19 16.8 C24 19 28 20.6 31 22.6" fill="none" stroke="rgba(122,110,96,0.95)" strokeWidth="2" strokeLinecap="round" />
            <path d="M35 6.6 L37.4 6.4 M38 12 L40 12.4 M37 18 L39 19" stroke="rgba(96,110,90,0.9)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        {/* the touch: a sickly bloom where the fingers land */}
        <span
          className="fx-sig-flash absolute left-[56%] top-[40%] block h-[13%] w-[15%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(143,175,74,0.7), transparent 70%)", animationDelay: `${delayMs + 560}ms` }}
        />
        {/* husk-motes crumbling off the touched ground */}
        {WITHER_FALL.map((m, i) => (
          <span
            key={i}
            className="fx-sig-crumble absolute block rounded-[1px]"
            style={{ left: m.l, top: m.t, width: m.w, height: m.w, background: "rgba(122,110,96,0.9)", animationDelay: `${delayMs + 620 + m.d}ms` }}
          />
        ))}
        <BoardBoom delayMs={delayMs + 700} color="rgba(96,110,90,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(108,102,92,0.7)", animationDelay: `${delayMs}ms` }}
      />
      {WITHER_MOTES.map((m, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: m.left, top: m.top, width: m.w, height: m.w, background: m.c, animationDelay: `${delayMs + m.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Chains of Binding: spectral chain-bars drop over the towers as they turn to
 * dead stone. */
function StoneChainBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead binds the WHOLE board —
  // a stone-grey wash while colossal spectral chains drop across the crop.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(140,140,146,0.28)" delayMs={delayMs} />
        {[
          { l: "30%", d: 0 },
          { l: "47%", d: 140 },
          { l: "62%", d: 280 },
        ].map((c, i) => (
          <span key={i} className="fx-sig-cage absolute top-[26%] block h-[48%] w-[8%]" style={{ left: c.l, animationDelay: `${delayMs + c.d}ms` }}>
            <svg viewBox="0 0 16 32" className="h-full w-full" aria-hidden="true">
              <g stroke="#141e2b" strokeWidth="3" fill="none">
                <ellipse cx="8" cy="6" rx="2.4" ry="4" />
                <ellipse cx="8" cy="16" rx="2.4" ry="4" />
                <ellipse cx="8" cy="26" rx="2.4" ry="4" />
              </g>
              <g stroke="#b9c4d6" strokeWidth="1.2" fill="none">
                <ellipse cx="8" cy="6" rx="2.4" ry="4" />
                <ellipse cx="8" cy="16" rx="2.4" ry="4" />
                <ellipse cx="8" cy="26" rx="2.4" ry="4" />
              </g>
            </svg>
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[18%] bottom-[8%] top-[8%] block rounded-[1px]"
        style={{ background: "rgba(140,140,146,0.7)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <g stroke="#141e2b" strokeWidth="3" fill="none">
            <ellipse cx="11" cy="7" rx="2.4" ry="4" />
            <ellipse cx="11" cy="16" rx="2.4" ry="4" />
            <ellipse cx="11" cy="25" rx="2.4" ry="4" />
            <ellipse cx="21" cy="7" rx="2.4" ry="4" />
            <ellipse cx="21" cy="16" rx="2.4" ry="4" />
            <ellipse cx="21" cy="25" rx="2.4" ry="4" />
          </g>
          <g stroke="#b9c4d6" strokeWidth="1.2" fill="none">
            <ellipse cx="11" cy="7" rx="2.4" ry="4" />
            <ellipse cx="11" cy="16" rx="2.4" ry="4" />
            <ellipse cx="11" cy="25" rx="2.4" ry="4" />
            <ellipse cx="21" cy="7" rx="2.4" ry="4" />
            <ellipse cx="21" cy="16" rx="2.4" ry="4" />
            <ellipse cx="21" cy="25" rx="2.4" ry="4" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Hex of Stone: a creeping grey hex crawls a stone hexagon over the flanks. */
function GreyHexBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE HEXWRIGHT: grey warlock-light splits the sky and a
  // colossal robed hexwright descends, both hands pressing the great stone
  // hexagon down onto the board; it seats with a flare and twin grey rings.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(134,134,140,0.3)"
        rays="rgba(168,168,176,0.7)"
        boom="rgba(168,168,176,0.85)"
        flare="rgba(190,190,198,0.7)"
        sparkFill="#a8a8b0"
        sparkStroke="#4c4c53"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the hooded hexwright */}
            <path d="M20 2 C15 2 12.5 5 12.5 9 C12.5 11 13.5 12.5 15 13.5 L14 20 H26 L25 13.5 C26.5 12.5 27.5 11 27.5 9 C27.5 5 25 2 20 2 Z" fill="rgba(96,96,104,0.9)" stroke="#4c4c53" strokeWidth="1" strokeLinejoin="round" />
            <path d="M16.5 8.5 H18.5 M21.5 8.5 H23.5" stroke="#b6f0b8" strokeWidth="1.2" strokeLinecap="round" />
            {/* arms pressing the hex down */}
            <path d="M14 16 L8 25 M26 16 L32 25" stroke="rgba(96,96,104,0.9)" strokeWidth="2.4" strokeLinecap="round" />
            {/* the great stone hexagon, forced onto the board */}
            <polygon points="20,22 33,29 33,40 20,44 7,40 7,29" fill="rgba(120,120,128,0.35)" stroke="rgba(168,168,176,0.95)" strokeWidth="1.4" strokeLinejoin="round" />
            <polygon points="20,28 27,32 27,38 20,40.5 13,38 13,32" fill="none" stroke="rgba(150,150,158,0.75)" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-petrify absolute inset-x-[20%] bottom-[8%] top-[10%] block rounded-[1px]"
        style={{ background: "rgba(134,134,140,0.68)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="rgba(120,120,128,0.28)" stroke="rgba(168,168,176,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
          <polygon points="20,12 28,16 28,24 20,28 12,24 12,16" fill="none" stroke="rgba(150,150,158,0.7)" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

// --- Walls / summons / graves ------------------------------------------------

const GREATWALL_MERLONS = [
  { left: "8%", d: 0 },
  { left: "30%", d: 70 },
  { left: "52%", d: 140 },
  { left: "74%", d: 210 },
];

/** Great Wall: a battlement course rises across the square and merlons rise on
 * top of it. */
function GreatWallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead raises the Great Wall
  // itself — an earthen wash while a battlement course spans the full crop
  // width and a run of merlons rises along its top.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(120,86,58,0.24)" delayMs={delayMs} />
        <span className="fx-sig-brick absolute left-[22%] bottom-[38%] block h-[9%] w-[56%] rounded-[2px]" style={{ background: "rgba(120,86,58,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + 60}ms` }} />
        {[
          { l: "25%", d: 160 },
          { l: "35%", d: 240 },
          { l: "45%", d: 320 },
          { l: "55%", d: 400 },
          { l: "65%", d: 480 },
        ].map((m, i) => (
          <span key={i} className="fx-sig-brick absolute bottom-[47%] block h-[5%] w-[6%] rounded-[1px]" style={{ left: m.l, background: "rgba(132,96,64,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + m.d}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-brick absolute inset-x-[4%] bottom-[22%] block h-[26%] rounded-[1px]"
        style={{ background: "rgba(120,86,58,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs}ms` }}
      />
      {GREATWALL_MERLONS.map((m, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute bottom-[46%] block h-[16%] w-[16%] rounded-[1px]"
          style={{ left: m.left, background: "rgba(132,96,64,0.92)", border: "1px solid rgba(60,40,24,0.85)", animationDelay: `${delayMs + m.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Generic conjuring: an arcane summoning circle draws and spins as a shaft of
 * light rises from its centre (imps, guardians, golems, warbands). */
function SummonRiftBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE GRAND CONJURING (tier-7 guarantee: roost_of_rocs):
  // the crop dims mint while the colossal rift sigil spins open across the
  // whole board and conjuring shafts climb every file; then the summoned
  // colossus itself — a vast crook-beaked roc, wings mantled — heaves up
  // through the circle and sets with a flare, a spark burst, and twin
  // summoning shockwaves rolled past the board edges.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(126,181,154,0.24)"
        rays="rgba(180,224,204,0.7)"
        boom="rgba(126,181,154,0.9)"
        flare="rgba(230,191,106,0.7)"
        sparkFill="#7eb59a"
        sparkStroke="#274e3d"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* mantled wings, spanning the frame */}
            <path d="M20 18 C12 8 5 8 1 16 C6 14 10 16 12 20 C8 20 5 23 4 28 C9 24 14 23 18 25 Z" fill="rgba(126,181,154,0.88)" stroke="#274e3d" strokeWidth="1" strokeLinejoin="round" />
            <path d="M20 18 C28 8 35 8 39 16 C34 14 30 16 28 20 C32 20 35 23 36 28 C31 24 26 23 22 25 Z" fill="rgba(105,160,132,0.88)" stroke="#274e3d" strokeWidth="1" strokeLinejoin="round" />
            {/* breast + tail plumes */}
            <path d="M20 12 C24 16 25 24 24 31 L20 44 L16 31 C15 24 16 16 20 12 Z" fill="rgba(150,204,172,0.92)" stroke="#274e3d" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M17 33 L14 42 M23 33 L26 42" stroke="rgba(39,78,61,0.75)" strokeWidth="0.9" strokeLinecap="round" fill="none" />
            {/* head, crest and the great crooked beak */}
            <circle cx="20" cy="8.5" r="4" fill="rgba(150,204,172,0.95)" stroke="#274e3d" strokeWidth="1" />
            <path d="M17.5 4.6 L18.6 1.6 L20 3.6 L21.4 1.6 L22.5 4.6 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" strokeLinejoin="round" />
            <path d="M20 9.5 L23.8 11 L20 13.2 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
            <circle cx="18.6" cy="8" r="0.8" fill="#274e3d" />
            {/* rune of the summons, glowing on the breast */}
            <path d="M20 20 L22.4 24 L20 28 L17.6 24 Z" fill="none" stroke="#e6bf6a" strokeWidth="0.9" strokeLinejoin="round" />
          </svg>
        }
      >
        {/* the colossal rift sigil, spinning open beneath the summons */}
        <span className="fx-sig-swirl absolute inset-[26%] block" style={{ animationDelay: `${delayMs + 40}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17.5" fill="none" stroke="rgba(126,181,154,0.85)" strokeWidth="1" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="rgba(230,191,106,0.8)" strokeWidth="0.7" strokeDasharray="3 3" />
            <polygon points="20,6 32,27 8,27" fill="none" stroke="rgba(126,181,154,0.7)" strokeWidth="0.7" />
            <polygon points="20,34 8,13 32,13" fill="none" stroke="rgba(126,181,154,0.7)" strokeWidth="0.7" />
            <path d="M20 1.6 V4 M20 36 V38.4 M1.6 20 H4 M36 20 H38.4" stroke="rgba(230,191,106,0.85)" strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* conjuring shafts climbing file by file across the crop */}
        {[
          { l: "27%", d: 100 },
          { l: "37%", d: 220 },
          { l: "48%", d: 60 },
          { l: "59%", d: 280 },
          { l: "69%", d: 160 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[24%] block h-[34%] w-[4%] rounded-[1px]" style={{ left: s.l, background: "linear-gradient(0deg, rgba(180,224,204,0.6), transparent)", animationDelay: `${delayMs + s.d}ms` }} />
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#7eb59a" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#e6bf6a" strokeWidth="1" strokeDasharray="3 3" />
          <polygon points="20,6 32,27 8,27" fill="none" stroke="#7eb59a" strokeWidth="1" />
          <polygon points="20,34 8,13 32,13" fill="none" stroke="#7eb59a" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-rise absolute left-[40%] bottom-[16%] block h-[54%] w-[20%] rounded-[1px]"
        style={{ background: "rgba(180,224,204,0.5)", animationDelay: `${delayMs + 90}ms` }}
      />
    </span>
  );
}

/** Wings unfurling from the piece: dragon membrane (dragon tone) or celestial
 * feathers (feather tone). */
function WingsBurst({ tone, lead, delayMs }: { tone: "dragon" | "feather"; lead: boolean; delayMs: number }) {
  const fill = tone === "dragon" ? "rgba(120,86,58,0.85)" : "rgba(206,226,240,0.7)";
  const stroke = tone === "dragon" ? "#3c2818" : "#8fb7d6";
  const path =
    tone === "dragon"
      ? "M22 20 L4 6 L8 14 L2 13 L9 20 L3 22 L11 24 L7 30 Z"
      : "M22 20 C12 6 4 8 3 20 C7 16 12 17 15 21 C10 20 7 23 6 28 C11 23 16 22 22 22 Z";
  // Batch 12 — tier 6+ board-wide guarantee: the lead unfurls wings over the
  // WHOLE board — a tone-tinted wash while two colossal wings spring open
  // across the crop and a shock ring rolls past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color={tone === "dragon" ? "rgba(230,168,92,0.22)" : "rgba(206,226,240,0.28)"} delayMs={delayMs} />
        <span className="fx-sig-wing-l absolute left-[22%] top-[30%] block h-[40%] w-[28%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
            <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="fx-sig-wing-r absolute right-[22%] top-[30%] block h-[40%] w-[28%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
            <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 300} color={tone === "dragon" ? "rgba(230,168,92,0.85)" : "rgba(214,232,246,0.9)"} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wing-l absolute left-[4%] top-[22%] block h-[50%] w-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[4%] top-[22%] block h-[50%] w-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
          <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Summon Dragon: dragon wings sweep open with a burst of scale-shards. */
function DragonRiseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE DRAGON QUEEN ANSWERS: ember-light roars up out of the
  // board and a colossal crowned dragon rises over the crop, wings spread and
  // maw alight, her hatchling wheeling at her flank; scale-sparks and twin
  // ember shockwaves mark the summons.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(214,35,79,0.2)"
        rays="rgba(255,157,61,0.75)"
        boom="rgba(230,168,92,0.85)"
        flare="rgba(255,209,102,0.75)"
        sparkFill="#e6a85c"
        sparkStroke="#7a3a12"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* spread dragon wings */}
            <path d="M16 18 C9 12 4 12 1 16 C5 17 7 19 8 22 C10 20 13 19 16 20 Z" fill="rgba(214,35,79,0.8)" stroke="#5a1512" strokeWidth="1" strokeLinejoin="round" />
            <path d="M28 18 C35 12 40 12 43 16 C39 17 37 19 36 22 C34 20 31 19 28 20 Z" fill="rgba(214,35,79,0.8)" stroke="#5a1512" strokeWidth="1" strokeLinejoin="round" />
            {/* crowned head + serpentine neck and body */}
            <path d="M20 8 L21 4 L23 7 L25 3.5 L26.5 7 L28 5 L28 9 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M20 12 C20 9.5 22 8.5 24 9 C27 9.8 28 12 27 14 L30 15 L26.5 16.5 C24 17 21.5 16 20.5 14 Z" fill="rgba(138,90,56,0.95)" stroke="#3c2818" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="24.5" cy="12" r="0.9" fill="#ffd166" />
            <path d="M21 16 C16 20 15 27 17 33 C18.5 38 22 41 27 42 C24 38 23 34 24 29 C25 24 25 19 23 16 Z" fill="rgba(138,90,56,0.9)" stroke="#3c2818" strokeWidth="1" strokeLinejoin="round" />
            {/* fire licking from the maw */}
            <path d="M30 15 C33 14.5 35 15.5 36.5 18 C34.5 17.8 33 18.5 32 20" fill="none" stroke="#ff9d3d" strokeWidth="1.3" strokeLinecap="round" />
            {/* the hatchling at her flank */}
            <path d="M8 30 C6.5 28 4.5 28 3.5 29.5 C5 30 5.8 31 6 32.5 C7 31.5 8 31 9.5 31.2 L12 32 C10.5 33.5 10.5 35.5 12 37 C12.5 34.5 14 33 16 32.5 L13 30.5 C11.5 29.5 9.8 29.5 8 30 Z" fill="rgba(214,35,79,0.7)" stroke="#5a1512" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <>
      <WingsBurst tone="dragon" lead={lead} delayMs={delayMs} />
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <ShardBurst vectors={BURST_MED} fill="#8a5a38" stroke="#3c2818" delayMs={delayMs + 120} sizePct={11} />
      </span>
    </>
  );
}

/** Starfall: a meteor streaks in from the corner, cracks down, throws embers. */
function MeteorBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(230,168,92,0.24)" boom="rgba(230,168,92,0.85)" delayMs={delayMs} motifClass="fx-sig-streak">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L26 26" stroke="#e6a85c" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 4 L26 22" stroke="#ffd95e" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="28" cy="28" r="5" fill="#d98a4a" stroke="#7a3a12" strokeWidth="1.2" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-6%] block h-[68%] w-[68%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L26 26" stroke="#e6a85c" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 4 L26 22" stroke="#ffd95e" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="28" cy="28" r="5" fill="#d98a4a" stroke="#7a3a12" strokeWidth="1.2" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 260} sizePct={11} />
    </span>
  );
}

/** Raise Dead / Army of the Dead: bony hands and grave dirt heave up. */
function GraveHandsBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead raises the WHOLE
  // graveyard — a deathly wash over the crop while ranks of bony hands heave
  // up along the central band under drifting grave dust.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(60,64,52,0.34)" delayMs={delayMs} />
        {[
          { l: "28%", d: 0 },
          { l: "42%", d: 140 },
          { l: "56%", d: 60 },
          { l: "66%", d: 220 },
        ].map((h, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[26%] block h-[22%] w-[9%]" style={{ left: h.l, animationDelay: `${delayMs + h.d}ms` }}>
            <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
              <g fill="rgba(206,216,200,0.85)" stroke="#5a6155" strokeWidth="0.8" strokeLinejoin="round">
                <path d="M10 40 L10 22 L8 22 L8 30 M13 40 L13 18 L11 18 L11 28 M16 40 L16 20 L14 20 L14 30" />
                <path d="M26 40 L26 20 L24 20 L24 30 M29 40 L29 22 L27 22 L27 30 M32 40 L32 24 L30 24 L30 32" />
              </g>
            </svg>
          </span>
        ))}
        <span className="fx-sig-ash absolute left-[30%] bottom-[24%] block h-[8%] w-[40%] rounded-full" style={{ background: "rgba(90,84,72,0.5)", animationDelay: `${delayMs + 260}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[22%] bottom-[6%] block h-[56%] w-[56%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g fill="rgba(206,216,200,0.85)" stroke="#5a6155" strokeWidth="0.8" strokeLinejoin="round">
            <path d="M10 40 L10 22 L8 22 L8 30 M13 40 L13 18 L11 18 L11 28 M16 40 L16 20 L14 20 L14 30" />
            <path d="M26 40 L26 20 L24 20 L24 30 M29 40 L29 22 L27 22 L27 30 M32 40 L32 24 L30 24 L30 32" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[24%] bottom-[8%] block h-[16%] rounded-full" style={{ background: "rgba(90,84,72,0.55)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

/** Hallowed Return / Divine Intervention: a shaft of holy light and a halo. */
const HOLY_SHAFTS = [
  { l: "33%", w: "8%", d: 0 },
  { l: "45%", w: "11%", d: 90 },
  { l: "59%", w: "8%", d: 180 },
];
function HolyLightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE INTERVENTION: the clouds part in three warm shafts and
  // a dove of light descends to the board's heart inside a settling halo; one
  // gold shockwave carries the blessing out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,242,192,0.26)" delayMs={delayMs} />
        {/* the parted-cloud shafts */}
        {HOLY_SHAFTS.map((s, i) => (
          <span
            key={i}
            className="fx-sig-shaft absolute top-[6%] block h-[58%]"
            style={{
              left: s.l,
              width: s.w,
              background: "linear-gradient(180deg, rgba(255,242,192,0.85), rgba(255,214,106,0.2) 70%, transparent)",
              animationDelay: `${delayMs + s.d}ms`,
            }}
          />
        ))}
        {/* the descending dove of light */}
        <span className="fx-sig-crown absolute left-[42%] top-[34%] block h-[14%] w-[16%]" style={{ animationDelay: `${delayMs + 300}ms` }}>
          <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
            <path d="M11 8 C7 4 3 3.4 0.8 5 C4 6.2 6 8 7.6 10.4 Z" fill="rgba(255,252,240,0.95)" stroke="#c9a244" strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M13 8 C17 4 21 3.4 23.2 5 C20 6.2 18 8 16.4 10.4 Z" fill="rgba(255,252,240,0.95)" stroke="#c9a244" strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M12 5.6 C13.6 5.6 14.6 6.8 14.4 8.4 L13 12.6 L12 15 L11 12.6 L9.6 8.4 C9.4 6.8 10.4 5.6 12 5.6 Z" fill="#fffcf0" stroke="#c9a244" strokeWidth="0.7" strokeLinejoin="round" />
            <circle cx="12" cy="4.6" r="1.6" fill="#fffcf0" stroke="#c9a244" strokeWidth="0.6" />
          </svg>
        </span>
        {/* the halo settling around the touch point */}
        <span
          className="fx-sig-ring absolute left-[39%] top-[40%] block h-[16%] w-[22%] rounded-full"
          style={{ border: "2px solid rgba(255,220,130,0.9)", animationDelay: `${delayMs + 620}ms` }}
        />
        <span
          className="fx-sig-flash absolute left-[43%] top-[44%] block h-[10%] w-[14%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,252,240,0.9), transparent 70%)", animationDelay: `${delayMs + 660}ms` }}
        />
        <BoardBoom delayMs={delayMs + 720} color="rgba(255,220,130,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[36%] top-0 block h-[82%] w-[28%]"
        style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#fff2c0" stroke="#c9a244" delayMs={delayMs + 120} sizePct={10} />
    </span>
  );
}

const ICEWALL_BLOCKS = [
  { bottom: "8%", d: 0 },
  { bottom: "30%", d: 70 },
  { bottom: "52%", d: 140 },
  { bottom: "74%", d: 210 },
];

/** Frost Wall: a column of blue ice blocks erupts up the file. */
function IceWallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead raises the glacier
  // across the WHOLE board — an icy wash while a rampart of ice blocks stacks
  // up along the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(176,220,245,0.26)" delayMs={delayMs} />
        {[
          { l: "26%", d: 0 },
          { l: "36%", d: 90 },
          { l: "46%", d: 180 },
          { l: "56%", d: 270 },
          { l: "66%", d: 360 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-brick absolute bottom-[34%] block h-[14%] w-[9%] rounded-[2px]" style={{ left: b.l, background: "rgba(176,220,245,0.55)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs + b.d}ms` }} />
        ))}
        <BoardBoom delayMs={delayMs + 420} color="rgba(224,246,255,0.9)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {ICEWALL_BLOCKS.map((b, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute inset-x-[24%] block h-[22%] rounded-[1px]"
          style={{ bottom: b.bottom, background: "rgba(176,220,245,0.5)", border: "1px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs + b.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Wall of Thorns: a bramble of barbed thorns bursts up from the ground. */
function ThornWallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead overgrows the WHOLE
  // board — a verdant wash while a colossal bramble of barbed thorns bursts up
  // across the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(74,107,58,0.26)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[24%] bottom-[26%] block h-[38%] w-[52%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <g stroke="#4a6b3a" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M4 40 L8 6 M14 40 L12 4 M22 40 L20 8 M30 40 L32 5 M37 40 L35 9" />
            </g>
            <g fill="#6b8a4a" stroke="#33481f" strokeWidth="0.6" strokeLinejoin="round">
              <polygon points="8,10 4,14 10,14" />
              <polygon points="12,8 8,12 16,12" />
              <polygon points="20,12 16,16 23,15" />
              <polygon points="32,9 28,13 35,13" />
              <polygon points="35,18 31,21 38,22" />
              <polygon points="12,20 7,23 14,24" />
              <polygon points="22,22 26,26 19,27" />
            </g>
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[12%] bottom-[6%] block h-[66%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <g stroke="#4a6b3a" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path d="M8 40 L12 6 M20 40 L18 4 M32 40 L28 8" />
          </g>
          <g fill="#6b8a4a" stroke="#33481f" strokeWidth="0.6" strokeLinejoin="round">
            <polygon points="12,10 8,14 14,14" />
            <polygon points="18,8 14,12 22,12" />
            <polygon points="28,12 24,16 31,15" />
            <polygon points="12,20 7,23 14,24" />
            <polygon points="18,18 22,22 15,23" />
          </g>
        </svg>
      </span>
    </span>
  );
}

// --- Regalia / movement grants -----------------------------------------------

/** Excalibur: a radiant blade descends point-down and plants on the bishop. */
function BladeGiftBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(200,224,240,0.24)" boom="rgba(227,237,245,0.85)" delayMs={delayMs} motifClass="fx-sig-cage">
        <svg viewBox="0 0 12 34" className="h-full w-full" aria-hidden="true">
          <polygon points="6,0 8,20 6,26 4,20" fill="#e3edf5" stroke="#7a8b98" strokeWidth="0.8" strokeLinejoin="round" />
          <rect x="1" y="19.5" width="10" height="2.4" rx="0.5" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
          <rect x="5" y="22" width="2" height="8" fill="#8a6a3a" />
          <circle cx="6" cy="31" r="1.6" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[42%] top-0 block h-[62%] w-[16%]"
        style={{ background: "rgba(200,224,240,0.5)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-cage absolute left-[38%] top-[8%] block h-[64%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 34" className="h-full w-full" aria-hidden="true">
          <polygon points="6,0 8,20 6,26 4,20" fill="#e3edf5" stroke="#7a8b98" strokeWidth="0.8" strokeLinejoin="round" />
          <rect x="1" y="19.5" width="10" height="2.4" rx="0.5" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
          <rect x="5" y="22" width="2" height="8" fill="#8a6a3a" />
          <circle cx="6" cy="31" r="1.6" fill="#c79a48" stroke="#7a5b23" strokeWidth="0.6" />
        </svg>
      </span>
    </span>
  );
}

const WARHORN_DASHES = [
  { top: "34%", d: 0 },
  { top: "50%", d: 70 },
  { top: "66%", d: 140 },
];

/** Banner of War: the war banner runs up its pole with speed-dashes trailing. */
function WarhornBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(224,119,107,0.24)" boom="rgba(122,91,35,0.85)" delayMs={delayMs} motifClass="fx-sig-crown">
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M6 32 V2" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[34%] top-[4%] block h-[68%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M6 32 V2" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {WARHORN_DASHES.map((s, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute left-[10%] block h-[6%] w-[36%] rounded-[1px]"
          style={{ top: s.top, background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
    </span>
  );
}

// --- Fantasy removals (marquee attack cards) ---------------------------------

/** Dragon's Breath: a corridor of flame. Lead flashes at the rook's mouth; each
 * victim is a fireball flash, ember shatter, and scorch. */
function DragonFireBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE DRAGON'S EXHALE: a horned dragon head rears in from
  // the wing and breathes a two-tone fire cone the full width of the crop;
  // scorch smudges bloom along the lane before one amber shockwave rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,150,60,0.24)" delayMs={delayMs} />
        {/* the dragon head, rearing in from the left wing */}
        <span className="fx-sig-punch absolute left-[20%] top-[30%] block h-[24%] w-[18%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
          <svg viewBox="0 0 22 22" className="h-full w-full" aria-hidden="true">
            {/* neck off the edge, head, horns, open jaw */}
            <path d="M0 14 C4 11 7 9 10 8.6 L14 6.4 C16 5.4 18 6 19.4 7.6 L16.4 9.4 L21 11.4 L15.6 12.4 C15.2 14.6 13 16.4 10.4 16.2 L9 20 L6.6 17 C4 17.4 1.8 16.6 0 15 Z" fill="rgba(178,58,32,0.95)" stroke="#5a160a" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M14.6 5.8 C14.6 3.8 15.6 2.4 17.4 1.6 M17.6 6.4 C18.4 4.8 19.8 4 21.4 4.2" fill="none" stroke="#ffd166" strokeWidth="1" strokeLinecap="round" />
            <circle cx="15.4" cy="8.2" r="0.7" fill="#ffd166" />
          </svg>
        </span>
        {/* the fire cone, lancing the crop's width */}
        <span
          className="fx-sig-muzzle absolute left-[36%] top-[35%] block h-[18%] w-[42%] rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(255,150,60,0.95), rgba(230,67,44,0.6) 70%, transparent)", animationDelay: `${delayMs + 420}ms` }}
        />
        <span
          className="fx-sig-muzzle absolute left-[36%] top-[39%] block h-[10%] w-[34%] rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(255,224,150,0.95), transparent)", animationDelay: `${delayMs + 460}ms` }}
        />
        {/* scorch smudges along the burnt lane */}
        {[46, 58, 68].map((l, i) => (
          <span
            key={i}
            className="fx-sig-scorch absolute top-[40%] block h-[8%] w-[7%] rounded-full"
            style={{ left: `${l}%`, background: "rgba(26,16,8,0.6)", animationDelay: `${delayMs + 640 + i * 90}ms` }}
          />
        ))}
        <BoardBoom delayMs={delayMs + 700} color="rgba(255,180,84,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <ShardBurst vectors={BURST_BIG} fill="#ffb454" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 180}ms` }}
      />
    </span>
  );
}

/** Soul Harvest: a great scythe blade sweeps the diagonal; each reaped square
 * gives up a rising soul wisp. */
function ScytheBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE HARVESTER QUEEN: grave-violet light wells up out of
  // the board and a colossal crowned reaper rises over the crop, her great
  // scythe arcing across it while the reaped souls stream upward; the harvest
  // closes on a flare and twin spectral shockwaves.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(74,58,102,0.3)"
        rays="rgba(168,119,216,0.6)"
        boom="rgba(168,119,216,0.85)"
        flare="rgba(201,210,220,0.6)"
        sparkFill="#c9d2dc"
        sparkStroke="#5b6672"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the crowned reaper: hood, tattered robe */}
            <path d="M18 8 L19 4 L21 6.5 L23 3.5 L25 6.5 L27 4 L28 8 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
            <path d="M23 8 C19 8 17 11 17 15 C17 17 18 18.5 19.5 19.5 L18 26 H28 L26.5 19.5 C28 18.5 29 17 29 15 C29 11 27 8 23 8 Z" fill="rgba(42,32,60,0.92)" stroke="#a877d8" strokeWidth="1" strokeLinejoin="round" />
            <path d="M20.5 14 H22.5 M24 14 H26" stroke="#a877d8" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M15 44 C13 34 15 26 23 26 C31 26 33 34 31 44 C28.5 41 27 42 26 44 C24.5 41.5 22 41.5 20.5 44 C19.5 41.5 17.5 41 15 44 Z" fill="rgba(42,32,60,0.85)" stroke="#a877d8" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the great scythe, swung across the whole board */}
            <path d="M30 10 L36 40" stroke="#5b6672" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M30 10 C20 2 8 4 2 12 C11 8 21 10 28 16 Z" fill="#c9d2dc" stroke="#5b6672" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        }
      >
        {/* the reaped souls, streaming up out of the squares */}
        {[
          { l: "30%", d: 260 },
          { l: "48%", d: 380 },
          { l: "62%", d: 500 },
        ].map((w, i) => (
          <span key={i} className="fx-sig-ash absolute top-[38%] block h-[10%] w-[7%] rounded-full" style={{ left: w.l, background: "rgba(168,119,216,0.5)", animationDelay: `${delayMs + w.d}ms` }} />
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[2%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 C6 14 22 4 36 8 C24 10 14 20 14 34 Z" fill="#c9d2dc" stroke="#5b6672" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M12 34 L12 30" stroke="#5b6672" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="fx-sig-ash absolute left-[40%] top-[22%] block h-[26%] w-[20%] rounded-full"
        style={{ background: "rgba(168,119,216,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

/** Chain Lightning: a forked bolt leaps down the diagonal in strobed
 * after-images, throwing sparks at each arc point. */
function ArcLightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead forks the storm across
  // the WHOLE board — a pale charge wash while a colossal strobed bolt leaps
  // the crop diagonally and sparks scatter from the arc.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,246,200,0.24)" delayMs={delayMs} />
        <span className="fx-sig-afterimage absolute inset-[24%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <polygon points="6,4 18,14 12,16 26,26 20,26 34,38 22,30 27,29 13,19 19,18 6,8" fill="#fff6c8" stroke="#e6b800" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <ShardBurst vectors={BURST_MED} fill="#ffe98a" stroke="#8a6414" delayMs={delayMs + 220} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[8%] top-[6%] block h-[80%] w-[80%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <polygon points="6,4 18,14 12,16 26,26 20,26 34,38 22,30 27,29 13,19 19,18 6,8" fill="#fff6c8" stroke="#e6b800" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffe98a" stroke="#8a6414" delayMs={delayMs + 120} sizePct={10} />
    </span>
  );
}

/** Wyvern's Dive: a talon strike streaks in from above with slash lines. */
function DiveBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-8%] block h-[70%] w-[70%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 C16 8 24 16 30 30 L26 24 L28 30 L22 27" fill="none" stroke="#5a4636" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-afterimage absolute left-[26%] top-[26%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#e3ecf4" strokeWidth="2" strokeLinecap="round">
            <path d="M6 12 L30 20 M4 22 L26 32 M14 6 L26 28" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#5b6672" delayMs={delayMs + 180} sizePct={10} />
    </span>
  );
}

/** Judgment Day / Heaven's Wrath: a pillar of holy light slams a named piece
 * off the board with a radiant shock and scorch. */
function SmiteBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE ARBITER OF HEAVEN: gold rays split the sky and a
    // colossal blindfolded arbiter angel descends out of the storm cloud,
    // three wrath-bolts stabbing down from its raised hand before the radiant
    // flare and twin judgment shockwaves.
    return (
      <GodEvent
        wash="rgba(255,246,200,0.24)"
        rays="rgba(255,232,150,0.85)"
        boom="rgba(255,232,150,0.85)"
        flare="rgba(255,246,200,0.8)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the storm cloud it steps out of */}
            <path d="M8 12 C8 6 14 3 19 5 C21 1 29 1 31 5 C37 3 42 8 40 13 C38 16 34 17 30 16 L14 16 C10 16 8 15 8 12 Z" fill="rgba(58,66,88,0.9)" stroke="#b9c4d6" strokeWidth="1.2" strokeLinejoin="round" />
            {/* the blindfolded arbiter: halo, bound eyes, robed */}
            <circle cx="22" cy="19" r="5.5" fill="none" stroke="#ffe896" strokeWidth="1.2" />
            <circle cx="22" cy="19" r="2.8" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.7" />
            <path d="M19 18.4 H25" stroke="#3a4258" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M22 22 C19 22 17.5 24.5 17 27.5 L15 40 H29 L27 27.5 C26.5 24.5 25 22 22 22 Z" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the raised hand of judgment + three wrath-bolts */}
            <path d="M27 25 L33 20" stroke="#b98a2e" strokeWidth="1.6" strokeLinecap="round" />
            <g fill="#ffe896" stroke="#8a6414" strokeWidth="0.7" strokeLinejoin="round">
              <path d="M10 22 L14 29 L11.5 29.5 L16 38 L8.5 31 L11 30.5 Z" />
              <path d="M33 21 L37 28 L34.5 28.5 L39 37 L31.5 30 L34 29.5 Z" />
              <path d="M20 42 L22 36 L24 42 Z" />
            </g>
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-shaft absolute left-[34%] top-0 block h-[94%] w-[32%]"
        style={{ background: "rgba(255,246,200,0.68)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ring absolute inset-[22%] block rounded-full"
        style={{ border: "1.5px solid rgba(255,232,150,0.9)", animationDelay: `${delayMs + 120}ms` }}
      />
      <span
        className="fx-sig-scorch absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(30,22,10,0.6)", animationDelay: `${delayMs + 180}ms` }}
      />
    </span>
  );
}

/** Divine Reckoning: a gilded court decree stamps down over the enemy ranks. */
function DecreeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(40,52,72,0.24)" boom="rgba(230,191,106,0.85)" delayMs={delayMs} motifClass="fx-sig-snooze">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 8 V32 M12 14 H28 M14 32 H26" stroke="#e6bf6a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M12 14 L9 22 H15 Z M28 14 L25 22 H31 Z" fill="rgba(226,196,106,0.5)" stroke="#e6bf6a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-snooze absolute left-[18%] top-[22%] block h-[54%] w-[64%] rounded-full"
        style={{ background: "rgba(40,52,72,0.9)", border: "1.5px solid rgba(226,196,106,0.9)", animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 8 V32 M12 14 H28 M14 32 H26" stroke="#e6bf6a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M12 14 L9 22 H15 Z M28 14 L25 22 H31 Z" fill="rgba(226,196,106,0.5)" stroke="#e6bf6a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

// --- 10d. Batch 4 signature visuals (WILD set + Computer Virus) --------------
// Same rules as Batch 1-3: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow halos, 1px corners), hidden
// under reduced motion. Removal-sourced spectacles render off the detonation
// diff; the effect-data-sourced ones join the inert-until-wired Batch 2/3 set.
// Almost everything composes existing fx-sig-* classes; only fx-sig-glitch is
// genuinely new. Coral / mint / sun accents plus theme colours.

/** Immolation / Conflagration: flame tongues leap up, an ember shatter, scorch. */
function InfernoBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead sets the WHOLE board
  // alight — an ember wash while great flame tongues leap up along the central
  // band and a fire ring rolls past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,110,60,0.24)" delayMs={delayMs} />
        {[
          { l: "28%", w: "12%", d: 0 },
          { l: "44%", w: "14%", d: 130 },
          { l: "60%", w: "11%", d: 260 },
        ].map((f, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[26%] block h-[34%]" style={{ left: f.l, width: f.w, animationDelay: `${delayMs + f.d}ms` }}>
            <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M20 40 C9 30 15 22 12 11 C18 17 17 7 20 2 C23 9 25 16 28 11 C25 22 31 30 20 40 Z" fill="rgba(230,110,60,0.85)" stroke="#7a3a12" strokeWidth="1" strokeLinejoin="round" />
              <path d="M20 40 C15 32 18 24 20 15 C22 24 25 32 20 40 Z" fill="rgba(255,214,120,0.9)" />
            </svg>
          </span>
        ))}
        <BoardBoom delayMs={delayMs + 340} color="rgba(255,168,80,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[16%] bottom-[6%] top-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C9 30 15 22 12 11 C18 17 17 7 20 2 C23 9 25 16 28 11 C25 22 31 30 20 40 Z" fill="rgba(230,110,60,0.85)" stroke="#7a3a12" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 40 C15 32 18 24 20 15 C22 24 25 32 20 40 Z" fill="rgba(255,214,120,0.9)" />
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(255,168,80,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={11} />
      <span className="fx-sig-scorch absolute inset-[28%] block rounded-full" style={{ background: "rgba(26,16,8,0.7)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Hellfire Beam: the fiercest fire spectacle. Lead double-flashes at the
 * queen's mouth; each victim is a red-gold fireball, a wide ember shatter, and
 * a deep scorch. */
function HellfireBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the beam's ignition now torches the
  // WHOLE crop — a red-hot wash, a colossal core flash mid-board, and twin
  // fire rings rolling past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(226,60,40,0.26)" delayMs={delayMs} />
        <span className="fx-sig-flash absolute inset-[38%] block rounded-full" style={{ background: "rgba(226,60,40,0.8)", animationDelay: `${delayMs + 60}ms` }} />
        <BoardBoom delayMs={delayMs + 200} color="rgba(255,150,60,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 340} color="rgba(255,214,120,0.8)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[12%] block rounded-full" style={{ background: "rgba(226,72,44,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,214,120,0.9)", animationDelay: `${delayMs + 40}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#ff8a3c" stroke="#7a2410" delayMs={delayMs} sizePct={13} />
      <span className="fx-sig-scorch absolute inset-[24%] block rounded-full" style={{ background: "rgba(24,10,6,0.75)", animationDelay: `${delayMs + 180}ms` }} />
    </span>
  );
}

const HAIL_DROPS = [
  { left: "18%", w: "16%", d: 0 },
  { left: "44%", w: "13%", d: 80 },
  { left: "64%", w: "15%", d: 150 },
  { left: "34%", w: "12%", d: 210 },
];

/** Hailstorm: ice pellets rain down through the square and a frost glaze sets. */
function HailstormBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {HAIL_DROPS.map((h, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[22%]" style={{ left: h.left, width: h.w, animationDelay: `${delayMs + h.d}ms` }}>
          <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
            <polygon points="6,0 11,7 6,16 1,7" fill="rgba(224,246,255,0.85)" stroke="#7fb8dd" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-frost absolute inset-x-[8%] bottom-[8%] block h-[26%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

const BLIZ_FLAKES = [
  { left: "16%", w: "12%", d: 0 },
  { left: "40%", w: "10%", d: 70 },
  { left: "60%", w: "13%", d: 40 },
  { left: "30%", w: "9%", d: 130 },
  { left: "70%", w: "10%", d: 100 },
];

/** Whiteout: a blizzard swirls and whites out the king, snow driving past. */
function BlizzardBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE NORTH WIND HIMSELF: white rays crack the sky and a
    // colossal cloud-bearded wind god leans over the board, cheeks full,
    // blowing the whiteout across the crop in driving streaks.
    return (
      <GodEvent
        wash="rgba(224,244,255,0.26)"
        rays="rgba(234,248,255,0.85)"
        boom="rgba(234,248,255,0.85)"
        flare="rgba(240,250,255,0.75)"
        sparkFill="#eaf8ff"
        sparkStroke="#82bcdf"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the wind god's cloud head, brows knit, cheeks blown */}
            <path d="M8 18 C4 18 2 13 6 10 C5 5 12 2 16 5 C19 0 28 0 30 5 C36 3 40 8 37 13 C39 16 36 20 32 19 C30 24 22 26 17 23 C13 25 8 23 8 18 Z" fill="rgba(224,244,255,0.85)" stroke="#82bcdf" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M14 10 H17.5 M24 10 H27.5" stroke="#3f6f9f" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M19 16 C20 15 22 15 23 16" stroke="#3f6f9f" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* the gale, driven out of pursed lips */}
            <path d="M21 20 C21 22 23 23 26 23" stroke="#82bcdf" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <g stroke="rgba(234,248,255,0.95)" strokeWidth="1.8" strokeLinecap="round" fill="none">
              <path d="M24 26 C30 25 35 26 40 30 M20 30 C27 30 33 32 37 37 M23 35 C28 35 32 37 34 41" />
            </g>
            {/* driven snow */}
            <circle cx="38" cy="26" r="1.3" fill="rgba(234,248,255,0.95)" />
            <circle cx="41" cy="34" r="1.1" fill="rgba(234,248,255,0.9)" />
            <circle cx="36" cy="41" r="1.2" fill="rgba(234,248,255,0.9)" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[10%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 C30 8 32 20 20 24 C10 27 8 16 18 14 C24 13 25 19 20 20" fill="none" stroke="rgba(224,244,255,0.8)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {BLIZ_FLAKES.map((f, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[16%]" style={{ left: f.left, width: f.w, animationDelay: `${delayMs + f.d}ms` }}>
          <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.4" fill="rgba(234,248,255,0.9)" />
          </svg>
        </span>
      ))}
    </span>
  );
}

/** Stone Soldiers: a carved stone figure heaves up out of the bedrock. */
function StoneRiseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[26%] bottom-[6%] block h-[64%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <g fill="rgba(140,140,146,0.9)" stroke="#5a5a60" strokeWidth="0.8" strokeLinejoin="round">
            <rect x="8" y="2" width="8" height="8" rx="0.5" />
            <rect x="5" y="11" width="14" height="12" rx="0.5" />
            <rect x="6" y="24" width="5" height="8" rx="0.5" />
            <rect x="13" y="24" width="5" height="8" rx="0.5" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[20%] bottom-[6%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.55)", animationDelay: `${delayMs + 90}ms` }} />
    </span>
  );
}

/** Mountain Range: a ridge of jagged, snow-capped rock heaves up. */
function MountainWallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead heaves the WHOLE range
  // up — a dust wash while a colossal snow-capped ridge rises across the crop.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(120,110,98,0.28)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[22%] bottom-[28%] block h-[34%] w-[56%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 40 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <polygon points="0,30 8,10 14,18 22,4 30,16 40,8 40,30" fill="rgba(120,110,98,0.9)" stroke="#4a443c" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="22,4 18,12 26,12" fill="rgba(224,236,240,0.7)" />
            <polygon points="8,10 5,16 12,16" fill="rgba(224,236,240,0.6)" />
            <polygon points="40,8 36,14 40,14" fill="rgba(224,236,240,0.6)" />
          </svg>
        </span>
        <span className="fx-sig-ash absolute left-[30%] bottom-[26%] block h-[7%] w-[40%] rounded-full" style={{ background: "rgba(120,112,102,0.5)", animationDelay: `${delayMs + 260}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[4%] bottom-[8%] block h-[66%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <polygon points="0,30 8,10 14,18 22,4 30,16 40,8 40,30" fill="rgba(120,110,98,0.9)" stroke="#4a443c" strokeWidth="1" strokeLinejoin="round" />
          <polygon points="22,4 18,12 26,12" fill="rgba(224,236,240,0.7)" />
          <polygon points="8,10 5,16 12,16" fill="rgba(224,236,240,0.6)" />
        </svg>
      </span>
    </span>
  );
}

const ROCK_DROPS = [
  { left: "22%", w: "26%", d: 0 },
  { left: "52%", w: "20%", d: 90 },
  { left: "38%", w: "16%", d: 170 },
];

/** Landslide: boulders crash down and burst into rubble with a dust cloud. */
function RockfallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE MOUNTAIN WAKES: dust-light heaves up out of the board
  // and a colossal mountain titan shoulders over the crop, hurling boulders
  // down the central band; the slope lands with a flare and twin rubble rings.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(120,112,102,0.3)"
        rays="rgba(178,168,150,0.6)"
        boom="rgba(138,132,120,0.85)"
        flare="rgba(178,168,150,0.7)"
        sparkFill="#8a8478"
        sparkStroke="#4a443c"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the mountain titan: peak-crowned head, ridge shoulders */}
            <path d="M20 2 L26 12 L23 12 L28 20 H12 L17 12 L14 12 Z" fill="rgba(224,236,240,0.75)" stroke="#4a443c" strokeWidth="1" strokeLinejoin="round" />
            <path d="M8 44 L4 30 C4 24 8 20 14 19 H26 C32 20 36 24 36 30 L32 44 Z" fill="rgba(120,110,98,0.9)" stroke="#4a443c" strokeWidth="1.2" strokeLinejoin="round" />
            {/* craggy eyes + seams */}
            <path d="M15 26 H18 M22 26 H25" stroke="#e6bf6a" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 34 L17 30 M28 34 L23 30 M20 24 V40" stroke="rgba(74,68,60,0.75)" strokeWidth="0.8" fill="none" />
            {/* a hurled boulder in its fist */}
            <path d="M33 22 L39 17" stroke="rgba(120,110,98,0.95)" strokeWidth="2.4" strokeLinecap="round" />
            <polygon points="39,12 43,14.5 42.5,19 38,20 35.5,16 37,13" fill="rgba(128,122,112,0.95)" stroke="#4a443c" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        }
      >
        <BoardRain
          delayMs={delayMs + 80}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <polygon points="6,0 11,3 10,9 4,11 1,6 2,2" fill="rgba(128,122,112,0.9)" stroke="#4a443c" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {ROCK_DROPS.map((r, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[28%]" style={{ left: r.left, width: r.w, animationDelay: `${delayMs + r.d}ms` }}>
          <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
            <polygon points="6,0 11,3 10,9 4,11 1,6 2,2" fill="rgba(128,122,112,0.9)" stroke="#4a443c" strokeWidth="0.7" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#4a443c" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-ash absolute inset-x-[20%] bottom-[8%] block h-[18%] rounded-full" style={{ background: "rgba(120,112,102,0.55)", animationDelay: `${delayMs + 200}ms` }} />
    </span>
  );
}

/** Thunderhead: a charged storm cloud forms and cracks a small bolt. */
function StormCloudBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[10%] top-[16%] block h-[46%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 24" className="h-full w-full" aria-hidden="true">
          <path d="M8 20 C2 20 2 12 9 12 C9 5 20 4 22 10 C30 6 38 12 33 18 C36 22 30 20 28 20 Z" fill="rgba(90,96,110,0.9)" stroke="#2f3540" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-afterimage absolute left-[42%] top-[46%] block h-[42%] w-[24%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <JagBolt />
      </span>
      <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(255,246,200,0.7)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Bayonet Charge / Spearhead: a lance drives in with an impact splat. Lead
 * cries out with a war-shout muzzle flash. */
function SpearChargeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the war-shout now carries over the
  // WHOLE line — a brass wash while the rallying flash lances the full crop
  // width and a charge ring rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(226,196,106,0.22)" delayMs={delayMs} />
        <span className="fx-sig-muzzle absolute left-[22%] top-[45%] block h-[10%] w-[56%] rounded-full" style={{ background: "rgba(226,196,106,0.9)", animationDelay: `${delayMs}ms` }} />
        <BoardBoom delayMs={delayMs + 220} color="rgba(226,196,106,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-4%] top-[-4%] block h-[72%] w-[72%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L28 28" stroke="#8a7048" strokeWidth="2.6" strokeLinecap="round" />
          <polygon points="24,20 34,34 20,24" fill="#c9d2dc" stroke="#5b6672" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#5b6672" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-splat absolute inset-x-[24%] top-[40%] block h-[26%] rounded-full" style={{ background: "rgba(150,146,140,0.8)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

/** Armored Breakthrough: an armored hull rolls through with treads and debris. */
function TankRollBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead sends the armor through
  // the WHOLE line — a dust wash while a colossal hull lunges across the crop
  // over churned tread scars.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(96,104,88,0.26)" delayMs={delayMs} />
        <span className="fx-sig-gallop absolute left-[24%] top-[36%] block h-[24%] w-[46%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden="true">
            <rect x="4" y="8" width="30" height="7" rx="1" fill="rgba(96,104,88,0.9)" stroke="#33402b" strokeWidth="1" />
            <rect x="12" y="3" width="14" height="5" rx="1" fill="rgba(112,120,100,0.9)" stroke="#33402b" strokeWidth="1" />
            <rect x="24" y="4" width="14" height="2" rx="1" fill="rgba(112,120,100,0.9)" />
            <g fill="#2a3323">
              <circle cx="9" cy="16" r="2.4" />
              <circle cx="17" cy="16" r="2.4" />
              <circle cx="25" cy="16" r="2.4" />
              <circle cx="32" cy="16" r="2.4" />
            </g>
          </svg>
        </span>
        {[
          { t: "62%", d: 160 },
          { t: "66%", d: 240 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-sweepbar absolute left-[-30%] block h-[1.6%] w-[160%] rounded-[1px]" style={{ top: b.t, background: "rgba(42,51,35,0.55)", animationDelay: `${delayMs + b.d}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[6%] top-[26%] block h-[48%] w-[84%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden="true">
          <rect x="4" y="8" width="30" height="7" rx="1" fill="rgba(96,104,88,0.9)" stroke="#33402b" strokeWidth="1" />
          <rect x="12" y="3" width="14" height="5" rx="1" fill="rgba(112,120,100,0.9)" stroke="#33402b" strokeWidth="1" />
          <rect x="24" y="4" width="14" height="2" rx="1" fill="rgba(112,120,100,0.9)" />
          <g fill="#2a3323">
            <circle cx="9" cy="16" r="2.4" />
            <circle cx="17" cy="16" r="2.4" />
            <circle cx="25" cy="16" r="2.4" />
            <circle cx="32" cy="16" r="2.4" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#33402b" delayMs={delayMs + 120} sizePct={10} />
      <span className="fx-sig-scorch absolute inset-x-[16%] bottom-[16%] block h-[16%] rounded-[1px]" style={{ background: "rgba(30,26,18,0.6)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

const SHELL_DROPS = [
  { left: "30%", w: "16%", d: 0 },
  { left: "54%", w: "13%", d: 120 },
];

/** Bombardment / Counter Battery: a shell whistles down and cracks a crater. */
function ArtilleryBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead opens the barrage on
  // the WHOLE grid — a smoke wash while shells whistle down the central band
  // and a blast ring rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(90,96,88,0.26)" delayMs={delayMs} />
        <BoardRain
          delayMs={delayMs + 60}
          render={() => (
            <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 C8 3 8 6 8 10 L8 14 L2 14 L2 10 C2 6 2 3 5 0 Z" fill="rgba(90,96,88,0.9)" stroke="#2f3530" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
        <BoardBoom delayMs={delayMs + 300} color="rgba(255,200,120,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {SHELL_DROPS.map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[24%]" style={{ left: s.left, width: s.w, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 C8 3 8 6 8 10 L8 14 L2 14 L2 10 C2 6 2 3 5 0 Z" fill="rgba(90,96,88,0.9)" stroke="#2f3530" strokeWidth="0.7" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,200,120,0.8)", animationDelay: `${delayMs + 130}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#9a948a" stroke="#3a352c" delayMs={delayMs + 150} sizePct={10} />
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(24,18,12,0.65)", animationDelay: `${delayMs + 210}ms` }} />
    </span>
  );
}

/** Combined Arms / Muster / Forward Outpost: a war banner plants with dust as
 * fresh troops arrive. */
function ReinforceBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead musters the WHOLE
  // front — a mint wash while war banners plant across the central band in a
  // rolling rally and dust kicks along the line.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(126,181,154,0.22)" delayMs={delayMs} />
        {[
          { l: "30%", d: 0 },
          { l: "46%", d: 150 },
          { l: "62%", d: 300 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[28%] block h-[26%] w-[8%]" style={{ left: b.l, animationDelay: `${delayMs + b.d}ms` }}>
            <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
              <path d="M6 32 V2" stroke="#5a4a2a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
              <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="rgba(126,181,154,0.9)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </span>
        ))}
        <span className="fx-sig-ash absolute left-[30%] bottom-[26%] block h-[7%] w-[40%] rounded-full" style={{ background: "rgba(120,116,110,0.45)", animationDelay: `${delayMs + 340}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[32%] bottom-[8%] block h-[70%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M6 32 V2" stroke="#5a4a2a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="rgba(126,181,154,0.9)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[22%] bottom-[6%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 90}ms` }} />
    </span>
  );
}

const CHUTE_DROPS = [
  { left: "20%", w: "30%", d: 0 },
  { left: "50%", w: "26%", d: 120 },
];

/** Paratroopers: parachutes descend behind the lines. */
function ParadropBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead fills the WHOLE sky —
  // a pale wash while parachutes rain down across the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(168,180,196,0.22)" delayMs={delayMs} />
        <BoardRain
          delayMs={delayMs + 80}
          render={() => (
            <svg viewBox="0 0 20 24" className="h-full w-full" aria-hidden="true">
              <path d="M1 9 A9 9 0 0 1 19 9 Z" fill="rgba(126,181,154,0.85)" stroke="#2f4a3c" strokeWidth="0.9" strokeLinejoin="round" />
              <path d="M1 9 L10 16 L19 9 M7 9 L10 16 M13 9 L10 16" stroke="#2f4a3c" strokeWidth="0.7" fill="none" />
              <circle cx="10" cy="19" r="2.2" fill="rgba(96,104,88,0.95)" stroke="#2f3530" strokeWidth="0.6" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {CHUTE_DROPS.map((c, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-0 block h-[40%]" style={{ left: c.left, width: c.w, animationDelay: `${delayMs + c.d}ms` }}>
          <svg viewBox="0 0 20 24" className="h-full w-full" aria-hidden="true">
            <path d="M1 9 A9 9 0 0 1 19 9 Z" fill="rgba(126,181,154,0.85)" stroke="#2f4a3c" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M1 9 L10 16 L19 9 M7 9 L10 16 M13 9 L10 16" stroke="#2f4a3c" strokeWidth="0.7" fill="none" />
            <circle cx="10" cy="19" r="2.2" fill="rgba(96,104,88,0.95)" stroke="#2f3530" strokeWidth="0.6" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const SUPPRESS_TRACERS = [
  { top: "30%", d: 0 },
  { top: "50%", d: 60 },
  { top: "68%", d: 120 },
];

/** Suppressive Fire: tracer streaks rake across and pin the target down. */
function SuppressBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {SUPPRESS_TRACERS.map((t, i) => (
        <span key={i} className="fx-sig-afterimage absolute left-[6%] block h-[5%] w-[80%] rounded-[1px]" style={{ top: t.top, background: "rgba(226,196,106,0.85)", animationDelay: `${delayMs + t.d}ms` }} />
      ))}
      <span className="fx-sig-flash absolute left-[4%] top-[42%] block h-[18%] w-[22%] rounded-full" style={{ background: "rgba(255,214,120,0.8)", animationDelay: `${delayMs}ms` }} />
    </span>
  );
}

/** Double Trench: a sandbag parapet stacks up and barbed wire strings across. */
function TrenchBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead digs in across the
  // WHOLE front — an earthen wash while a parapet bar stacks the full width of
  // the crop and barbed wire strings above it.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,132,90,0.24)" delayMs={delayMs} />
        <span className="fx-sig-brick absolute left-[22%] bottom-[40%] block h-[8%] w-[56%] rounded-[2px]" style={{ background: "rgba(150,132,90,0.9)", border: "1px solid rgba(80,66,38,0.85)", animationDelay: `${delayMs + 80}ms` }} />
        <span className="fx-sig-rise absolute left-[22%] bottom-[48%] block h-[9%] w-[56%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
          <svg viewBox="0 0 40 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 8 L40 8 M6 4 L9 12 M16 4 L19 12 M26 4 L29 12 M34 4 L37 12" stroke="#8a8478" strokeWidth="1" fill="none" strokeLinecap="round" />
            <g fill="#8a8478">
              <polygon points="4,8 6,6 8,8 6,10" />
              <polygon points="14,8 16,6 18,8 16,10" />
              <polygon points="24,8 26,6 28,8 26,10" />
              <polygon points="32,8 34,6 36,8 34,10" />
            </g>
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-brick absolute inset-x-[8%] bottom-[16%] block h-[24%] rounded-[1px]" style={{ background: "rgba(150,132,90,0.9)", border: "1px solid rgba(80,66,38,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute inset-x-[6%] bottom-[36%] block h-[26%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 40 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 8 L40 8 M8 4 L12 12 M20 4 L24 12 M32 4 L36 12" stroke="#8a8478" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <g fill="#8a8478">
            <polygon points="6,8 8,6 10,8 8,10" />
            <polygon points="18,8 20,6 22,8 20,10" />
            <polygon points="30,8 32,6 34,8 32,10" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Time Stop: a clock entombs the piece, its hands halted, a temporal ripple. */
function TimeStopBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="rgba(40,52,72,0.55)" stroke="#b9c4d6" strokeWidth="1.6" />
          <path d="M16 16 V6 M16 16 L23 19" stroke="#e8eef6" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="16" r="1.4" fill="#e8eef6" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[10%] block rounded-full" style={{ border: "1.5px solid rgba(185,196,214,0.85)", animationDelay: `${delayMs + 120}ms` }} />
      {lead && (
        <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(210,224,244,0.7)", animationDelay: `${delayMs}ms` }} />
      )}
    </span>
  );
}

const UNMAKE_VOXELS = [
  { left: "30%", top: "24%", w: "13%", c: "rgba(168,119,216,0.85)", d: 0 },
  { left: "54%", top: "30%", w: "11%", c: "rgba(140,96,200,0.8)", d: 50 },
  { left: "36%", top: "50%", w: "14%", c: "rgba(150,110,205,0.82)", d: 90 },
  { left: "56%", top: "52%", w: "10%", c: "rgba(120,86,180,0.8)", d: 40 },
  { left: "44%", top: "20%", w: "9%", c: "rgba(180,140,224,0.8)", d: 70 },
];

/** Unmake / Banish: reality unravels: the square dissolves into voxels that
 * scatter apart with an arcane flash. */
function UnmakeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead unravels the WHOLE
  // board — a violet wash while reality crumbles into scattered voxels across
  // the crop and an arcane ring rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(168,119,216,0.22)" delayMs={delayMs} />
        {[
          { l: "30%", t: "32%", w: "5%", c: "rgba(168,119,216,0.85)", d: 0 },
          { l: "54%", t: "38%", w: "4%", c: "rgba(140,96,200,0.8)", d: 90 },
          { l: "38%", t: "54%", w: "5.5%", c: "rgba(150,110,205,0.82)", d: 170 },
          { l: "60%", t: "56%", w: "4%", c: "rgba(120,86,180,0.8)", d: 60 },
          { l: "46%", t: "28%", w: "3.6%", c: "rgba(180,140,224,0.8)", d: 130 },
          { l: "26%", t: "48%", w: "4.4%", c: "rgba(160,120,210,0.8)", d: 220 },
        ].map((v, i) => (
          <span key={i} className="fx-sig-crumble absolute block rounded-[1px]" style={{ left: v.l, top: v.t, width: v.w, height: v.w, background: v.c, animationDelay: `${delayMs + v.d}ms` }} />
        ))}
        <BoardBoom delayMs={delayMs + 260} color="rgba(180,140,224,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(168,119,216,0.7)", animationDelay: `${delayMs}ms` }} />
      {UNMAKE_VOXELS.map((v, i) => (
        <span key={i} className="fx-sig-crumble absolute block rounded-[1px]" style={{ left: v.left, top: v.top, width: v.w, height: v.w, background: v.c, animationDelay: `${delayMs + v.d}ms` }} />
      ))}
      <ShardBurst vectors={BURST_MED} fill="#b48ce0" stroke="#5a3a86" delayMs={delayMs + 60} sizePct={10} />
    </span>
  );
}

/** Wrecking Ball: a great iron ball swings across on its chain, smashing the
 * piece to rubble. Lead is the impact flash. */
function WreckingBallBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(70,76,86,0.24)" boom="rgba(91,102,114,0.85)" delayMs={delayMs} motifClass="fx-sig-arc">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 2 L20 22" stroke="#5b6672" strokeWidth="1.6" strokeDasharray="2 2" fill="none" />
          <circle cx="20" cy="28" r="8" fill="rgba(70,76,86,0.92)" stroke="#23282f" strokeWidth="1.2" />
          <circle cx="17" cy="25" r="2" fill="rgba(150,158,168,0.6)" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[2%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 2 L20 22" stroke="#5b6672" strokeWidth="1.6" strokeDasharray="2 2" fill="none" />
          <circle cx="20" cy="28" r="8" fill="rgba(70,76,86,0.92)" stroke="#23282f" strokeWidth="1.2" />
          <circle cx="17" cy="25" r="2" fill="rgba(150,158,168,0.6)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8a8478" stroke="#3a352c" delayMs={delayMs + 140} sizePct={11} />
    </span>
  );
}

/** Pinata: a burst of confetti and candy in coral, mint, and sun. */
function PinataBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(255,246,200,0.75)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e0776b" stroke="#7a2f28" delayMs={delayMs} sizePct={11} />
      <ShardBurst vectors={BURST_MED} fill="#7eb59a" stroke="#2f4a3c" delayMs={delayMs + 40} sizePct={10} />
      {lead && (
        <span
          className="fx-sig-star absolute left-1/2 top-1/2 block h-[16%] w-[16%]"
          style={{ marginLeft: "-8%", marginTop: "-8%", "--dx": "0%", "--dy": "-40%", "--rot": "40deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
        >
          <SparkStar />
        </span>
      )}
    </span>
  );
}

/** Genie Wish: a plume of smoke swirls up and a wish-sparkle pops as the queen
 * appears. */
function GeniePoofBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE GENIE UNBOTTLED: lamp-smoke light billows up out of
  // the board and a COLOSSAL genie torso towers over the crop, arms folded,
  // its smoke-tail still corkscrewing into the tiny lamp below; the wish lands
  // with a gold flare and twin spark shockwaves.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(168,180,196,0.26)"
        rays="rgba(201,74,209,0.5)"
        boom="rgba(255,217,94,0.8)"
        flare="rgba(255,232,150,0.75)"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* turbaned head with gem */}
            <path d="M14 9 C14 4 17 1.5 20 1.5 C23 1.5 26 4 26 9 Z" fill="rgba(201,74,209,0.85)" stroke="#5e2a66" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="20" cy="4.5" r="1.2" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" />
            <circle cx="20" cy="12" r="3.6" fill="rgba(95,201,176,0.9)" stroke="#1f6e6e" strokeWidth="0.9" />
            <path d="M18 11.4 H19.2 M20.8 11.4 H22" stroke="#123a3a" strokeWidth="1" strokeLinecap="round" />
            <path d="M17.5 14.5 C19 15.8 21 15.8 22.5 14.5" stroke="#123a3a" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {/* folded-arm torso */}
            <path d="M20 16 C14 16 11 19 11 24 L14 26 L17 22.5 H23 L26 26 L29 24 C29 19 26 16 20 16 Z" fill="rgba(95,201,176,0.85)" stroke="#1f6e6e" strokeWidth="1" strokeLinejoin="round" />
            <path d="M14 22 C17 20.5 23 20.5 26 22" stroke="#1f6e6e" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            {/* smoke tail corkscrewing into the lamp */}
            <path d="M20 26 C24 30 16 32 20 35 C23 37 18 38.5 20 40" fill="none" stroke="rgba(168,180,196,0.85)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M16 41.5 C16 40 17.5 39 20 39 C22.5 39 24 40 24 41.5 C26 41 27 40 27.5 38.5 C28.5 41 27 43 24 43.5 H17 C15 43 14.5 42 16 41.5 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 36 C12 34 14 26 20 26 C26 26 24 20 18 20 C12 20 14 12 22 12 C30 12 30 6 24 4" fill="none" stroke="rgba(168,180,196,0.7)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 120} sizePct={9} />
      <span className="fx-sig-ash absolute inset-x-[26%] bottom-[10%] block h-[16%] rounded-full" style={{ background: "rgba(150,158,170,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

const GLITCH_BLOCKS = [
  { left: "14%", top: "28%", w: "34%", h: "10%", c: "rgba(126,181,154,0.85)", d: 0 },
  { left: "40%", top: "44%", w: "44%", h: "9%", c: "rgba(224,119,107,0.85)", d: 60 },
  { left: "20%", top: "58%", w: "30%", h: "8%", c: "rgba(230,191,106,0.85)", d: 120 },
  { left: "50%", top: "20%", w: "24%", h: "8%", c: "rgba(139,169,196,0.8)", d: 30 },
];

/** Computer Virus: the opponent's clock corrupts: glitch bars jitter and
 * flicker over scanlines, with a corruption flash on the lead square. */
function GlitchBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {GLITCH_BLOCKS.map((g, i) => (
        <span key={i} className="fx-sig-glitch absolute block rounded-[1px]" style={{ left: g.left, top: g.top, width: g.w, height: g.h, background: g.c, animationDelay: `${delayMs + g.d}ms` }} />
      ))}
      <span className="fx-sig-glitch absolute left-[10%] top-[10%] block h-[80%] w-[80%]" style={{ animationDelay: `${delayMs + 20}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="rgba(126,181,154,0.7)" strokeWidth="1" fill="none">
            <path d="M2 12 H38 M2 20 H38 M2 28 H38" />
          </g>
        </svg>
      </span>
      {lead && (
        <span className="fx-sig-flash absolute inset-[22%] block rounded-[1px]" style={{ background: "rgba(224,119,107,0.55)", animationDelay: `${delayMs}ms` }} />
      )}
    </span>
  );
}

// --- 10e. Batch 5 signature visuals (library core + wild + funny 2nd pass) ---
// Same rules as Batch 1-4: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow halos, 1px corners), hidden
// under reduced motion. Removal-sourced ones render off the detonation diff;
// the effect-data ones join the inert-until-wired zone set. Everything composes
// existing fx-sig-* classes except the two genuinely new motions (fx-sig-rewind
// for the backward clock, fx-sig-implode for the collapsing vortex).

/** Purge / Annihilate / Shatter: a doomed piece is unmade in a puff of grey
 * motes and a thin dissolve ring; lead adds a wider shock. */
const UNMAKE_MOTES = [
  { l: "38%", t: "34%", d: 0 },
  { l: "60%", t: "36%", d: 60 },
  { l: "42%", t: "56%", d: 120 },
  { l: "57%", t: "54%", d: 180 },
  { l: "49%", t: "30%", d: 240 },
  { l: "50%", t: "60%", d: 90 },
];
function DisintegrateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — THE UNMAKING RIFT: a pale blade of un-light slashes the
  // board's heart open, matter motes implode into the cut, and a purging bar
  // sweeps the seam before one grey-violet shockwave rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,146,158,0.26)" delayMs={delayMs} />
        {/* the rift slash across the heart of the board */}
        <span className="fx-sig-slash absolute left-[30%] top-[42%] block h-[8%] w-[40%]" style={{ animationDelay: `${delayMs + 140}ms` }}>
          <span
            className="absolute inset-0 block rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(233,228,242,0.95) 30%, rgba(185,140,255,0.8) 70%, transparent)" }}
          />
        </span>
        {/* matter imploding into the cut */}
        {UNMAKE_MOTES.map((m, i) => (
          <span
            key={i}
            className="fx-sig-implode absolute block rounded-full"
            style={{ left: m.l, top: m.t, width: "2.6%", height: "2.6%", background: "rgba(182,176,190,0.9)", animationDelay: `${delayMs + 380 + m.d}ms` }}
          />
        ))}
        {/* the purging sweep along the seam */}
        <span
          className="fx-sig-sweepbar absolute left-[28%] top-[44%] block h-[4%] w-[44%]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(185,140,255,0.75), transparent)", animationDelay: `${delayMs + 520}ms` }}
        />
        <span
          className="fx-sig-flash absolute left-[44%] top-[42%] block h-[10%] w-[12%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(233,228,242,0.9), transparent 70%)", animationDelay: `${delayMs + 660}ms` }}
        />
        <BoardBoom delayMs={delayMs + 720} color="rgba(182,176,190,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[16%] block rounded-full"
        style={{ border: "1px solid rgba(150,146,158,0.85)", animationDelay: `${delayMs}ms` }}
      />
      {STONE_SHARDS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <ShardBurst vectors={BURST_MED} fill="#b6b0be" stroke="#5a5560" delayMs={delayMs} sizePct={10} />
      <span
        className="fx-sig-ash absolute inset-x-[26%] bottom-[18%] block h-[16%] rounded-full"
        style={{ background: "rgba(120,116,124,0.55)", animationDelay: `${delayMs + 130}ms` }}
      />
    </span>
  );
}

/** Cavalry Charge: a knight thunders down a line. Lead kicks up a dust burst at
 * the origin; each cleared square takes a hoof-slash and a dust splat. */
function CavalryChargeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(150,132,98,0.24)" boom="rgba(138,112,72,0.85)" delayMs={delayMs} motifClass="fx-sig-streak">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 26 C10 18 16 20 22 12 L18 20 L26 16 L20 26 L30 24" fill="none" stroke="#8a7048" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span
          className="fx-sig-ash absolute inset-[18%] block rounded-full"
          style={{ background: "rgba(150,132,98,0.6)", animationDelay: `${delayMs}ms` }}
        />
        <span
          className="fx-sig-muzzle absolute left-[12%] top-[40%] block h-[20%] w-[76%] rounded-full"
          style={{ background: "rgba(180,160,120,0.7)", animationDelay: `${delayMs}ms` }}
        />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[6%] block h-[64%] w-[76%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 26 C10 18 16 20 22 12 L18 20 L26 16 L20 26 L30 24" fill="none" stroke="#8a7048" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-arc absolute inset-[10%] block" style={{ animationDelay: `${delayMs + 90}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 C10 18 24 8 36 10 C24 14 16 22 16 34 Z" fill="rgba(201,210,220,0.6)" stroke="#5b6672" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span
        className="fx-sig-splat absolute inset-x-[22%] bottom-[16%] block h-[22%] rounded-full"
        style={{ background: "rgba(150,132,98,0.6)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

const STONEHIDE_PLATES = [
  { left: "10%", bottom: "12%", d: 0 },
  { left: "56%", bottom: "12%", d: 60 },
  { left: "32%", bottom: "44%", d: 120 },
];

/** Stoneskin / Form Square: slate plates lock over the piece as a stone shell
 * grows; lead thumps a stone ring. */
function StonehideBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE EARTHSHELL WARDEN: slate light grinds up out of the
    // board and a colossal stone-plated guardian rises over the crop, plates
    // still locking across its chest; it sets with a flare and twin stone rings.
    return (
      <GodEvent
        wash="rgba(140,140,146,0.24)"
        rays="rgba(176,166,143,0.6)"
        boom="rgba(168,168,176,0.85)"
        flare="rgba(190,186,176,0.7)"
        sparkFill="#b0a68f"
        sparkStroke="#464648"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the plated guardian: dome head, shell body */}
            <circle cx="20" cy="8" r="4.2" fill="rgba(128,128,134,0.95)" stroke="#464648" strokeWidth="1" />
            <path d="M17.5 7.5 H19 M21 7.5 H22.5" stroke="#e6bf6a" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M10 44 C6 32 8 18 20 14 C32 18 34 32 30 44 Z" fill="rgba(140,140,146,0.85)" stroke="#464648" strokeWidth="1.2" strokeLinejoin="round" />
            {/* interlocking slate plates */}
            <path d="M20 15 V42 M11 26 H29 M13 34 H27 M15 20 H25" stroke="rgba(70,70,76,0.85)" strokeWidth="1" fill="none" />
            <path d="M14 22 L16 24 M26 22 L24 24 M17 30 L19 32 M23 30 L21 32" stroke="rgba(176,166,143,0.8)" strokeWidth="0.8" strokeLinecap="round" />
            {/* fists planted into the board */}
            <path d="M8 40 C5 38 4 35 6 33 L10 36 Z M32 40 C35 38 36 35 34 33 L30 36 Z" fill="rgba(128,128,134,0.9)" stroke="#464648" strokeWidth="0.9" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[16%] block rounded-[2px]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 36 C4 22 8 6 20 4 C32 6 36 22 32 36 Z" fill="rgba(140,140,146,0.32)" stroke="rgba(168,168,176,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M20 5 V35 M9 20 H31" stroke="rgba(150,150,158,0.7)" strokeWidth="0.9" fill="none" />
        </svg>
      </span>
      {STONEHIDE_PLATES.map((p, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute block h-[26%] w-[28%] rounded-[1px]"
          style={{ left: p.left, bottom: p.bottom, background: "rgba(128,128,134,0.9)", border: "1px solid rgba(70,70,76,0.85)", animationDelay: `${delayMs + p.d}ms` }}
        />
      ))}
    </span>
  );
}

/** Royal Aegis / Frost Ward / Panic Button / Borrowed Time: a rune ward ring
 * snaps in and pulses; lead stamps a sigil hexagon at its heart. */
function WardPulseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(126,181,154,0.24)" boom="rgba(126,181,154,0.85)" delayMs={delayMs} motifClass="fx-sig-grow">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <polygon points="20,4 34,12 34,28 20,36 6,28 6,12" fill="rgba(20,30,26,0.6)" stroke="rgba(163,209,150,0.9)" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M20 12 V28 M13 16 H27 M13 24 H27" stroke="rgba(163,209,150,0.8)" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-[12%] block rounded-full"
        style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-flash absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(126,181,154,0.45)", animationDelay: `${delayMs}ms` }}
      />
    </span>
  );
}

/** Verdant Shield: a canopy of bark and leaves unfurls over the pawns. */
function CanopyBurst({ delayMs }: { delayMs: number }) {
  const leaf = "M22 20 C12 6 4 8 3 20 C7 16 12 17 15 21 C10 20 7 23 6 28 C11 23 16 22 22 22 Z";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[44%] bottom-[8%] block h-[54%] w-[12%] rounded-[1px]" style={{ background: "rgba(90,68,44,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-wing-l absolute left-[6%] top-[16%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d={leaf} fill="rgba(126,181,154,0.75)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[6%] top-[16%] block h-[46%] w-[46%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
          <path d={leaf} fill="rgba(126,181,154,0.75)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** I Love My Sister (t7): the sheltering grove, writ god-scale. The revived
 * piece comes home under a colossal world-tree that RISES out of the board in
 * a full GodEvent arc (verdant wash, grave-light rays, rose-gold shockwaves);
 * targets pop the compact leaf-shield. we_verdant_shield keeps the old
 * square-local "canopy" visual — this one is the tier-7 takeover. */
function SisterGroveBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const leaf = "M22 20 C12 6 4 8 3 20 C7 16 12 17 15 21 C10 20 7 23 6 28 C11 23 16 22 22 22 Z";
  if (lead) {
    return (
      <GodEvent
        wash="rgba(126,181,154,0.22)"
        rays="rgba(214,244,224,0.7)"
        boom="rgba(242,168,190,0.85)"
        flare="rgba(230,255,238,0.7)"
        sparkFill="#a8d8bc"
        sparkStroke="#2f4a3c"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the great trunk */}
            <path d="M20 44 L20.5 26 Q18 20 14 17 M24 44 L23.5 26 Q26 20 30 17 M22 44 V22" stroke="#5a442c" strokeWidth="3.4" strokeLinecap="round" fill="none" />
            {/* three-lobed crown, wide as a roof */}
            <ellipse cx="12" cy="15" rx="11" ry="8.5" fill="rgba(126,181,154,0.9)" stroke="#2f4a3c" strokeWidth="1.1" />
            <ellipse cx="32" cy="15" rx="11" ry="8.5" fill="rgba(105,160,132,0.9)" stroke="#2f4a3c" strokeWidth="1.1" />
            <ellipse cx="22" cy="9" rx="13" ry="9" fill="rgba(150,204,172,0.95)" stroke="#2f4a3c" strokeWidth="1.1" />
            {/* the heart nested in the boughs — she arrives protected */}
            <path d="M22 12 c-2.2 -3.6 -7.2 -2.2 -7.2 1.4 c0 3 4 5.4 7.2 7.6 c3.2 -2.2 7.2 -4.6 7.2 -7.6 c0 -3.6 -5 -5 -7.2 -1.4 Z" fill="#f2a8be" stroke="#a8506e" strokeWidth="1.2" strokeLinejoin="round" />
            {/* sheltering roots gripping the board */}
            <path d="M20 44 Q14 41 9 42 M24 44 Q30 41 35 42" stroke="#5a442c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
        }
      >
        {/* petals shaken loose, drifting down over the ranks */}
        {[
          { l: "34%", t: "34%", d: 620 },
          { l: "60%", t: "30%", d: 760 },
          { l: "46%", t: "26%", d: 900 },
        ].map((p, i) => (
          <span key={i} className="fx-sig-ash absolute block h-[4%] w-[4%] rounded-full" style={{ left: p.l, top: p.t, background: "rgba(242,168,190,0.85)", animationDelay: `${delayMs + p.d}ms` }} />
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[44%] bottom-[8%] block h-[54%] w-[12%] rounded-[1px]" style={{ background: "rgba(90,68,44,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-wing-l absolute left-[4%] top-[12%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d={leaf} fill="rgba(126,181,154,0.8)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[4%] top-[12%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true" style={{ transform: "scaleX(-1)" }}>
          <path d={leaf} fill="rgba(126,181,154,0.8)" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(242,168,190,0.9)", animationDelay: `${delayMs + 200}ms` }} />
    </span>
  );
}

/** Time Thief / Chrono Siphon: a clock face spins its hands backward while
 * stolen seconds bleed off to the side; lead flashes as time is siphoned. */
function ChronoStealBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(40,44,58,0.24)" boom="rgba(216,181,110,0.85)" delayMs={delayMs} motifClass="fx-sig-ice">
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="rgba(40,44,58,0.5)" stroke="#d8b56e" strokeWidth="1.6" />
          <g className="fx-sig-rewind">
            <path d="M16 16 V6 M16 16 L22 20" stroke="#f0dca8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
          <circle cx="16" cy="16" r="1.5" fill="#f0dca8" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <circle cx="16" cy="16" r="13" fill="rgba(40,44,58,0.5)" stroke="#d8b56e" strokeWidth="1.6" />
          <g className="fx-sig-rewind">
            <path d="M16 16 V6 M16 16 L22 20" stroke="#f0dca8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
          <circle cx="16" cy="16" r="1.5" fill="#f0dca8" />
        </svg>
      </span>
      <span
        className="fx-sig-ash absolute right-[14%] top-[16%] block h-[24%] w-[22%] rounded-full"
        style={{ background: "rgba(216,181,110,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

/** Blink / Far Step / Yeet / Warp: a piece teleports in on a rune ring with a
 * pop of arcane light and a scatter of sparks. */
function BlinkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the warp storm's lead tears the
  // WHOLE board — an arcane wash while a colossal rune ring spins across the
  // crop and a violet shock rolls past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(168,119,216,0.2)" delayMs={delayMs} />
        <span className="fx-sig-swirl absolute inset-[26%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(168,119,216,0.85)" strokeWidth="1" strokeDasharray="4 3" />
            <polygon points="20,7 31,26 9,26" fill="none" stroke="rgba(190,150,230,0.8)" strokeWidth="0.7" />
            <polygon points="20,33 9,14 31,14" fill="none" stroke="rgba(190,150,230,0.6)" strokeWidth="0.7" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 260} color="rgba(168,119,216,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(168,119,216,0.85)" strokeWidth="1.4" strokeDasharray="4 3" />
          <polygon points="20,7 31,26 9,26" fill="none" stroke="rgba(190,150,230,0.8)" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-flash absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(190,150,230,0.6)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-ring absolute inset-[18%] block rounded-full"
        style={{ border: "1px solid rgba(168,119,216,0.85)", animationDelay: `${delayMs + 60}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#c9a6ec" stroke="#5a3a86" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

/** Pizza / Clown Car / Ducks / Goose: a coral summoning portal swirls open and
 * a shaft of light lifts the new arrival in, sparks popping. */
function PortalBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead swings the door wide —
  // a coral wash while a colossal summoning portal swirls over the WHOLE crop
  // and shafts of arrival light rise along the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(224,119,107,0.2)" delayMs={delayMs} />
        <span className="fx-sig-swirl absolute inset-[26%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#e0776b" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="#f0b0a6" strokeWidth="0.8" strokeDasharray="3 3" />
            <circle cx="20" cy="20" r="5" fill="none" stroke="#e0776b" strokeWidth="0.8" />
          </svg>
        </span>
        {[
          { l: "34%", d: 200 },
          { l: "50%", d: 320 },
          { l: "62%", d: 440 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[28%] block h-[32%] w-[4.5%] rounded-[1px]" style={{ left: s.l, background: "rgba(240,176,166,0.5)", animationDelay: `${delayMs + s.d}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e0776b" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#f0b0a6" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="20" cy="20" r="5" fill="none" stroke="#e0776b" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-rise absolute left-[40%] bottom-[16%] block h-[52%] w-[20%] rounded-[1px]"
        style={{ background: "rgba(240,176,166,0.5)", animationDelay: `${delayMs + 90}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#f0b0a6" stroke="#7a2f28" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

const BORDERWARD_RUNES = [
  { left: "16%", d: 0 },
  { left: "44%", d: 70 },
  { left: "70%", d: 140 },
];

/** Glyph Seal / Border Ward: a translucent curtain of warding runes rises to
 * seal the ground. */
function BorderWardBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead seals the WHOLE
  // frontier — a mint wash while a warding curtain climbs across the full
  // crop width, runes rising along its face.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(126,181,154,0.2)" delayMs={delayMs} />
        <span className="fx-sig-brick absolute left-[24%] bottom-[30%] block h-[32%] w-[52%] rounded-[2px]" style={{ background: "rgba(126,181,154,0.2)", border: "1px solid rgba(163,209,150,0.7)", animationDelay: `${delayMs + 60}ms` }} />
        {[
          { l: "30%", d: 180 },
          { l: "46%", d: 300 },
          { l: "60%", d: 420 },
        ].map((r, i) => (
          <span key={i} className="fx-sig-rise absolute bottom-[36%] block h-[16%] w-[7%]" style={{ left: r.l, animationDelay: `${delayMs + r.d}ms` }}>
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M10 2 V18 M4 7 H16 M4 13 H16" stroke="rgba(163,209,150,0.8)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-brick absolute inset-x-[8%] bottom-[8%] block h-[74%] rounded-[1px]"
        style={{ background: "rgba(126,181,154,0.22)", border: "1px solid rgba(163,209,150,0.7)", animationDelay: `${delayMs}ms` }}
      />
      {BORDERWARD_RUNES.map((r, i) => (
        <span
          key={i}
          className="fx-sig-rise absolute bottom-[24%] block h-[30%] w-[18%]"
          style={{ left: r.left, animationDelay: `${delayMs + 120 + r.d}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M10 2 V18 M4 7 H16 M4 13 H16" stroke="rgba(163,209,150,0.8)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const BANANA_PEELS = [
  { left: "12%", w: "30%", rot: -18, d: 0 },
  { left: "46%", w: "26%", rot: 22, d: 90 },
  { left: "30%", w: "32%", rot: -8, d: 180 },
];

/** Banana Peel Trail: a scatter of banana peels drops and slides across the
 * file. Flat SVG peels, no emoji. */
function BananaBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {BANANA_PEELS.map((p, i) => (
        <span
          key={i}
          className="fx-sig-crownfall absolute top-0 block h-[26%]"
          style={{ left: p.left, width: p.w, transform: `rotate(${p.rot}deg)`, animationDelay: `${delayMs + p.d}ms` }}
        >
          <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
            <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            <path d="M8 4 C10 8 16 9 20 6" fill="none" stroke="#c79a3a" strokeWidth="0.7" />
          </svg>
        </span>
      ))}
    </span>
  );
}

const MINE_POS = [
  { left: "16%", d: 0 },
  { left: "44%", d: 90 },
  { left: "70%", d: 180 },
];

/** Claymore Line: a row of mines clicks up out of the ground and arms. */
function MinefieldBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead sows the WHOLE field —
  // an olive wash while a rank of mines clicks up across the crop and an
  // arming ring pulses out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(96,104,72,0.24)" delayMs={delayMs} />
        {[
          { l: "28%", d: 0 },
          { l: "40%", d: 110 },
          { l: "52%", d: 220 },
          { l: "64%", d: 330 },
        ].map((m, i) => (
          <span key={i} className="fx-sig-brick absolute bottom-[36%] block h-[10%] w-[8%]" style={{ left: m.l, animationDelay: `${delayMs + m.d}ms` }}>
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M3 16 C3 10 17 10 17 16 Z" fill="rgba(96,104,72,0.92)" stroke="#33402b" strokeWidth="1" strokeLinejoin="round" />
              <path d="M6 20 L6 15 M14 20 L14 15" stroke="#33402b" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M10 10 V4" stroke="#8a8478" strokeWidth="1" strokeLinecap="round" />
              <circle cx="10" cy="3.5" r="1.4" fill="#e0776b" />
            </svg>
          </span>
        ))}
        <BoardBoom delayMs={delayMs + 400} color="rgba(224,119,107,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {MINE_POS.map((m, i) => (
        <span
          key={i}
          className="fx-sig-brick absolute bottom-[16%] block h-[24%] w-[18%]"
          style={{ left: m.left, animationDelay: `${delayMs + m.d}ms` }}
        >
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M3 16 C3 10 17 10 17 16 Z" fill="rgba(96,104,72,0.92)" stroke="#33402b" strokeWidth="1" strokeLinejoin="round" />
            <path d="M6 20 L6 15 M14 20 L14 15" stroke="#33402b" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M10 10 V4" stroke="#8a8478" strokeWidth="1" strokeLinecap="round" />
            <circle cx="10" cy="3.5" r="1.4" fill="#e0776b" />
          </svg>
        </span>
      ))}
      <span
        className="fx-sig-ash absolute inset-x-[20%] bottom-[12%] block h-[14%] rounded-full"
        style={{ background: "rgba(110,104,84,0.5)", animationDelay: `${delayMs + 120}ms` }}
      />
    </span>
  );
}

// Shards fly IN toward the centre of the collapsing vortex (fx-sig-implode
// starts them out at --dx/--dy and pulls them to the core).
const VORTEX_VEC = [
  { dx: "300%", dy: "-230%", rot: "220deg", d: 0 },
  { dx: "-280%", dy: "-250%", rot: "-210deg", d: 20 },
  { dx: "320%", dy: "170%", rot: "260deg", d: 10 },
  { dx: "-300%", dy: "200%", rot: "-190deg", d: 26 },
  { dx: "40%", dy: "-320%", rot: "150deg", d: 6 },
  { dx: "-60%", dy: "300%", rot: "-150deg", d: 30 },
];

/** Void Rift / Black Hole / Haunted House: a dark maw opens and everything is
 * pulled inward as it collapses to a point; lead adds an event-horizon ring. */
function VortexBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead opens the maw under the
  // WHOLE board — a void-dark wash while a colossal event horizon collapses
  // mid-crop, pulling shards in from every direction.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(18,14,24,0.4)" delayMs={delayMs} />
        <span
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-13%] mt-[-13%] block h-[26%] w-[26%] rounded-full"
          style={{ background: "rgba(18,14,24,0.92)", border: "2px solid rgba(122,91,154,0.9)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs + 80}ms` } as React.CSSProperties}
        />
        {VORTEX_VEC.map((v, i) => (
          <span
            key={i}
            className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-2.5%] mt-[-2.5%] block h-[5%] w-[5%]"
            style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 80 + v.d}ms` } as React.CSSProperties}
          >
            <SigShard fill="#a48cc4" stroke="#463357" variant={i} />
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-24%] mt-[-24%] block h-[48%] w-[48%] rounded-full"
        style={{ background: "rgba(18,14,24,0.92)", border: "1.5px solid rgba(122,91,154,0.9)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
      />
      {VORTEX_VEC.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.d}ms` } as React.CSSProperties}
        >
          <SigShard fill="#a48cc4" stroke="#463357" variant={i} />
        </span>
      ))}
    </span>
  );
}

// --- Batch 6: marquee DRAGON + WIZARD spectacles (top-tier cards) ------------
// Two board-wide signatures for the highest-tier marquee cards, wired like Nova.
// Solid fills only (no gradients / glow / box-shadow), transform/opacity
// animation, one-shot, hidden entirely under reduced motion. New motions
// (dragon fly / wingbeat / fire breath / wizard rise) live in effects.css; the
// per-square hits reuse the shared fx-sig-flash / -rise / -swirl / -scorch /
// -star classes.

/** Marquee DRAGON (Total Annihilation / Queen's Apocalypse): on the lead square
 * a great wyrm sweeps across the board, banking and beating its wing as it
 * breathes a cone of fire; every cleared square erupts in a fireball, a rising
 * flame lick, an ember shatter, and a scorch. */
function DragonLordBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        {/* God-tier pass — APOCALYPSE STAGING: the sky goes ember-dark and
            heat-light fans up before the wyrm passes; its wake detonates twin
            concussion rings past the board edges. */}
        <BoardWideStage>
          <BoardWash color="rgba(58,21,18,0.3)" delayMs={delayMs} />
          {GOD_FAN.map((s, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-[32%] block h-[62%]"
              style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r}) scaleY(-1)`, transformOrigin: "50% 100%" }}
            >
              <span
                className="fx-sig-shaft absolute inset-0 block"
                style={{ background: "linear-gradient(180deg, rgba(224,119,107,0.7), transparent 78%)", animationDelay: `${delayMs + s.d}ms` }}
              />
            </span>
          ))}
          <span
            className="fx-sig-flash absolute left-[38%] top-[55%] block h-[18%] w-[24%] rounded-full"
            style={{ background: "rgba(255,168,80,0.75)", animationDelay: `${delayMs + 520}ms` }}
          />
          <BoardBoom delayMs={delayMs + 560} color="rgba(224,119,107,0.9)" thickness={4} />
          <BoardBoom delayMs={delayMs + 700} color="rgba(230,191,106,0.8)" />
        </BoardWideStage>
        <span
          className="fx-sig-dragon-fly absolute left-[-42%] top-[2%] block h-[62%] w-[150%]"
          style={{ animationDelay: `${delayMs}ms` }}
        >
          <svg viewBox="0 0 96 40" className="h-full w-full" aria-hidden="true">
            {/* tail + serpentine body */}
            <path
              d="M4 30 C14 25 20 31 28 26 C36 21 42 25 52 19 C58 15 64 17 70 15 L73 20 C67 22 61 22 55 26 C47 31 41 28 33 33 C25 38 14 36 6 34 Z"
              fill="#7a2f28"
              stroke="#3a1512"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* belly ridges */}
            <path d="M20 30 L24 30 M30 28 L34 28 M42 26 L46 26" stroke="#e0776b" strokeWidth="1.2" strokeLinecap="round" />
            {/* beating wing */}
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs}ms` }}>
              <path d="M40 24 L30 4 L36 12 L42 3 L46 13 L54 6 L50 20 Z" fill="#5a1f1a" stroke="#2a0f0c" strokeWidth="1.1" strokeLinejoin="round" />
              <path d="M40 22 L36 11 M42 20 L44 9 M46 18 L50 10" stroke="#2a0f0c" strokeWidth="0.7" />
            </g>
            {/* head + jaw */}
            <path d="M68 14 L84 10 L78 16 L88 17 L77 21 L70 20 Z" fill="#8a3630" stroke="#3a1512" strokeWidth="1.1" strokeLinejoin="round" />
            {/* horn */}
            <path d="M72 12 L69 6 L75 11 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" strokeLinejoin="round" />
            {/* eye */}
            <circle cx="75" cy="14.5" r="1" fill="#e6bf6a" />
          </svg>
          {/* fire breath from the jaws */}
          <span
            className="fx-sig-firebreath absolute right-[-2%] top-[24%] block h-[40%] w-[34%]"
            style={{ animationDelay: `${delayMs + 120}ms` }}
          >
            <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 12 C14 3 30 4 48 1 C40 8 42 16 48 23 C30 20 14 21 0 12 Z" fill="rgba(224,119,107,0.9)" />
              <path d="M2 12 C14 7 26 8 40 6 C34 10 35 14 40 18 C26 16 14 17 2 12 Z" fill="rgba(230,191,106,0.95)" />
            </svg>
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-rise absolute inset-x-[28%] bottom-[8%] block h-[66%]"
        style={{ animationDelay: `${delayMs + 70}ms` }}
      >
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C9 31 12 20 19 13 C18 21 24 21 23 27 C28 23 27 16 25 10 C33 18 34 30 26 38 Z" fill="rgba(224,119,107,0.92)" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M20 40 C15 33 16 25 21 20 C21 25 25 25 24 30 C27 26 26 22 25 18 C30 24 29 33 24 39 Z" fill="rgba(230,191,106,0.95)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e0776b" stroke="#7a2f28" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[28%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 190}ms` }}
      />
    </span>
  );
}

/** Marquee WIZARD (Grand Reset / The Void Realm): on the lead square an archmage
 * rises out of the board and casts - his staff-orb flares while twin arcane
 * rings spin out and sparks scatter; every affected square gets an arcane ring,
 * a rising rune sigil, and a spark burst. */
function ArchmageBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — THE ARCHMAGE ASCENDANT: arcane light wells up out of the
    // board and the archmage rises COLOSSAL over the whole crop, staff-orb
    // flaring as a board-spanning spell ring spins out beneath him and twin
    // arcane shockwaves roll past the edges.
    return (
      <GodEvent
        wash="rgba(90,63,160,0.24)"
        rays="rgba(168,119,216,0.6)"
        boom="rgba(168,119,216,0.85)"
        flare="rgba(126,181,154,0.8)"
        sparkFill="#a877d8"
        sparkStroke="#4a3070"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 48" className="h-full w-full" aria-hidden="true">
            {/* staff */}
            <path d="M31 12 L28 47" stroke="#6b4a2a" strokeWidth="1.8" strokeLinecap="round" />
            {/* robe */}
            <path d="M20 17 L32 47 L8 47 Z" fill="#7a5cc0" stroke="#3a2a63" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M12 41 H28" stroke="#a877d8" strokeWidth="1" />
            {/* head */}
            <circle cx="20" cy="15" r="4" fill="#e8d3b0" stroke="#3a2a63" strokeWidth="0.8" />
            {/* beard */}
            <path d="M16 16 C17 25 23 25 24 16 C23 20 17 20 16 16 Z" fill="#e6e6ee" stroke="#8a8aa0" strokeWidth="0.5" strokeLinejoin="round" />
            {/* pointed hat */}
            <path d="M20 1 L28 14 L12 14 Z" fill="#5a3fa0" stroke="#3a2a63" strokeWidth="1.1" strokeLinejoin="round" />
            {/* hat star */}
            <path d="M20 4.5 L21 7 L23.5 7 L21.5 8.6 L22.3 11 L20 9.5 L17.7 11 L18.5 8.6 L16.5 7 L19 7 Z" fill="#e6bf6a" />
            {/* staff orb */}
            <circle cx="31.5" cy="10" r="3.2" fill="#7eb59a" stroke="#2e5f4a" strokeWidth="0.8" />
          </svg>
        }
      >
        {/* the board-spanning spell ring, cast out beneath him */}
        <span className="fx-sig-swirl absolute inset-[28%] block" style={{ animationDelay: `${delayMs + 340}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeDasharray="5 4" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="#7eb59a" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </span>
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeDasharray="5 4" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[30%] bottom-[16%] block h-[46%] w-[40%]" style={{ animationDelay: `${delayMs + 90}ms` }}>
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#a877d8" strokeWidth="1.3" strokeDasharray="3 2.4" />
          <path d="M12 4 L13.6 10.4 L20 11 L14.6 14.4 L16.4 21 L12 16.8 L7.6 21 L9.4 14.4 L4 11 L10.4 10.4 Z" fill="none" stroke="#7eb59a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#a877d8" stroke="#4a3070" delayMs={delayMs} sizePct={10} />
    </span>
  );
}

// --- Batch 7: marquee sea / monster + top-tier boardwide spectacles ----------
// Bespoke reads for the big sea beasts (Kraken, Abyss, Whirlpool, Flood, the
// Frost Ward frozen moat) and two more end-game boardwide spectacles in the
// dragon / wizard family (a colossal meteor, a rising phoenix). Solid fills
// only (no gradients / glow / box-shadow), transform/opacity animation, one-
// shot, hidden entirely under reduced motion. New motions (tentacle / maw /
// whirl / wave / moat / meteor / phoenix) live in effects.css; the per-square
// hits reuse the shared fx-sig-flash / -ring / -rise / -scorch / -star /
// -implode / -wingbeat classes and the ShardBurst helper.

const KRAKEN_WATER = "#4f7d68";
const KRAKEN_SUCKER = "#a3d196";

/** Kraken: a suckered tentacle rears up out of the square and sways; the lead
 * square raises a second coil with a green splash flash. Sea-green (mint). */
function KrakenBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(126,181,154,0.24)" boom="rgba(47,74,60,0.85)" delayMs={delayMs} motifClass="fx-sig-grow">
        <svg viewBox="0 0 20 48" className="h-full w-full" aria-hidden="true">
              <path
                d="M7 48 C5 34 10 28 6 18 C4 12 8 6 12 2 C10 8 13 12 10 20 C7 28 11 36 10 48 Z"
                fill="#3f6a58"
                stroke="#274035"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-ring absolute inset-x-[14%] bottom-[8%] block h-[26%] rounded-full"
        style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="fx-sig-tentacle absolute left-[34%] bottom-[4%] block h-[88%] w-[34%]"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 24 60" className="h-full w-full" aria-hidden="true">
          <path
            d="M8 60 C6 46 4 38 10 28 C14 20 12 12 18 6 C15 12 18 18 15 24 C12 30 14 40 12 60 Z"
            fill={KRAKEN_WATER}
            stroke="#2f4a3c"
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <g fill={KRAKEN_SUCKER}>
            <circle cx="10.5" cy="30" r="1.3" />
            <circle cx="12.5" cy="22" r="1.2" />
            <circle cx="14.5" cy="15" r="1.1" />
            <circle cx="16" cy="9.5" r="1" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill={KRAKEN_SUCKER} stroke="#2f4a3c" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Abyss / Void: a dark maw yawns open and pieces are pulled down into it; the
 * lead square adds an event-horizon ring. Reuses VORTEX_VEC for the in-pull. */
function AbyssBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE ABYSS LOOKS BACK: the crop darkens, abyssal light
    // wells UP out of the board, and a colossal lidded void-maw heaves open
    // across its centre, tendrils questing out of the dark before the
    // event-horizon flare and twin drowned shockwaves.
    return (
      <GodEvent
        wash="rgba(12,16,22,0.34)"
        rays="rgba(90,140,120,0.55)"
        boom="rgba(90,140,120,0.85)"
        flare="rgba(126,181,154,0.55)"
        sparkFill="#5a8c78"
        sparkStroke="#243a30"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* questing tendrils */}
            <g stroke="rgba(90,140,120,0.8)" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d="M8 20 C4 16 3 11 6 7 M36 20 C40 16 41 11 38 7 M14 12 C12 8 13 4 16 2 M30 12 C32 8 31 4 28 2" />
            </g>
            {/* the colossal void maw */}
            <circle cx="22" cy="26" r="17" fill="rgba(12,16,22,0.94)" stroke="rgba(126,181,154,0.9)" strokeWidth="1.8" />
            <circle cx="22" cy="26" r="10.5" fill="rgba(6,9,13,0.96)" stroke="rgba(90,140,120,0.75)" strokeWidth="1" />
            {/* the eye at the bottom of the world */}
            <path d="M15 26 C18 22.5 26 22.5 29 26 C26 29.5 18 29.5 15 26 Z" fill="rgba(126,181,154,0.35)" stroke="rgba(126,181,154,0.85)" strokeWidth="0.9" />
            <circle cx="22" cy="26" r="1.6" fill="#a3d196" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-maw absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="rgba(12,16,22,0.92)" stroke="rgba(126,181,154,0.85)" strokeWidth="1.6" />
          <circle cx="20" cy="20" r="11" fill="rgba(6,9,13,0.95)" stroke="rgba(90,140,120,0.7)" strokeWidth="1" />
        </svg>
      </span>
      {VORTEX_VEC.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.d}ms` } as React.CSSProperties}
        >
          <SigShard fill="#5a8c78" stroke="#243a30" variant={i} />
        </span>
      ))}
    </span>
  );
}

/** Whirlpool: concentric water spirals inward and drags a mote down with it. */
function WhirlpoolBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-whirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path
            d="M20 3 C31 3 37 12 37 20 C37 29 30 34 22 34 C15 34 11 29 11 23 C11 18 15 14 20 14 C24 14 27 17 27 21 C27 24 25 26 22 26"
            fill="none"
            stroke="rgba(126,181,154,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 8 C28 8 32 14 32 20 C32 26 27 29 22 29"
            fill="none"
            stroke="rgba(163,209,150,0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill={KRAKEN_SUCKER} stroke="#2f4a3c" delayMs={delayMs + 80} sizePct={8} />
    </span>
  );
}

/** Flood: a crested wave washes across the trap square and drains off, throwing
 * a couple of foam flecks. */
function FloodBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead breaks the levee — a
  // water wash over the WHOLE crop while a colossal crested wave sweeps
  // across the board and foam flecks spray off it.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(126,181,154,0.26)" delayMs={delayMs} />
        <span className="fx-sig-wave absolute left-[10%] bottom-[28%] block h-[26%] w-[80%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path
              d="M0 12 C8 4 14 4 22 10 C30 16 38 16 48 8 L48 24 L0 24 Z"
              fill="rgba(126,181,154,0.6)"
              stroke="rgba(163,209,150,0.85)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path d="M0 16 C10 10 16 12 24 16 C32 20 40 18 48 14" fill="none" stroke="rgba(230,246,255,0.8)" strokeWidth="1" />
          </svg>
        </span>
        <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 260} sizePct={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[2%] bottom-[10%] block h-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M0 12 C8 4 14 4 22 10 C30 16 38 16 48 8 L48 24 L0 24 Z"
            fill="rgba(126,181,154,0.55)"
            stroke="rgba(163,209,150,0.85)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M0 16 C10 10 16 12 24 16 C32 20 40 18 48 14" fill="none" stroke="rgba(230,246,255,0.8)" strokeWidth="1" />
        </svg>
      </span>
      <span
        className="fx-sig-star absolute left-[30%] top-[46%] block h-[7%] w-[7%]"
        style={{ "--dx": "60%", "--dy": "-120%", "--rot": "120deg", animationDelay: `${delayMs + 140}ms` } as React.CSSProperties}
      >
        <SigShard fill="#e6f6ff" stroke="#7fb8dd" variant={0} />
      </span>
      <span
        className="fx-sig-star absolute left-[60%] top-[42%] block h-[7%] w-[7%]"
        style={{ "--dx": "-50%", "--dy": "-140%", "--rot": "-100deg", animationDelay: `${delayMs + 180}ms` } as React.CSSProperties}
      >
        <SigShard fill="#e6f6ff" stroke="#7fb8dd" variant={1} />
      </span>
    </span>
  );
}

/** Frost Ward frozen moat: a spiked ring of ice locks in around the king; lead
 * adds a frost flash. Ice palette, distinct from the generic ward pulse. */
function FrozenMoatBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(224,246,255,0.24)" boom="rgba(127,184,221,0.85)" delayMs={delayMs} motifClass="fx-sig-moat">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(224,246,255,0.9)" strokeWidth="2" />
          <circle cx="20" cy="20" r="13" fill="none" stroke="rgba(127,184,221,0.8)" strokeWidth="1" />
          <g fill="rgba(230,246,255,0.9)" stroke="#7fb8dd" strokeWidth="0.6" strokeLinejoin="round">
            <path d="M20 1 L22 6 L18 6 Z" />
            <path d="M39 20 L34 22 L34 18 Z" />
            <path d="M20 39 L18 34 L22 34 Z" />
            <path d="M1 20 L6 18 L6 22 Z" />
            <path d="M33 7 L31 11 L28 8 Z" />
            <path d="M7 33 L9 29 L12 32 Z" />
            <path d="M33 33 L29 31 L32 28 Z" />
            <path d="M7 7 L11 9 L8 12 Z" />
          </g>
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-moat absolute inset-[8%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(224,246,255,0.9)" strokeWidth="2" />
          <circle cx="20" cy="20" r="13" fill="none" stroke="rgba(127,184,221,0.8)" strokeWidth="1" />
          <g fill="rgba(230,246,255,0.9)" stroke="#7fb8dd" strokeWidth="0.6" strokeLinejoin="round">
            <path d="M20 1 L22 6 L18 6 Z" />
            <path d="M39 20 L34 22 L34 18 Z" />
            <path d="M20 39 L18 34 L22 34 Z" />
            <path d="M1 20 L6 18 L6 22 Z" />
            <path d="M33 7 L31 11 L28 8 Z" />
            <path d="M7 33 L9 29 L12 32 Z" />
            <path d="M33 33 L29 31 L32 28 Z" />
            <path d="M7 7 L11 9 L8 12 Z" />
          </g>
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Cataclysmic Meteor: on the lead square a colossal meteor streaks in from the
 * corner trailing fire; every cleared square erupts in a fireball, a flame lick,
 * an ember shatter, and a scorch. A nova-class boardwide (removal diff). */
function MeteorStormBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — HEAVENFALL: the sky goes furnace-dark and a TRULY
    // colossal meteor tears down across the whole crop, its strike flaring
    // white-gold and slamming twin concussion rings past the board edges.
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <BoardWideStage>
          <BoardWash color="rgba(58,28,18,0.32)" delayMs={delayMs} />
          {/* the falling star, crop-scale */}
          <span className="fx-sig-meteor absolute left-[8%] top-[-4%] block h-[70%] w-[70%]" style={{ animationDelay: `${delayMs}ms` }}>
            <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
              <path d="M2 2 L46 46" stroke="#e6bf6a" strokeWidth="4" strokeLinecap="round" />
              <path d="M10 4 L46 40" stroke="#ffd95e" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 10 L40 46" stroke="#e0776b" strokeWidth="2" strokeLinecap="round" />
              <circle cx="50" cy="50" r="9" fill="#c66860" stroke="#7a2410" strokeWidth="1.4" />
              <circle cx="50" cy="50" r="4.5" fill="#ffd95e" />
            </svg>
          </span>
          {/* strike flare + ejecta + twin concussions */}
          <span
            className="fx-sig-flash absolute left-[36%] top-[46%] block h-[22%] w-[28%] rounded-full"
            style={{ background: "rgba(255,217,94,0.85)", animationDelay: `${delayMs + 620}ms` }}
          />
          <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 640} sizePct={7} />
          <BoardBoom delayMs={delayMs + 660} color="rgba(255,168,80,0.9)" thickness={4} />
          <BoardBoom delayMs={delayMs + 800} color="rgba(230,191,106,0.8)" />
        </BoardWideStage>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-flash absolute inset-[14%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.85)", animationDelay: `${delayMs}ms` }}
      />
      <span className="fx-sig-rise absolute inset-x-[28%] bottom-[8%] block h-[64%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path
            d="M20 40 C10 31 13 20 20 13 C19 21 25 21 24 27 C29 23 28 16 26 10 C34 18 34 30 26 38 Z"
            fill="rgba(224,119,107,0.92)"
            stroke="#7a2f28"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span
        className="fx-sig-scorch absolute inset-[26%] block rounded-full"
        style={{ background: "rgba(26,16,8,0.72)", animationDelay: `${delayMs + 190}ms` }}
      />
    </span>
  );
}

/** Phoenix Rebirth / Full Resurrection: on the lead square a great firebird
 * heaves up out of the board with beating wings and a fiery crest; every
 * affected square sends up a rising ember feather and a spark burst. A dragon /
 * wizard-family boardwide (summon zone). */
function PhoenixRiseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — THE FIREBIRD ASCENDANT: ember-light roars up out of the
    // board and the great firebird heaves COLOSSAL over the whole crop, wings
    // beating past the board edges; its cry lands a flare, an ember burst and
    // twin flame shockwaves.
    return (
      <GodEvent
        wash="rgba(224,119,107,0.22)"
        rays="rgba(255,157,61,0.7)"
        boom="rgba(255,168,80,0.9)"
        flare="rgba(255,209,102,0.8)"
        sparkFill="#e6bf6a"
        sparkStroke="#7a5b23"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 64 48" className="h-full w-full" aria-hidden="true">
            <path d="M32 46 C28 38 30 30 32 22 C34 30 36 38 32 46 Z" fill="#c66860" stroke="#7a2410" strokeWidth="1" strokeLinejoin="round" />
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs + 170}ms` }}>
              <path d="M32 22 C22 10 12 8 2 12 C10 14 12 20 8 26 C16 22 24 24 32 26 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            </g>
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs + 210}ms` }}>
              <path d="M32 22 C42 10 52 8 62 12 C54 14 52 20 56 26 C48 22 40 24 32 26 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            </g>
            <circle cx="32" cy="18" r="3.4" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
            <path d="M32 14 L34 9 L35 14 Z" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[30%] bottom-[10%] block h-[58%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M12 32 C7 24 9 14 12 4 C15 14 17 24 12 32 Z" fill="rgba(224,119,107,0.9)" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M12 26 C10 20 11 14 12 9 C13 14 14 20 12 26 Z" fill="rgba(230,191,106,0.95)" />
        </svg>
      </span>
      <span
        className="fx-sig-flash absolute inset-[32%] block rounded-full"
        style={{ background: "rgba(255,168,80,0.6)", animationDelay: `${delayMs + 60}ms` }}
      />
      <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

// --- 10h. Batch 8 signature visuals (flavor pass) ---------------------------
// Same rules as Batch 1-7: keyed one-shots, transform/opacity only, FLAT SVG
// fills and solid discs (no gradients, no glow), 1px corners, coral / mint /
// sun / gold accents, hidden under reduced motion. Everything composes the
// shared fx-sig-* classes; only fx-sig-gallop (a cavalry lunge) and fx-sig-quake
// (a ground shudder) are genuinely new. Removal visuals render off the
// detonation diff; the effect-data ones join the inert-until-wired zone set.

// -- Removals (render off the detonation diff) --

/** Detonate: a sacrificed pawn goes off like a bomb, blasting its neighbours.
 * Lead is the central thump; each cleared square gets a fireball and scorch. */
function DetonateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[18%] block rounded-full" style={{ background: "rgba(255,196,120,0.85)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(255,168,80,0.95)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs} sizePct={12} />
      <span className="fx-sig-scorch absolute inset-[26%] block rounded-full" style={{ background: "rgba(24,14,8,0.72)", animationDelay: `${delayMs + 180}ms` }} />
      {lead && <span className="fx-sig-shock absolute inset-[8%] block rounded-full" style={{ border: "2px solid rgba(255,214,120,0.9)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}

/** Cinder Strike: a single ember slams one pawn to ash. */
function CinderStrikeBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(255,150,60,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#ff8a3c" stroke="#7a3a12" delayMs={delayMs} sizePct={10} />
      <span className="fx-sig-ash absolute left-[40%] top-[16%] block h-[24%] w-[20%] rounded-full" style={{ background: "rgba(230,110,60,0.5)", animationDelay: `${delayMs + 120}ms` }} />
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(26,16,8,0.68)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Purge Storm: pawns disintegrate into motes while a rime line glazes the
 * survivors that freeze. */
function PurgeStormBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead breaks the storm over
  // the WHOLE board — a pale rime wash while frost lines glaze across the
  // full crop width and motes scatter from the origin.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(198,234,255,0.26)" delayMs={delayMs} />
        {[
          { t: "36%", d: 0 },
          { t: "50%", d: 150 },
          { t: "62%", d: 300 },
        ].map((f, i) => (
          <span key={i} className="fx-sig-frost absolute left-[24%] block h-[3%] w-[52%] rounded-[1px]" style={{ top: f.t, background: "rgba(198,234,255,0.6)", animationDelay: `${delayMs + f.d}ms` }} />
        ))}
        <ShardBurst vectors={BURST_MED} fill="#dbe7f2" stroke="#8aa0b4" delayMs={delayMs + 200} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[6%] top-[44%] block h-[10%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.55)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#dbe7f2" stroke="#8aa0b4" delayMs={delayMs} sizePct={9} />
      <span className="fx-sig-ash absolute inset-[26%] block rounded-full" style={{ background: "rgba(210,224,236,0.5)", animationDelay: `${delayMs + 80}ms` }} />
    </span>
  );
}

/** Roulette: a wheel spins and a piece is flicked off with a shower of chips. */
function RouletteBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Owner add-on (gambling wheels): the lead is now a true roulette wheel —
  // alternating red/black pockets with the lone green zero, a gold rim, and
  // the ivory ball resting in a pocket — spun board-wide (T5) and left to
  // decelerate to its fatal stop.
  if (lead) {
    const pockets = ["#2e7d4f", "#b03030", "#1c1c22", "#b03030", "#1c1c22", "#b03030", "#1c1c22", "#b03030", "#1c1c22", "#b03030", "#1c1c22", "#b03030", "#1c1c22"];
    const disc = (
      <WheelFace
        colors={pockets}
        rim="#7a5b23"
        hub="#e6bf6a"
        detail={
          <g>
            {/* pocket separators' outer frets */}
            {wheelPoints(13, 17).map((p, i) => (
              <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="0.6" fill="#e6bf6a" opacity="0.85" />
            ))}
            {/* inner bowl ring */}
            <circle cx="20" cy="20" r="8.5" fill="none" stroke="#e6bf6a" strokeWidth="0.8" opacity="0.8" />
            {/* the ivory ball, settled just off the zero pocket */}
            <circle cx="21.8" cy="7.6" r="1.5" fill="#f4f7f2" stroke="#8a8478" strokeWidth="0.5" />
          </g>
        }
      />
    );
    // Roulette's board-wide wheel was overwhelming the board; shrink the whole
    // effect to a more contained size (the other gambling wheels keep full size).
    return <WheelSpinPlay wide scale={0.55} delayMs={delayMs} disc={disc} wash="rgba(176,48,48,0.2)" boom="rgba(224,119,107,0.85)" />;
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#e0776b" strokeWidth="2" />
          <g stroke="#7a2f28" strokeWidth="1.4" fill="none"><path d="M20 3 V37 M3 20 H37 M8 8 L32 32 M32 8 L8 32" /></g>
          <circle cx="20" cy="20" r="3" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-spin absolute inset-[32%] block" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <SigShard fill="#e6bf6a" stroke="#7a5b23" variant={1} />
      </span>
    </span>
  );
}

/** Purge Line: a rank-wide bar of light sweeps across, unmaking the pieces. */
function PurgeLineBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead unmakes the WHOLE rank
  // in one stroke — a pale-gold wash while bars of purging light sweep the
  // full width of the crop.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,244,200,0.26)" delayMs={delayMs} />
        {[
          { t: "38%", d: 0 },
          { t: "50%", d: 140 },
          { t: "60%", d: 280 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-sweepbar absolute left-[-30%] block h-[3%] w-[160%] rounded-[1px]" style={{ top: b.t, background: "rgba(255,244,200,0.7)", animationDelay: `${delayMs + b.d}ms` }} />
        ))}
        <ShardBurst vectors={BURST_MED} fill="#f0e2b0" stroke="#a88a3a" delayMs={delayMs + 240} sizePct={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[2%] top-[40%] block h-[18%] rounded-[1px]" style={{ background: "rgba(255,244,200,0.6)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#f0e2b0" stroke="#a88a3a" delayMs={delayMs + 60} sizePct={9} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(255,240,190,0.7)", animationDelay: `${delayMs + 40}ms` }} />
    </span>
  );
}

/** Nerf This: lightning is called down onto the marked pieces. Reticle locks,
 * the bolt cracks, a scorch flashes; lead adds a shock ring. */
function CalldownBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Tier 5-6 pass — ORBITAL NERF STRIKE: a giant targeting reticle sweeps in
  // and locks over the board's heart, the cartoon zap column drops through it,
  // and one gold ring carries the "nerf this" out past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,214,94,0.24)" delayMs={delayMs} />
        {/* the giant lock-on reticle */}
        <span className="fx-sig-reticle absolute left-[34%] top-[28%] block h-[44%] w-[32%] rounded-full" style={{ border: "3px solid rgba(255,214,94,0.9)", animationDelay: `${delayMs + 120}ms` }}>
          <span className="absolute left-1/2 top-[-8%] block h-[14%] w-[3px] -translate-x-1/2" style={{ background: "rgba(255,214,94,0.9)" }} />
          <span className="absolute left-1/2 bottom-[-8%] block h-[14%] w-[3px] -translate-x-1/2" style={{ background: "rgba(255,214,94,0.9)" }} />
          <span className="absolute top-1/2 left-[-8%] block w-[14%] h-[3px] -translate-y-1/2" style={{ background: "rgba(255,214,94,0.9)" }} />
          <span className="absolute top-1/2 right-[-8%] block w-[14%] h-[3px] -translate-y-1/2" style={{ background: "rgba(255,214,94,0.9)" }} />
        </span>
        {/* the inner lock ring snapping tight */}
        <span
          className="fx-sig-ring absolute left-[42%] top-[39%] block h-[22%] w-[16%] rounded-full"
          style={{ border: "2px solid rgba(255,79,163,0.9)", animationDelay: `${delayMs + 380}ms` }}
        />
        {/* the zap column, dropped through the reticle */}
        <span className="fx-sig-bolt absolute left-[44%] top-[6%] block h-[44%] w-[12%]" style={{ animationDelay: `${delayMs + 520}ms` }}>
          <JagBolt />
        </span>
        <span
          className="fx-sig-flash absolute left-[42%] top-[44%] block h-[11%] w-[16%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,214,94,0.95), rgba(255,79,163,0.5) 60%, transparent 75%)", animationDelay: `${delayMs + 620}ms` }}
        />
        <span
          className="fx-sig-scorch absolute left-[45%] top-[47%] block h-[8%] w-[10%] rounded-full"
          style={{ background: "rgba(30,22,10,0.6)", animationDelay: `${delayMs + 720}ms` }}
        />
        <BoardBoom delayMs={delayMs + 700} color="rgba(255,214,94,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-reticle absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,214,94,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-bolt absolute left-[38%] top-[-4%] block h-[74%] w-[24%]" style={{ animationDelay: `${delayMs + 80}ms` }}><JagBolt /></span>
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(30,22,10,0.6)", animationDelay: `${delayMs + 200}ms` }} />
    </span>
  );
}

/** Annihilation: pieces are pulled into a void core and collapse to nothing. */
function AnnihilationBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE UNMAKER: the crop goes void-dark, violet rays split
    // the sky, and a colossal hooded archon descends holding the point of
    // nothing between its spread hands — the two unmaking darts cross into it
    // before the collapse flare and twin violet shockwaves.
    return (
      <GodEvent
        wash="rgba(16,12,20,0.3)"
        rays="rgba(164,140,196,0.65)"
        boom="rgba(164,140,196,0.85)"
        flare="rgba(201,182,224,0.6)"
        sparkFill="#a48cc4"
        sparkStroke="#463357"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the hooded archon */}
            <path d="M20 2 C15.5 2 13 5 13 9 C13 11 14 12.5 15.5 13.5 L14 20 H26 L24.5 13.5 C26 12.5 27 11 27 9 C27 5 24.5 2 20 2 Z" fill="rgba(30,22,40,0.94)" stroke="#a48cc4" strokeWidth="1" strokeLinejoin="round" />
            <path d="M17 8.5 H19 M21 8.5 H23" stroke="#c9b6e0" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M13 44 C11 33 13 22 20 22 C27 22 29 33 27 44 Z" fill="rgba(30,22,40,0.9)" stroke="#a48cc4" strokeWidth="0.9" strokeLinejoin="round" />
            {/* spread hands cradling the void core */}
            <path d="M14 24 L7 30 M26 24 L33 30" stroke="rgba(30,22,40,0.95)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="20" cy="31" r="6" fill="rgba(16,12,20,0.97)" stroke="#a48cc4" strokeWidth="1.6" />
            {/* the two unmaking darts, cancelled at one point */}
            <g stroke="#c9b6e0" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 18 L15 27 M34 18 L25 27" />
            </g>
            <g fill="#a48cc4" stroke="#463357" strokeWidth="0.6" strokeLinejoin="round">
              <path d="M14 26 L18.5 28 L16.5 30 Z" />
              <path d="M26 26 L23.5 30 L21.5 28 Z" />
            </g>
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-20%] mt-[-20%] block h-[40%] w-[40%] rounded-full"
        style={{ background: "rgba(16,12,20,0.9)", border: "1.5px solid rgba(160,140,196,0.9)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}
      />
      {BURST_BIG.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}
        >
          <SigShard fill="#a48cc4" stroke="#463357" variant={i} />
        </span>
      ))}
    </span>
  );
}

/** Meteor: a meteor slams the crossing square and a plus-shaped shock rolls
 * out along the struck rank and file. */
function MeteorCrossBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE CROSSING STAR: the sky goes ember-dark and a
    // colossal burning boulder drops straight onto the board's heart; its
    // strike flares and detonates a rank-and-file cross clean across the crop
    // beneath the twin concussion rings.
    return (
      <GodEvent
        wash="rgba(58,28,18,0.28)"
        rays="rgba(255,168,80,0.75)"
        boom="rgba(230,168,92,0.9)"
        flare="rgba(255,217,94,0.85)"
        sparkFill="#e6a85c"
        sparkStroke="#7a3a12"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the burning boulder, fire streaming up off it */}
            <g stroke="#ffd95e" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M14 2 L17 12 M20 0 L20 10 M26 2 L23 12" />
            </g>
            <path d="M20 12 C29 12 35 19 35 27 C35 36 28 42 20 42 C12 42 5 36 5 27 C5 19 11 12 20 12 Z" fill="#c66860" stroke="#7a2410" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M12 20 L18 26 L14 32 M27 18 L23 25 L28 31" fill="none" stroke="#ffd95e" strokeWidth="1.1" strokeLinejoin="round" />
            <circle cx="20" cy="27" r="4.5" fill="#ffd95e" />
          </svg>
        }
      >
        {/* the rank-and-file shock cross, detonating out under the strike */}
        <span className="fx-sig-shock absolute inset-[18%] block" style={{ animationDelay: `${delayMs + 520}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <path d="M20 2 V38 M2 20 H38" stroke="rgba(255,168,80,0.9)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-6%] top-[-6%] block h-[64%] w-[64%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L26 26" stroke="#e6a85c" strokeWidth="3" strokeLinecap="round" />
          <circle cx="28" cy="28" r="5" fill="#d98a4a" stroke="#7a3a12" strokeWidth="1.2" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[6%] block" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 2 V38 M2 20 H38" stroke="rgba(255,168,80,0.9)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 160} sizePct={11} />
    </span>
  );
}

/** Purge Realm: enemy minors are banished in a purple arcane shimmer. */
function PurgeRealmBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // God-tier pass — THE BANISHER: violet rays split the sky and a colossal
  // winged exiler descends, arms flung wide, the great dashed banishing circle
  // spinning out beneath her before the flare and twin arcane shockwaves.
  if (lead) {
    return (
      <GodEvent
        wash="rgba(164,140,196,0.22)"
        rays="rgba(201,182,224,0.75)"
        boom="rgba(164,140,196,0.85)"
        flare="rgba(201,182,224,0.7)"
        sparkFill="#c9b6e0"
        sparkStroke="#463357"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* violet wings, thrown open */}
            <path d="M14 14 C6 9 2 11 1 16 C6 16 9 18 11 21 Z" fill="rgba(201,182,224,0.7)" stroke="#463357" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M30 14 C38 9 42 11 43 16 C38 16 35 18 33 21 Z" fill="rgba(201,182,224,0.7)" stroke="#463357" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the exiler, arms flung wide in the banishing word */}
            <circle cx="22" cy="9" r="3.1" fill="#e8d3b0" stroke="#463357" strokeWidth="0.8" />
            <path d="M22 13 C18.5 13 17 16 16.5 20 L14 34 H30 L27.5 20 C27 16 25.5 13 22 13 Z" fill="rgba(90,63,160,0.82)" stroke="#3a2a63" strokeWidth="1" strokeLinejoin="round" />
            <path d="M16 18 L8 14 M28 18 L36 14" stroke="rgba(90,63,160,0.9)" strokeWidth="2.2" strokeLinecap="round" />
            {/* the banishing circle spinning out beneath */}
            <circle cx="22" cy="38" r="9" fill="none" stroke="#a48cc4" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="22" cy="38" r="5" fill="none" stroke="#c9b6e0" strokeWidth="0.7" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[20%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#a48cc4" strokeWidth="1.4" strokeDasharray="4 4" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="#c9b6e0" strokeWidth="1" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9b6e0" stroke="#463357" delayMs={delayMs + 80} sizePct={9} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(180,160,214,0.55)", animationDelay: `${delayMs}ms` }} />
    </span>
  );
}

const RUIN_CHUNKS = [
  { left: "30%", top: "26%", w: "20%", c: "#8c8c92", d: 0 },
  { left: "52%", top: "32%", w: "16%", c: "#71717a", d: 50 },
  { left: "36%", top: "46%", w: "22%", c: "#9a9a9f", d: 90 },
];

/** Ruin: the piece crumbles into a heap of rubble with a puff of dust. */
function RuinBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE BREAKER BELOW: dead grey light wells up out of the
    // ground and a colossal ruined earth-god heaves halfway out of the board,
    // already crumbling, tearing the fissure open across the crop as it comes.
    return (
      <GodEvent
        wash="rgba(40,40,46,0.28)"
        rays="rgba(140,140,146,0.55)"
        boom="rgba(120,116,110,0.85)"
        flare="rgba(154,154,159,0.65)"
        sparkFill="#8c8c92"
        sparkStroke="#28282e"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the broken earth-god: cracked head, one shoulder already gone */}
            <path d="M14 12 C14 6 17 3 21 3 C25 3 28 6 27 11 L25 12 L26 8 L23 11 L22 6 L20 10 L18 7 L18 12 Z" fill="rgba(113,113,122,0.95)" stroke="#28282e" strokeWidth="1" strokeLinejoin="round" />
            <path d="M17 8.5 H19 M22 8.5 H24" stroke="#e6a85c" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M10 44 L9 30 C9 21 13 15 20 14 C27 15 31 20 31 27 L33 25 L31 33 L29 44 Z" fill="rgba(140,140,146,0.9)" stroke="#28282e" strokeWidth="1.2" strokeLinejoin="round" />
            {/* crumbling shards falling off it */}
            <g fill="#71717a" stroke="rgba(40,40,46,0.85)" strokeWidth="0.7">
              <path d="M31 16 L35 15 L36 19 L32 20 Z" />
              <path d="M34 24 L37 23.5 L37.5 27 L34.5 27.5 Z" />
            </g>
            {/* the great crack running down its chest into the board */}
            <path d="M20 16 L18 24 L22 28 L19 36 L23 44" fill="none" stroke="rgba(20,20,24,0.9)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        }
      >
        {/* the fissure, torn across the whole crop at its feet */}
        <span className="fx-sig-streak absolute left-[24%] top-[56%] block h-[16%] w-[52%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
          <svg viewBox="0 0 48 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 6 L12 8 L10 12 L24 10 L22 14 L36 11 L34 15 L48 12" fill="none" stroke="rgba(20,20,24,0.9)" strokeWidth="3" strokeLinejoin="round" />
            <path d="M0 6 L12 8 L10 12 L24 10 L22 14 L36 11 L34 15 L48 12" fill="none" stroke="#8c8c92" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {RUIN_CHUNKS.map((s, i) => (
        <span
          key={i}
          className="fx-sig-crumble absolute block rounded-[1px]"
          style={{ left: s.left, top: s.top, width: s.w, height: s.w, background: s.c, border: "1px solid rgba(40,40,46,0.8)", animationDelay: `${delayMs + s.d}ms` }}
        />
      ))}
      <span className="fx-sig-ash absolute inset-x-[24%] bottom-[10%] block h-[20%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

// -- Effect-data spectacles (inert-until-wired, keyed like their peers) --

const CAVALRY_DASHES = [
  { top: "58%", d: 0 },
  { top: "70%", d: 80 },
  { top: "82%", d: 160 },
];

/** Banner of War: the war banner runs up its pole and the cavalry surges past,
 * a charging horse lunging forward under a trail of speed-dashes. */
function BannerWarBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[36%] top-[2%] block h-[54%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 34" className="h-full w-full" aria-hidden="true">
          <path d="M6 34 V2" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M6 3 H21 L17 8 L21 13 H6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-gallop absolute left-[8%] bottom-[10%] block h-[36%] w-[46%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden="true">
          <path d="M2 26 C6 18 10 16 16 16 L20 10 L24 12 L22 16 C30 16 36 20 38 26 L30 24 L32 27 L26 25 L20 26 L14 24 L16 27 L10 25 Z" fill="#c66860" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      {CAVALRY_DASHES.map((s, i) => (
        <span
          key={i}
          className="fx-sig-afterimage absolute left-[8%] block h-[5%] w-[40%] rounded-[1px]"
          style={{ top: s.top, background: "rgba(224,119,107,0.75)", animationDelay: `${delayMs + 120 + s.d}ms` }}
        />
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(224,119,107,0.5)", animationDelay: `${delayMs + 160}ms` }} />}
    </span>
  );
}

/** Ice Age: a heavy glacier slab heaves up and slams the square, shedding
 * frost shards; lead flashes a boardwide rime. */
function IceAgeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — THE GLACIER TAKES THE FIELD: letterbox bars drop,
    // frost panes race ahead across the ranks, and then an ENTIRE GLACIER —
    // a mile-high wall of jagged blue ice with a whole mammoth visibly frozen
    // inside it — grinds across the full width of the board, shedding bergy
    // bits and landing a TRIPLE rime shockwave as it ploughs through.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(198,234,255,0.3)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* frost panes racing ahead of it */}
        {[
          { t: 30, d: 100 },
          { t: 46, d: 220 },
          { t: 62, d: 340 },
        ].map((p, i) => (
          <span
            key={i}
            className="gp-pane absolute block"
            style={{
              left: "12%",
              top: `${p.t}%`,
              width: "76%",
              height: "7%",
              background: "linear-gradient(90deg, rgba(230,246,255,0.6), rgba(198,234,255,0.3) 70%, transparent)",
              animationDelay: `${delayMs + p.d}ms`,
            }}
          />
        ))}
        {/* THE GLACIER, mammoth and all */}
        <span className="gp-glide absolute left-[18%] top-[25%] block h-[43%] w-[64%]" style={{ animationDelay: `${delayMs + 300}ms` }}>
          <svg viewBox="0 0 80 43" className="h-full w-full" aria-hidden="true">
            {/* the wall of ice */}
            <path
              d="M0 43 L2 24 L8 28 L12 10 L20 18 L26 3 L34 14 L42 6 L50 16 L58 2 L66 13 L72 7 L78 20 L80 43 Z"
              fill="rgba(160,196,224,0.92)"
              stroke="#3f6f9f"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* facet lines */}
            <path d="M12 14 L16 28 L12 40 M34 18 L30 30 L34 41 M58 8 L62 24 L58 38 M72 12 L70 28 L74 40" fill="none" stroke="rgba(63,111,159,0.5)" strokeWidth="0.8" />
            {/* the mammoth, frozen mid-stride inside it */}
            <g opacity="0.75">
              <path d="M32 38 L32 33 C30.5 29 32 24.5 36 22.5 C39 21 45 21 48.5 23.5 C52 25.5 53 30 51.5 33 L51.5 38 H48 L48 34 H45 L45 38 H38 L38 34 H35 L35 38 Z" fill="rgba(74,90,110,0.85)" stroke="#2c3e50" strokeWidth="0.9" strokeLinejoin="round" />
              <path d="M49.5 26 C52 27.5 52.8 30.5 51.5 33" fill="none" stroke="#2c3e50" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M48 28 C51.5 28 54 30 54.8 33.4 C52 32.6 49.5 33 48 34" fill="rgba(235,250,255,0.95)" stroke="#7fb8dd" strokeWidth="0.7" strokeLinejoin="round" />
              <circle cx="47" cy="25.5" r="0.8" fill="#1c3a5e" />
            </g>
            {/* the ice sheen over him */}
            <path d="M28 20 L56 20 L58 36 L30 38 Z" fill="rgba(230,246,255,0.28)" />
          </svg>
        </span>
        {/* bergy bits shed off the leading edge */}
        <ShardBurst vectors={BURST_BIG} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 900} sizePct={5} />
        {/* the grind past centre: whiteout flare + TRIPLE rime shockwave */}
        <span
          className="gp-flash absolute left-[36%] top-[44%] block h-[16%] w-[28%] rounded-full"
          style={{ background: "rgba(235,250,255,0.8)", animationDelay: `${delayMs + 1260}ms` }}
        />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1320 + i * 170} color="rgba(230,246,255,0.85)" thickness={4 - i} />
        ))}
        <ShardBurst vectors={BURST_MED} fill="#bfe6ff" stroke="#3f6f9f" delayMs={delayMs + 1680} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-slab absolute inset-x-[10%] bottom-[8%] top-[16%] block rounded-[1px]" style={{ background: "rgba(198,234,255,0.42)", border: "1.5px solid rgba(224,246,255,0.85)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#e6f6ff" stroke="#7fb8dd" delayMs={delayMs + 80} sizePct={11} />
    </span>
  );
}

/** World End: the whole army seizes under an apocalyptic frost that shudders
 * the ground; lead flashes the wave. */
function WorldEndBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE PALLBEARER OF WORLDS: ashen rays split the sky and
    // a colossal grey seraph descends bearing the dying world in its hands —
    // the globe's killing crack splits as it is set down on the board in a
    // cold flare and twin dead-grey shockwaves.
    return (
      <GodEvent
        wash="rgba(198,220,240,0.26)"
        rays="rgba(219,233,245,0.7)"
        boom="rgba(219,233,245,0.85)"
        flare="rgba(238,244,250,0.7)"
        sparkFill="#dbe9f5"
        sparkStroke="#7f93a8"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* grey mourning wings folded around the world */}
            <path d="M8 14 C2 10 0 13 1 18 C5 18 7 20 9 23 Z" fill="rgba(219,233,245,0.6)" stroke="#7f93a8" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M36 14 C42 10 44 13 43 18 C39 18 37 20 35 23 Z" fill="rgba(219,233,245,0.6)" stroke="#7f93a8" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the bowed bearer above it */}
            <circle cx="22" cy="6" r="2.8" fill="#e8eef6" stroke="#7f93a8" strokeWidth="0.8" />
            <path d="M22 9 C18 9 15 12 14 17 L10 25 M22 9 C26 9 29 12 30 17 L34 25" stroke="rgba(160,178,196,0.9)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* the dying world in its hands */}
            <circle cx="22" cy="27" r="14" fill="rgba(40,50,64,0.6)" stroke="#dbe9f5" strokeWidth="1.5" />
            <path d="M22 13 A 14 14 0 0 0 22 41 A 7 14 0 0 0 22 13 A 7 14 0 0 1 22 41" fill="none" stroke="rgba(219,233,245,0.6)" strokeWidth="0.8" />
            <path d="M8 27 H36 M10.5 20 H33.5 M10.5 34 H33.5" stroke="rgba(219,233,245,0.5)" strokeWidth="0.7" fill="none" />
            {/* the killing crack */}
            <path d="M15 15 L20 21 L17 25 L25 29 L22 34 L28 39" fill="none" stroke="rgba(16,20,26,0.95)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M15 15 L20 21 L17 25 L25 29 L22 34 L28 39" fill="none" stroke="#eef4fa" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-quake absolute inset-[8%] block rounded-[1px]" style={{ background: "rgba(198,220,240,0.4)", border: "1.5px solid rgba(210,232,248,0.85)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#dbe9f5" stroke="#7f93a8" delayMs={delayMs + 80} sizePct={10} />
    </span>
  );
}

/** Rust: idle pieces seize up under a bloom of corrosion. */
function RustLockBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 11 upgrade: the lead square spreads the corrosion board-wide — a
  // rust-brown wash creeps over the whole crop while oxide patches wipe in one
  // after another and a ring of flakes scatters.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,90,50,0.22)" delayMs={delayMs} />
        {[
          { l: "26%", t: "34%", w: "16%", h: "7%", d: 0 },
          { l: "48%", t: "52%", w: "20%", h: "8%", d: 140 },
          { l: "60%", t: "30%", w: "14%", h: "6%", d: 260 },
          { l: "34%", t: "60%", w: "17%", h: "7%", d: 380 },
        ].map((p, i) => (
          <span key={i} className="fx-sig-frost absolute block rounded-[2px]" style={{ left: p.l, top: p.t, width: p.w, height: p.h, background: "rgba(150,90,50,0.5)", border: "1px solid rgba(120,70,40,0.8)", animationDelay: `${delayMs + p.d}ms` }} />
        ))}
        <ShardBurst vectors={BURST_MED} fill="#a86a3a" stroke="#5a3418" delayMs={delayMs + 300} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-[16%] block rounded-[1px]" style={{ background: "rgba(150,90,50,0.42)", border: "1px solid rgba(120,70,40,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#a86a3a" stroke="#5a3418" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

/** Mass Petrify: a wave of stone climbs the minors, shedding grey chips. */
function MassPetrifyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // APEX pass (tier 9) — THE GAZE THAT SWEEPS THE BOARD: a single COLOSSAL
  // gorgon eye opens across the whole sky, serpent-lashed, and its slit pupil
  // runs a petrifying scan-beam across the board like a photocopier of doom —
  // stone hardens file by file in the beam's wake, statues pop where pieces
  // stood, and the gaze rolls out in rings with a double stone shockwave.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,150,158,0.32)" delayMs={delayMs} />
        {/* THE EYE, opening across the sky (and blinking, because it must) */}
        <span className="gp-eyes absolute left-[29%] top-[8%] block h-[15%] w-[42%]" style={{ animationDelay: `${delayMs + 140}ms`, animationDuration: "2.5s" }}>
          <svg viewBox="0 0 42 15" className="h-full w-full" aria-hidden="true">
            {/* serpent lashes */}
            <g stroke="#8fb59a" strokeWidth="1" fill="none" strokeLinecap="round">
              <path d="M8 4 C6 2 6 0.8 8 0.4 M15 2.5 C14 0.8 14.6 0 16.4 0.2 M26 2.5 C27 0.8 26.4 0 24.6 0.2 M34 4 C36 2 36 0.8 34 0.4" />
            </g>
            {/* the almond eye */}
            <path d="M2 8 C9 2.5 33 2.5 40 8 C33 13.5 9 13.5 2 8 Z" fill="rgba(190,190,198,0.95)" stroke="#5b6672" strokeWidth="1.1" strokeLinejoin="round" />
            {/* iris + slit pupil */}
            <circle cx="21" cy="8" r="3.8" fill="#8fb59a" stroke="#3a5a40" strokeWidth="0.7" />
            <ellipse cx="21" cy="8" rx="0.9" ry="3" fill="#1c241c" />
          </svg>
        </span>
        {/* the scan-beam, sweeping the whole board */}
        <span className="gp-scan absolute left-[43%] top-[21.5%] block h-[57%] w-[14%]" style={{ animationDelay: `${delayMs + 560}ms` }}>
          <svg viewBox="0 0 14 57" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M5 0 H9 L14 57 H0 Z" fill="rgba(143,181,154,0.45)" />
            <path d="M6.4 0 H7.6 L8.4 57 H5.6 Z" fill="rgba(190,190,198,0.7)" />
          </svg>
        </span>
        {/* stone takes the files in the beam's wake */}
        {[
          { l: 28, d: 800 },
          { l: 40, d: 1000 },
          { l: 52, d: 1200 },
          { l: 64, d: 1400 },
        ].map((c, i) => (
          <span
            key={i}
            className="gp-drape absolute block"
            style={{ left: `${c.l}%`, top: "21.5%", width: "8%", height: "57%", background: "rgba(141,141,148,0.42)", animationDelay: `${delayMs + c.d}ms` }}
          />
        ))}
        {/* statues pop where pieces stood */}
        {[
          { l: 33, t: 40, d: 1050, k: "knight" as const },
          { l: 57, t: 52, d: 1300, k: "bishop" as const },
        ].map((v, i) => (
          <span key={i} className="gp-pop absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "10%", animationDelay: `${delayMs + v.d}ms` }}>
            <ApexPiece kind={v.k} fill="rgba(150,150,158,0.95)" stroke="#5b6672" />
          </span>
        ))}
        {/* the gaze rolls out: rings + flare + double stone shockwave */}
        {[0, 130, 260].map((d, i) => (
          <span
            key={i}
            className="gp-gaze absolute block rounded-full"
            style={{
              left: "26%",
              top: "24%",
              width: "48%",
              height: "48%",
              border: `${i === 0 ? 4 : 2.5}px solid ${i % 2 ? "rgba(143,181,154,0.85)" : "rgba(154,154,159,0.85)"}`,
              animationDelay: `${delayMs + 1560 + d}ms`,
            }}
          />
        ))}
        <span
          className="gp-flash absolute left-[40%] top-[42%] block h-[13%] w-[20%] rounded-full"
          style={{ background: "rgba(190,190,198,0.75)", animationDelay: `${delayMs + 1520}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#9a9a9f" stroke="#5b6672" delayMs={delayMs + 1580} sizePct={6} />
        <BoardBoom delayMs={delayMs + 1650} color="rgba(154,154,159,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 1840} color="rgba(143,181,154,0.8)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-petrify absolute bottom-[8%] left-[18%] right-[18%] top-[10%] block rounded-[1px]" style={{ background: "rgba(150,150,158,0.66)", border: "1px solid rgba(120,120,128,0.7)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#9a9a9f" stroke="#5b6672" delayMs={delayMs + 100} sizePct={9} />
    </span>
  );
}

/** Walnut Queen: a walnut shell closes over the queen, a stone leaf drifting
 * off; lead is a small settle. */
function WalnutCurseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(150,110,66,0.24)" boom="rgba(93,58,30,0.85)" delayMs={delayMs} motifClass="fx-sig-grow">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 C31 4 36 13 36 22 C36 32 29 38 20 38 C11 38 4 32 4 22 C4 13 9 4 20 4 Z" fill="rgba(150,110,66,0.85)" stroke="#5d3a1e" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M20 5 V37 M8 16 C16 20 24 20 32 16 M8 28 C16 24 24 24 32 28" stroke="#5d3a1e" strokeWidth="1" fill="none" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 C31 4 36 13 36 22 C36 32 29 38 20 38 C11 38 4 32 4 22 C4 13 9 4 20 4 Z" fill="rgba(150,110,66,0.85)" stroke="#5d3a1e" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M20 5 V37 M8 16 C16 20 24 20 32 16 M8 28 C16 24 24 24 32 28" stroke="#5d3a1e" strokeWidth="1" fill="none" />
        </svg>
      </span>
    </span>
  );
}

/** Amazon: the queen is crowned an Amazon, a knight-jump arc tracing over the
 * lowered crown. */
function AmazonCrownBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE AMAZON APOTHEOSIS: violet-gold rays split the sky
    // and a colossal Amazon ascendant descends — crown settling, the
    // knight-leap arc blazing across her — before the flare and twin rings.
    return (
      <GodEvent
        wash="rgba(230,191,106,0.24)"
        rays="rgba(230,191,106,0.8)"
        boom="rgba(168,119,216,0.85)"
        flare="rgba(255,236,178,0.75)"
        sparkFill="#e6bf6a"
        sparkStroke="#7a5b23"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the settling crown */}
            <path d="M13 9 L14 3.5 L17 6.5 L20 2 L23 6.5 L26 3.5 L27 9 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="20" cy="13" r="3.2" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            {/* the ascendant, sword sheathed at her back */}
            <path d="M20 17 C16.5 17 15 20 14.5 24 L11 43 H29 L25.5 24 C25 20 23.5 17 20 17 Z" fill="rgba(168,119,216,0.85)" stroke="#4a2a6e" strokeWidth="1" strokeLinejoin="round" />
            <path d="M27 18 L33 6 M31.5 8.5 L35 10" stroke="#c9d2dc" strokeWidth="1.4" strokeLinecap="round" />
            {/* the knight-leap arc blazing across her */}
            <path d="M8 34 C8 22 16 15 26 15 L24 11 L30 13 L28 19" fill="none" stroke="#a877d8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[28%] top-[8%] block h-[30%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}><SigCrown /></span>
      <span className="fx-sig-arc absolute inset-[18%] block" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M10 32 C10 18 18 12 26 12 L24 8 L30 10 L28 16" fill="none" stroke="#a877d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Titan Legion: stone shells grow over the chosen pieces, each stomping a
 * ring; lead adds a gold shock. */
function TitanLegionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE LEGION STANDS: forge-light blazes up out of the
    // board and THREE colossal titans shoulder up over the crop in a
    // staggered rank, their formation landing a flare and twin gold rings.
    return (
      <GodEvent
        wash="rgba(150,150,158,0.24)"
        rays="rgba(230,191,106,0.6)"
        boom="rgba(230,191,106,0.85)"
        flare="rgba(255,236,178,0.7)"
        sparkFill="#d8a85a"
        sparkStroke="#4c4c53"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 64 44" className="h-full w-full" aria-hidden="true">
            {[
              { x: 0, s: 0.82, y: 8 },
              { x: 40, s: 0.9, y: 5 },
              { x: 19, s: 1, y: 0 },
            ].map((t, i) => (
              <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
                <path
                  d="M8 44 V32 C5 31 3 28 3 24 L0 25 L3 21 C4 15 7 11 11 10 C10.5 7 12 5 13 5 C14 5 15.5 7 15 10 C19 11 22 15 23 21 L26 25 L23 24 C23 28 21 31 18 32 V44 Z"
                  fill={i === 2 ? "rgba(140,140,148,0.9)" : "rgba(120,120,128,0.75)"}
                  stroke="#4c4c53"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path d="M10 16 H16" stroke="#e6bf6a" strokeWidth="1.1" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        }
      />
    );
  }
  const rings = [
    { i: "26%", d: 0 },
    { i: "16%", d: 80 },
    { i: "8%", d: 160 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {rings.map((r, k) => (
        <span key={k} className="fx-sig-grow absolute block rounded-full" style={{ top: r.i, left: r.i, right: r.i, bottom: r.i, border: "2px solid rgba(150,150,158,0.85)", animationDelay: `${delayMs + r.d}ms` }} />
      ))}
    </span>
  );
}

/** Living God: THE FINGER OF GOD (owner directive: not a generic wash — and
 * now RIDICULOUS). The clouds part, gold floods the board, and a colossal
 * haloed hand lowers out of the heavens to TAP the chosen piece once. */
function LivingGodBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // APEX pass (tier 9) — THE FINGER OF GOD: the clouds physically part like
    // stage curtains, gold floods through the gap, and a COLOSSAL haloed hand
    // lowers out of the heavens, index finger extended... hovers... and TAPS
    // the chosen piece once. The tap lands a blinding flare, a fan of rays,
    // and a TRIPLE divine shockwave before the hand withdraws into the light.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,244,200,0.3)" delayMs={delayMs} />
        {/* the clouds part */}
        <span className="gp-doorl absolute left-[8%] top-[7%] block h-[15%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 44 15" className="h-full w-full" aria-hidden="true">
            <path d="M0 13 Q3 6 9 8 Q11 2 18 4 Q25 0 31 5 Q39 3 41 9 Q44 10 44 13 Z" fill="rgba(255,244,200,0.85)" stroke="rgba(185,138,46,0.6)" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="gp-doorr absolute left-[48%] top-[7%] block h-[15%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 44 15" className="h-full w-full" aria-hidden="true">
            <path d="M0 13 Q0 10 3 9 Q5 3 13 5 Q19 0 26 4 Q33 2 35 8 Q41 6 44 13 Z" fill="rgba(255,244,200,0.85)" stroke="rgba(185,138,46,0.6)" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
        {/* god-rays through the gap */}
        {GOD_FAN.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-[6%] block h-[62%]"
            style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r})`, transformOrigin: "50% 0%" }}
          >
            <span
              className="fx-sig-shaft absolute inset-0 block"
              style={{
                background: "linear-gradient(180deg, rgba(255,244,200,0.85), rgba(255,220,130,0.25) 70%, transparent)",
                animationDelay: `${delayMs + 280 + s.d}ms`,
              }}
            />
          </span>
        ))}
        {/* THE HAND, lowering with one finger extended */}
        <span className="gp-handofgod absolute left-[34%] top-[12%] block h-[42%] w-[30%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
          <svg viewBox="0 0 34 42" className="h-full w-full" aria-hidden="true">
            {/* the halo around the wrist */}
            <ellipse cx="17" cy="7" rx="12" ry="4" fill="none" stroke="#ffe896" strokeWidth="1.4" />
            {/* the sleeve of heaven */}
            <path d="M8 0 H26 L24.5 9 H9.5 Z" fill="rgba(255,236,178,0.92)" stroke="#b98a2e" strokeWidth="1" strokeLinejoin="round" />
            {/* the hand: three curled fingers + thumb, index extended DOWN */}
            <path d="M9.5 9 C8.5 15 9 20 11 24 C12.5 26.5 15 27.5 18 27 L20.5 26 C23.5 24.5 25 21 24.5 16 L24 9 Z" fill="#ffe9b0" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            <path d="M12.5 24.5 C12 27 12.5 28.5 14 29 C15.5 29.4 16.5 28.5 17 26.8 M17.5 26.8 C17.3 29 18 30.2 19.5 30.2 C21 30.2 21.7 29 21.5 26.5" fill="none" stroke="#8a6414" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M24.5 14 C27.5 14.5 29 16.5 28.5 19 C28 21 26 21.8 24.5 21" fill="none" stroke="#8a6414" strokeWidth="0.9" strokeLinecap="round" />
            {/* THE FINGER */}
            <path d="M13.5 26 C13 31 13.2 35.5 14.2 39.5 C14.6 41 16.8 41 17.2 39.5 C18 35.5 18 30.5 17.4 25.5 Z" fill="#ffe9b0" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            <path d="M14.4 38.6 C15.2 39.4 16.2 39.4 17 38.6" fill="none" stroke="rgba(138,100,20,0.6)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* THE TAP: blinding flare + gilded sparks + TRIPLE divine shockwave */}
        <span
          className="gp-flash absolute left-[38%] top-[52%] block h-[15%] w-[24%] rounded-full"
          style={{ background: "rgba(255,232,150,0.9)", animationDelay: `${delayMs + 1580}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 1620} sizePct={7} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1660 + i * 170} color="rgba(255,232,150,0.9)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[36%] top-0 block h-[80%] w-[28%]" style={{ background: "rgba(255,244,200,0.55)", animationDelay: `${delayMs}ms` }} />
      {/* halo ring settles around the ascended piece */}
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(255,232,150,0.95)", animationDelay: `${delayMs + 100}ms` }} />
      <span className="fx-sig-crown absolute left-[30%] top-[10%] block h-[26%] w-[40%]" style={{ animationDelay: `${delayMs + 120}ms` }}><SigCrown /></span>
      <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 160} sizePct={9} />
    </span>
  );
}

/** Eternal Reign: a crown lowers inside an enduring ward ring; lead glints. */
function EternalReignBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE REIGN WITHOUT END: gold rays split the sky and a
    // colossal enthroned sovereign descends, the crown settling over him as
    // the unbroken infinity blazes across his throne; the coronation lands a
    // flare and twin gilded shockwaves.
    return (
      <GodEvent
        wash="rgba(230,191,106,0.24)"
        rays="rgba(255,240,190,0.85)"
        boom="rgba(255,240,190,0.85)"
        flare="rgba(255,236,178,0.8)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the throne back */}
            <path d="M9 44 V14 C9 10 12 8 14 8 M31 44 V14 C31 10 28 8 26 8" fill="none" stroke="#7a5b23" strokeWidth="1.6" strokeLinecap="round" />
            {/* the crown, lowering onto the sovereign */}
            <path d="M13 8 L13 2.5 L16.5 5 L20 1 L23.5 5 L27 2.5 L27 8 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
            <circle cx="16.5" cy="6.8" r="0.7" fill="#7a5b23" />
            <circle cx="20" cy="6.8" r="0.7" fill="#7a5b23" />
            <circle cx="23.5" cy="6.8" r="0.7" fill="#7a5b23" />
            {/* the sovereign */}
            <circle cx="20" cy="12.5" r="3" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M20 16 C16.5 16 15 19 14.5 23 L12 42 H28 L25.5 23 C25 19 23.5 16 20 16 Z" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="1" strokeLinejoin="round" />
            {/* the infinity, blazing across the throne's foot */}
            <path
              d="M20 34 C16 29 10 29 8 33 C6 37 10 40 14 38 C17 36.5 18 35.5 20 34 C24 29 30 29 32 33 C34 37 30 40 26 38 C23 36.5 22 35.5 20 34 Z"
              fill="none"
              stroke="#ffe9b0"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(230,191,106,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crown absolute left-[28%] top-[8%] block h-[30%] w-[44%]" style={{ animationDelay: `${delayMs + 80}ms` }}><SigCrown /></span>
    </span>
  );
}

/** Godslayer Knight: a great smiting blade drops through the knight, throwing
 * gilded sparks; lead flashes silver. */
function GodslayerBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE GODSLAYER CONSECRATED: silver rays split the sky
    // and a COLOSSAL smiting blade descends point-first through a broken halo
    // — the weapon that ends gods — striking the board in a white flare and
    // twin silver shockwaves.
    return (
      <GodEvent
        wash="rgba(214,232,246,0.24)"
        rays="rgba(227,236,244,0.85)"
        boom="rgba(227,236,244,0.85)"
        flare="rgba(240,246,252,0.8)"
        sparkFill="#e3ecf4"
        sparkStroke="#5b6672"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the broken halo it falls through */}
            <path d="M8 12 A 12 7 0 0 1 26 8 M32 12 A 12 7 0 0 1 30 16" fill="none" stroke="#e6bf6a" strokeWidth="1.4" strokeLinecap="round" />
            {/* the colossal blade, point-first */}
            <path d="M20 43 L17 14 L20 2 L23 14 Z" fill="#e3ecf4" stroke="#5b6672" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M20 6 V38" stroke="rgba(91,102,114,0.5)" strokeWidth="0.7" />
            {/* gilded crossguard + grip */}
            <path d="M11 16 H29" stroke="#7a5b23" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M20 16 V10" stroke="#e6bf6a" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="8.5" r="1.6" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" />
            {/* sparks shearing off the edge */}
            <path d="M15 26 L11 24 M25 30 L29 28 M16 34 L12 34" stroke="#e6bf6a" strokeWidth="1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute inset-[6%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 36 L18 12 L20 4 L22 12 Z" fill="#e3ecf4" stroke="#5b6672" strokeWidth="1" strokeLinejoin="round" />
          <path d="M14 14 H26" stroke="#7a5b23" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 140} sizePct={9} />
    </span>
  );
}

/** Onslaught: three war-charge lunges roll forward in sequence; lead flashes. */
function OnslaughtBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE WAR GOD'S SIGNAL: crimson rays split the sky and a
    // colossal horned war god descends, warhorn raised — the three war-charge
    // arrows punching across the crop at his call before the flare and twin
    // crimson shockwaves.
    return (
      <GodEvent
        wash="rgba(224,119,107,0.24)"
        rays="rgba(224,119,107,0.75)"
        boom="rgba(224,119,107,0.85)"
        flare="rgba(255,181,168,0.7)"
        sparkFill="#e0776b"
        sparkStroke="#7a2f28"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* horned war-helm */}
            <path d="M12 8 C9 5 9 2 12 1 C13 4 13.5 6 13.5 8 Z M28 8 C31 5 31 2 28 1 C27 4 26.5 6 26.5 8 Z" fill="#c9d2dc" stroke="#5b6672" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M14 12 C14 7 16.5 5 20 5 C23.5 5 26 7 26 12 V14 H14 Z" fill="#c66860" stroke="#7a2f28" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M16.5 10.5 H18.5 M21.5 10.5 H23.5" stroke="#ffd166" strokeWidth="1.1" strokeLinecap="round" />
            {/* war-coat */}
            <path d="M20 15 C16 15 14.5 18 14 22 L11 43 H29 L26 22 C25.5 18 24 15 20 15 Z" fill="rgba(198,104,96,0.9)" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            {/* the raised warhorn */}
            <path d="M26 20 L34 13 C36 11.5 38 12 38.5 14 C36.5 14.5 34.5 16 33 18 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the three war-charge arrows at his call */}
            <g stroke="#e0776b" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M2 28 H12 M2 34 H15 M2 40 H18" />
            </g>
            <g fill="#e0776b" stroke="#7a2f28" strokeWidth="0.6" strokeLinejoin="round">
              <path d="M12 25.5 L17 28 L12 30.5 Z" />
              <path d="M15 31.5 L20 34 L15 36.5 Z" />
              <path d="M18 37.5 L23 40 L18 42.5 Z" />
            </g>
          </svg>
        }
      />
    );
  }
  const dashes = [
    { top: "32%", d: 0 },
    { top: "50%", d: 70 },
    { top: "68%", d: 140 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {dashes.map((s, i) => (
        <span key={i} className="fx-sig-gallop absolute left-[6%] block h-[8%] w-[52%] rounded-[1px]" style={{ top: s.top, background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + s.d}ms` }} />
      ))}
    </span>
  );
}

/** Resurrection: a shaft of holy light and the fallen rise back in glory; lead
 * rings the halo. */
function ResurrectionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — THE PEARLY GATES: two colossal gilded gates swing
    // open across the top of the sky, grave-gold light floods the board
    // through the gap, little tombstones pop up across the ranks — and then
    // the fallen climb back out of the ground, haloed and slightly confused,
    // as a TRIPLE grave-light shockwave rolls the returning out.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,242,192,0.26)" delayMs={delayMs} />
        {/* the gates swing open */}
        {(["l", "r"] as const).map((side) => (
          <span
            key={side}
            className={`${side === "l" ? "gp-doorl" : "gp-doorr"} absolute top-[5%] block h-[19%] w-[21%]`}
            style={{ left: side === "l" ? "29%" : "50%", animationDelay: `${delayMs + 140}ms` }}
          >
            <svg viewBox="0 0 21 19" className="h-full w-full" aria-hidden="true" style={side === "r" ? { transform: "scaleX(-1)" } : undefined}>
              {/* the arched gate half, barred in gold */}
              <path d="M1 19 V6 C1 2.5 6 0.5 20 0.5 L20 19 Z" fill="rgba(255,246,210,0.55)" stroke="#c9a244" strokeWidth="1.1" strokeLinejoin="round" />
              <path d="M5 19 V3.4 M9.5 19 V1.6 M14 19 V0.9 M1 10 H20 M1 14.5 H20" stroke="#c9a244" strokeWidth="0.8" fill="none" />
              <circle cx="18" cy="10" r="0.9" fill="#e6bf6a" />
            </svg>
          </span>
        ))}
        {/* grave-gold light floods through the gap */}
        {GOD_FAN.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-[8%] block h-[58%]"
            style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r})`, transformOrigin: "50% 0%" }}
          >
            <span
              className="fx-sig-shaft absolute inset-0 block"
              style={{ background: "linear-gradient(180deg, rgba(255,242,192,0.8), transparent 78%)", animationDelay: `${delayMs + 420 + s.d}ms` }}
            />
          </span>
        ))}
        {/* tombstones pop up across the ranks... */}
        {[
          { l: 30, t: 54, d: 520 },
          { l: 62, t: 50, d: 660 },
        ].map((v, i) => (
          <span key={i} className="gp-pop absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "7%", animationDelay: `${delayMs + v.d}ms` }}>
            <svg viewBox="0 0 11 14" className="h-full w-full" aria-hidden="true">
              <path d="M1 14 V6 C1 2.5 3 1 5.5 1 C8 1 10 2.5 10 6 V14 Z" fill="rgba(180,170,150,0.95)" stroke="#8a7a5a" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M3.5 6 H7.5 M3.5 8.5 H7.5" stroke="#8a7a5a" strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* ...and the fallen climb back out, haloed */}
        {[
          { l: 34, t: 36, d: 720, k: "rook" as const },
          { l: 46, t: 32, d: 920, k: "queen" as const },
          { l: 58, t: 38, d: 1120, k: "knight" as const },
        ].map((v, i) => (
          <span key={i} className="gp-rise absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "8%", height: "22%", animationDelay: `${delayMs + v.d}ms`, animationDuration: "1.5s" }}>
            <span className="absolute left-[10%] right-[10%] top-0 block h-[22%]">
              <svg viewBox="0 0 20 5" className="h-full w-full" aria-hidden="true">
                <ellipse cx="10" cy="2.5" rx="9" ry="2" fill="none" stroke="rgba(255,233,176,0.9)" strokeWidth="1" />
              </svg>
            </span>
            <span className="absolute inset-x-[8%] bottom-0 top-[18%] block">
              <ApexPiece kind={v.k} fill="rgba(255,246,210,0.92)" stroke="#c9a244" />
            </span>
          </span>
        ))}
        {/* the returning lands: flare + sparks + TRIPLE grave-light shockwave */}
        <span
          className="gp-flash absolute left-[36%] top-[50%] block h-[14%] w-[28%] rounded-full"
          style={{ background: "rgba(255,246,210,0.8)", animationDelay: `${delayMs + 1560}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#fff2c0" stroke="#c9a244" delayMs={delayMs + 1600} sizePct={7} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1640 + i * 170} color="rgba(201,162,68,0.85)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[36%] top-0 block h-[80%] w-[28%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute left-[32%] bottom-[10%] block h-[54%] w-[36%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <circle cx="12" cy="8" r="4.4" fill="rgba(255,246,210,0.85)" stroke="#c9a244" strokeWidth="1" />
          <path d="M5 30 C6 20 8 15 12 15 C16 15 18 20 19 30 Z" fill="rgba(255,246,210,0.85)" stroke="#c9a244" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#fff2c0" stroke="#c9a244" delayMs={delayMs + 140} sizePct={9} />
    </span>
  );
}

/** Grand Resurrection: twin light shafts and a crown descend as the queen and a
 * minor return; lead rings. */
function GrandReviveBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE QUEEN RETURNS IN GLORY: grave-gold light wells up
    // out of the board and the queen and her minor rise COLOSSAL over the
    // crop, both haloed, before the flare and twin gilded shockwaves.
    return (
      <GodEvent
        wash="rgba(255,242,192,0.24)"
        rays="rgba(255,242,192,0.75)"
        boom="rgba(255,242,192,0.85)"
        flare="rgba(255,246,210,0.75)"
        sparkFill="#fff2c0"
        sparkStroke="#c9a244"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 40" className="h-full w-full" aria-hidden="true">
          {/* the returning queen, haloed */}
          <g>
            <circle cx="16" cy="10" r="8" fill="none" stroke="rgba(255,233,176,0.8)" strokeWidth="1.2" />
            <path d="M10 14 L10 8.5 L13 11 L16 6 L19 11 L22 8.5 L22 14 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M12 15 C11 24 10 30 9 38 H23 C22 30 21 24 20 15 Z" fill="rgba(255,236,178,0.85)" stroke="#b98a2e" strokeWidth="0.9" strokeLinejoin="round" />
          </g>
          {/* the smaller minor beside her, haloed */}
          <g>
            <circle cx="33" cy="16" r="5.5" fill="none" stroke="rgba(255,233,176,0.7)" strokeWidth="1" />
            <circle cx="33" cy="16" r="2.6" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="0.8" />
            <path d="M30 20 C29.5 27 29 32 28.5 38 H37.5 C37 32 36.5 27 36 20 Z" fill="rgba(255,236,178,0.8)" stroke="#b98a2e" strokeWidth="0.8" strokeLinejoin="round" />
          </g>
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[26%] top-0 block h-[76%] w-[20%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-shaft absolute left-[54%] top-0 block h-[76%] w-[20%]" style={{ background: "rgba(255,242,192,0.5)", animationDelay: `${delayMs + 90}ms` }} />
      <span className="fx-sig-crownfall absolute top-0 left-[34%] block h-[26%] w-[32%]" style={{ animationDelay: `${delayMs + 60}ms` }}><SigCrown /></span>
    </span>
  );
}

/** Iron Legion: a relief force rises from the ground in a haze of dust. */
function IronLegionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // APEX pass (tier 9) — THE DROP-POD BARRAGE: letterbox bars slam in and
  // three massive riveted iron drop-pods scream out of the sky — left flank,
  // right flank, then dead centre — each squashing down with its own flare.
  // Their hatches blow and glowing-eyed iron knights stand revealed inside as
  // a TRIPLE steel shockwave rolls the muster out past the edges.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(140,150,160,0.28)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {[
          { l: 26, w: 11, d: 160 },
          { l: 63, w: 11, d: 420 },
          { l: 44, w: 13, d: 700 },
        ].map((v, i) => (
          <React.Fragment key={i}>
            {/* the pod */}
            <span
              className="gp-pod absolute block"
              style={{ left: `${v.l}%`, top: `${60 - v.w * 2.2}%`, width: `${v.w}%`, height: `${v.w * 2.2}%`, animationDelay: `${delayMs + v.d}ms` }}
            >
              <svg viewBox="0 0 16 34" className="h-full w-full" aria-hidden="true">
                {/* capsule + fins */}
                <path d="M2 30 L2 8 C2 3.5 4.5 1 8 1 C11.5 1 14 3.5 14 8 L14 30 Z" fill="rgba(140,150,160,0.95)" stroke="#4a525c" strokeWidth="1.1" strokeLinejoin="round" />
                <path d="M2 24 L0 32 L3 30 M14 24 L16 32 L13 30" fill="rgba(120,128,138,0.9)" stroke="#4a525c" strokeWidth="0.8" strokeLinejoin="round" />
                {/* the hatch seam + rivets */}
                <path d="M4.5 9 H11.5 V27 H4.5 Z" fill="rgba(74,82,92,0.6)" stroke="#4a525c" strokeWidth="0.7" />
                <circle cx="3.2" cy="6" r="0.5" fill="#c9d2dc" />
                <circle cx="12.8" cy="6" r="0.5" fill="#c9d2dc" />
                <circle cx="3.2" cy="28" r="0.5" fill="#c9d2dc" />
                <circle cx="12.8" cy="28" r="0.5" fill="#c9d2dc" />
                {/* hazard chevrons */}
                <path d="M5 4.5 L6.5 6 M8 4.5 L9.5 6 M11 4.5 L12 5.5" stroke="#e6bf6a" strokeWidth="0.7" strokeLinecap="round" />
              </svg>
            </span>
            {/* its touchdown flare */}
            <span
              className="gp-flash absolute block rounded-full"
              style={{
                left: `${v.l - 2}%`,
                top: "56%",
                width: `${v.w + 4}%`,
                height: "7%",
                background: "rgba(200,210,220,0.8)",
                animationDelay: `${delayMs + v.d + 480}ms`,
              }}
            />
            {/* the hatch blows off... */}
            <span
              className="gp-doorl absolute block"
              style={{ left: `${v.l + 2}%`, top: `${60 - v.w * 1.7}%`, width: `${v.w * 0.5}%`, height: `${v.w * 1.2}%`, animationDelay: `${delayMs + v.d + 620}ms` }}
            >
              <svg viewBox="0 0 8 18" className="h-full w-full" aria-hidden="true">
                <rect x="0.8" y="0.8" width="6.4" height="16.4" rx="1" fill="rgba(120,128,138,0.9)" stroke="#4a525c" strokeWidth="0.8" />
              </svg>
            </span>
            {/* ...and the iron knight stands revealed, eyes lit */}
            <span
              className="gp-pop absolute block"
              style={{ left: `${v.l + 2.5}%`, top: `${60 - v.w * 1.6}%`, width: `${v.w - 5}%`, height: `${v.w * 1.4}%`, animationDelay: `${delayMs + v.d + 760}ms`, animationDuration: "0.9s" }}
            >
              <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
                <path d="M4 22 C4 15 6 13 6 10 C4.5 11 3 10.5 3.4 8.5 C4 6 7 3.5 10 3.5 C13 5 13.5 9 13 14 L12 22 Z" fill="rgba(140,150,160,0.95)" stroke="#4a525c" strokeWidth="1" strokeLinejoin="round" />
                <circle cx="8.6" cy="6.4" r="0.9" fill="#e6bf6a" />
              </svg>
            </span>
          </React.Fragment>
        ))}
        {/* the muster complete: dust + TRIPLE steel shockwave */}
        <ShardBurst vectors={BURST_BIG} fill="#c9d2dc" stroke="#4a525c" delayMs={delayMs + 1240} sizePct={6} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1300 + i * 170} color="rgba(180,190,200,0.85)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[30%] bottom-[10%] block h-[56%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M5 30 V14 L4 13 V7 H8 V9 H11 V7 H13 V9 H16 V7 H20 V13 L19 14 V30 Z" fill="rgba(140,150,160,0.9)" stroke="#4a525c" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[26%] bottom-[8%] block h-[16%] rounded-full" style={{ background: "rgba(120,124,130,0.5)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

/** Second Coming: a crown of light descends inside a protective ward ring;
 * lead flashes mint. */
function SecondComingBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — THE RED-CARPET DESCENT: letterbox bars drop for
    // the premiere, a red carpet UNROLLS down the middle of the board, gold
    // stanchion posts pop up along the rope line, fanfare stars burst at the
    // top of the sky — and the radiant queen descends the full height of the
    // crop onto her carpet, landing a TRIPLE ward shockwave. She's back.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(126,181,154,0.26)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* the carpet, unrolling down the middle of the board */}
        <span className="gp-drape absolute left-[44%] top-[21.5%] block h-[57%] w-[12%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 12 57" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0" width="11" height="57" fill="rgba(194,64,58,0.9)" stroke="#5a1512" strokeWidth="0.8" />
            <path d="M2.4 0 V57 M9.6 0 V57" stroke="#e6bf6a" strokeWidth="0.7" />
          </svg>
        </span>
        {/* stanchion posts pop up along the rope line */}
        {[
          { l: 40, t: 34, d: 480 },
          { l: 58, t: 34, d: 560 },
          { l: 40, t: 52, d: 640 },
          { l: 58, t: 52, d: 720 },
        ].map((v, i) => (
          <span key={i} className="gp-pop absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "8%", animationDelay: `${delayMs + v.d}ms` }}>
            <svg viewBox="0 0 6 16" className="h-full w-full" aria-hidden="true">
              <circle cx="3" cy="2" r="1.8" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" />
              <path d="M3 4 V13" stroke="#c9a244" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M0.6 14.5 H5.4" stroke="#7a5b23" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* fanfare stars at the top of the sky */}
        {[
          { l: 32, t: 25, d: 1400 },
          { l: 50, t: 23, d: 1500 },
          { l: 66, t: 26, d: 1600 },
        ].map((v, i) => (
          <span key={i} className="gp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4%", height: "4%", animationDelay: `${delayMs + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i === 1 ? "#ffd95e" : "#cfe8c9"} />
            </svg>
          </span>
        ))}
        {/* the queen, descending the full height of the crop onto her carpet */}
        <span className="gp-descend absolute left-[38%] top-[17%] block h-[44%] w-[24%]" style={{ animationDelay: `${delayMs + 680}ms`, animationDuration: "1.6s" }}>
          <svg viewBox="0 0 24 40" className="h-full w-full" aria-hidden="true">
            <circle cx="12" cy="8" r="7" fill="none" stroke="rgba(255,233,176,0.85)" strokeWidth="1.3" />
            <circle cx="12" cy="8" r="3" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.7" />
            <path d="M8 4.5 L8.5 1.5 L10.5 3.5 L12 0.5 L13.5 3.5 L15.5 1.5 L16 4.5 Z" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" strokeLinejoin="round" />
            <path d="M8 12 C7 22 6 30 5 38 H19 C18 30 17 22 16 12 Z" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M9.5 20 L8.5 36 M12 16 V37 M14.5 20 L15.5 36" stroke="rgba(185,138,46,0.5)" strokeWidth="0.6" fill="none" />
          </svg>
        </span>
        {/* touchdown: ward-light flare + sparks + TRIPLE shockwave */}
        <span
          className="gp-flash absolute left-[34%] top-[56%] block h-[14%] w-[32%] rounded-full"
          style={{ background: "rgba(163,209,150,0.6)", animationDelay: `${delayMs + 1720}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#cfe8c9" stroke="#4a6b52" delayMs={delayMs + 1760} sizePct={7} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1800 + i * 170} color={i === 1 ? "rgba(255,244,200,0.8)" : "rgba(163,209,150,0.85)"} thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "1.5px solid rgba(126,181,154,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crownfall absolute top-0 left-[32%] block h-[28%] w-[36%]" style={{ animationDelay: `${delayMs}ms` }}><SigCrown /></span>
    </span>
  );
}

/** Lava Floor: a rank erupts, tongues of flame licking up from the ground. */
function LavaFloorBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 11 upgrade: the lead square paints a board-wide magma tide (oversized
  // canvas clipped by the board crop) — a red glow washes the whole board, a
  // full-width lava wave rolls across it, and an ember shockwave blooms past
  // the edges — before the per-square eruptions sweep through.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,110,60,0.2)" delayMs={delayMs} />
        <span className="fx-sig-wave absolute left-[18%] top-[38%] block h-[26%] w-[64%]" style={{ animationDelay: `${delayMs + 120}ms`, animationDuration: "1.2s" }}>
          <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 30 C10 16 22 24 34 14 C46 6 58 18 70 10 C82 4 94 16 106 8 L120 14 V30 Z" fill="rgba(230,110,60,0.8)" stroke="#7a3a12" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M8 30 C20 22 32 26 44 18 C56 12 70 22 84 16 C96 12 108 20 120 18 V30 Z" fill="rgba(255,214,120,0.85)" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 320} color="rgba(255,214,120,0.8)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[14%] bottom-[6%] top-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M20 40 C10 30 15 22 12 12 C18 18 17 8 20 3 C23 9 25 16 28 12 C25 22 30 30 20 40 Z" fill="rgba(230,110,60,0.82)" stroke="#7a3a12" strokeWidth="1" strokeLinejoin="round" />
          <path d="M20 40 C16 32 18 24 20 16 C22 24 24 32 20 40 Z" fill="rgba(255,214,120,0.9)" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 120} sizePct={9} />
    </span>
  );
}

/** Necromancer: a spectre heaves up out of the grave in a wisp of soul-fire;
 * lead flashes pale violet. */
function NecromancerBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE PALE NECROMANCER: soul-fire wells up out of the
    // grave-squares and a colossal lich rises over the board, grave-staff
    // raised, spectres streaming up around him before the pale flare and twin
    // violet shockwaves.
    return (
      <GodEvent
        wash="rgba(180,160,200,0.24)"
        rays="rgba(150,120,180,0.6)"
        boom="rgba(150,120,180,0.85)"
        flare="rgba(200,186,224,0.6)"
        sparkFill="#c8bae0"
        sparkStroke="#5a4478"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* horned skull-crown lich head */}
            <path d="M15 8 C15 4 17 2 20 2 C23 2 25 4 25 8 C25 10.5 23.8 12 22.5 12.5 L22 15 H18 L17.5 12.5 C16.2 12 15 10.5 15 8 Z" fill="rgba(230,224,240,0.95)" stroke="#5a4478" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M17.4 7.5 L19 8.5 M22.6 7.5 L21 8.5" stroke="#96c47f" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13 5 C11 3.5 10.5 1.5 12 0.5 M27 5 C29 3.5 29.5 1.5 28 0.5" stroke="#5a4478" strokeWidth="1.1" strokeLinecap="round" fill="none" />
            {/* tattered grave-robe */}
            <path d="M12 44 C10 32 12 18 20 16 C28 18 30 32 28 44 C25.5 41 24 42 23 44 C21.5 41.5 19 41.5 17.5 44 C16.5 41.5 14.5 41 12 44 Z" fill="rgba(60,48,80,0.9)" stroke="#9678b4" strokeWidth="1" strokeLinejoin="round" />
            {/* the raised grave-staff, skull-tipped */}
            <path d="M30 40 L34 12" stroke="#6b4a2a" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="34.5" cy="9.5" r="2.6" fill="rgba(200,186,224,0.9)" stroke="#5a4478" strokeWidth="0.8" />
            {/* spectres streaming up around him */}
            <path d="M6 26 C4.5 20 6 15 8 15 C9.5 15 10.5 18.5 10 24 Z" fill="rgba(180,160,200,0.5)" stroke="rgba(150,120,180,0.75)" strokeWidth="0.7" />
            <path d="M8 13 C8 11.8 8.8 11 10 11" stroke="rgba(150,120,180,0.7)" strokeWidth="0.8" fill="none" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[26%] bottom-[8%] block h-[58%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 30" className="h-full w-full" aria-hidden="true">
          <path d="M6 30 C4 20 8 10 12 10 C16 10 20 20 18 30 C15 26 9 26 6 30 Z" fill="rgba(180,160,200,0.55)" stroke="rgba(150,120,180,0.85)" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="3.2" fill="rgba(200,186,224,0.6)" stroke="rgba(150,120,180,0.85)" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute left-[44%] top-[12%] block h-[22%] w-[18%] rounded-full" style={{ background: "rgba(150,120,180,0.5)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

/** Werewolf: a raking claw-slash and a feral beast lunge; lead flashes. */
function WerewolfBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(200,190,180,0.24)" boom="rgba(201,210,220,0.85)" delayMs={delayMs} motifClass="fx-sig-afterimage">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#c9d2dc" strokeWidth="2.4" strokeLinecap="round" fill="none"><path d="M6 8 L30 22 M4 18 L26 30 M12 4 L30 26" /></g>
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[16%] top-[14%] block h-[60%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#c9d2dc" strokeWidth="2.4" strokeLinecap="round" fill="none"><path d="M6 8 L30 22 M4 18 L26 30 M12 4 L30 26" /></g>
        </svg>
      </span>
      <span className="fx-sig-gallop absolute left-[10%] bottom-[12%] block h-[34%] w-[46%]" style={{ animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden="true">
          <path d="M2 24 C8 18 12 10 18 8 L22 2 L24 8 C30 10 36 16 38 24 L30 22 L26 25 L20 22 L12 25 Z" fill="#8a7a6a" stroke="#3c3228" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Last Meal: the king ties on a napkin and a fork and plate clatter down. */
function LastMealBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead sets the table for the
  // WHOLE board — a warm gold wash while a colossal fork-and-plate setting
  // grows mid-crop and a dinner-bell ring rolls out.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.2)" delayMs={delayMs} />
        <span className="fx-sig-grow absolute inset-[30%] block" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <path d="M12 6 V16 M12 6 V13 M16 6 V16 M12 16 V34" stroke="#e6bf6a" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="26" cy="20" r="8" fill="none" stroke="#e0776b" strokeWidth="2.2" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 280} color="rgba(230,191,106,0.85)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M12 6 V16 M12 6 V13 M16 6 V16 M12 16 V34" stroke="#e6bf6a" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="26" cy="20" r="8" fill="none" stroke="#e0776b" strokeWidth="2.2" />
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(230,191,106,0.5)", animationDelay: `${delayMs + 100}ms` }} />
    </span>
  );
}

// --- 10i. Batch 9 visuals (thematic character-matched signatures) -----------
// Bespoke inline-SVG spectacles for the Italian-brainrot meme cards plus a
// spread of high-flavor library cards that used to fire a reused motif. Flat SVG
// fills and solid discs (no gradients / glow / box-shadow), 1px corners, coral /
// mint / sun / gold. Every motion is transform/opacity only and composes the
// shared fx-sig-* classes; only fx-sig-bombdrop (a whistling bomb) and
// fx-sig-dart (a fast horizontal streak) are new keyframes. All hidden under
// reduced motion. No two share a look.

/** A falling aerial bomb: teardrop shell, tail fins, a mint fuse ridge. */
function AeroBomb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 24" className={className} aria-hidden="true">
      <path d="M8 23 C3.2 18.5 3.2 11.5 8 4 C12.8 11.5 12.8 18.5 8 23 Z" fill="#33403a" stroke="#141e2b" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 4 V1 M5.4 2.4 H10.6 M6.4 1.4 V4 M9.6 1.4 V4" stroke="#8a8478" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M6.6 10 C7 13.6 7 16.6 7.4 19" stroke="#7eb59a" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The bomber-croc: a stubby crocodile fitted with little plane wings, jaws
 * open over its payload. */

/** Bombardiro Crocodilo: the bomber-croc banks across the board (lead), then on
 * each struck square a bomb whistles down and detonates in a burst of embers. A
 * crocodile dropping bombs, NOT the reused lightning strike. */
function CrocBomberBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a strafing bombing run. The board darkens under the bomber's
    // shadow, the croc-plane banks clean across the board, and a carpet of bombs
    // whistles down and detonates in a wash of embers.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(18,24,18,0.36)" delayMs={delayMs} />
        <BoardRain delayMs={delayMs + 120} render={() => <AeroBomb className="h-full w-full" />} />
        <span className="fx-sig-cross absolute left-[37%] top-[36%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-wingbeat block h-full w-full">
            <BrainrotFigure id="bombardiro_croc" />
          </span>
        </span>
        <span className="fx-sig-flash absolute left-[35%] top-[40%] block h-[30%] w-[30%] rounded-full" style={{ background: "rgba(255,178,84,0.45)", animationDelay: `${delayMs + 640}ms` }} />
        <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 660} sizePct={6} />
        {/* God-tier pass: the carpet run detonates twin concussion rings. */}
        <BoardBoom delayMs={delayMs + 680} color="rgba(255,168,80,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 820} color="rgba(230,168,92,0.8)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-bombdrop absolute left-[39%] top-[1%] block h-[42%] w-[22%]" style={{ animationDelay: `${delayMs}ms` }}>
        <AeroBomb className="h-full w-full" />
      </span>
      {/* a bouncier carpet run: two cluster bomblets whistle down alongside */}
      {[{ l: "15%", d: 110 }, { l: "66%", d: 50 }].map((b, i) => (
        <span key={i} className="fx-sig-bombdrop absolute top-[4%] block h-[27%] w-[13%]" style={{ left: b.l, animationDelay: `${delayMs + b.d}ms` }}>
          <AeroBomb className="h-full w-full" />
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[20%] block rounded-full" style={{ background: "rgba(255,196,120,0.85)", animationDelay: `${delayMs + 380}ms` }} />
      <span className="fx-sig-ring absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,168,80,0.95)", animationDelay: `${delayMs + 380}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#e6a85c" stroke="#7a3a12" delayMs={delayMs + 380} sizePct={11} />
      {[{ l: "16%", d: 470 }, { l: "64%", d: 430 }].map((b, i) => (
        <span key={`p${i}`} className="fx-sig-flash absolute top-[40%] block h-[16%] w-[16%] rounded-full" style={{ left: b.l, background: "rgba(255,196,120,0.7)", animationDelay: `${delayMs + b.d}ms` }} />
      ))}
      <span className="fx-sig-scorch absolute inset-[28%] block rounded-full" style={{ background: "rgba(24,14,8,0.7)", animationDelay: `${delayMs + 540}ms` }} />
    </span>
  );
}

/** Tralalero Tralala: the shark in Nike sneakers blurs across the board (lead),
 * throwing a spray of water on the square it dashed through. */
function SharkDashBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the shark sprints the full length of the board, a speed-blur
    // after-image trailing it, water spray kicked up across the wake, and a
    // sonic-boom ring where it screeches to a stop.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,196,224,0.22)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[36%] top-[44%] block h-[18%] w-[18%]" style={{ animationDelay: `${delayMs + 90}ms`, opacity: 0.45 }}>
          <BrainrotFigure id="tralalero_dash" />
        </span>
        <span className="fx-sig-cross absolute left-[35%] top-[38%] block h-[22%] w-[22%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-wiggle block h-full w-full">
            <BrainrotFigure id="tralalero_dash" />
          </span>
        </span>
        <BoardRain
          delayMs={delayMs + 260}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill="rgba(201,234,255,0.85)" stroke="#5b7d94" strokeWidth="0.8" />
            </svg>
          )}
        />
        <span className="fx-sig-boom absolute left-[62%] top-[36%] block h-[36%] w-[36%] rounded-full" style={{ border: "2px solid rgba(198,234,255,0.85)", animationDelay: `${delayMs + 560}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[8%] bottom-[24%] block h-[26%] rounded-full" style={{ background: "rgba(150,196,224,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-wave absolute inset-x-[16%] bottom-[40%] block h-[16%] rounded-full" style={{ background: "rgba(198,234,255,0.45)", animationDelay: `${delayMs + 130}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#c9eaff" stroke="#5b7d94" delayMs={delayMs + 60} sizePct={8} />
    </span>
  );
}

/** Bombombini Gusini: the bomber-goose waddles in (lead) and lobs a stun grenade
 * that pops with a HONK ring of stars. */
function GooseBombBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a giant HONK. The goose thumps down centre-board and a
    // colossal double shockwave rolls out over the whole board, feathers raining
    // in its wake.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.2)" delayMs={delayMs + 220} />
        <span className="fx-sig-grow absolute left-[38%] top-[32%] block h-[28%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-hop block h-full w-full">
            <BrainrotFigure id="bombombini_gusini" />
          </span>
        </span>
        <BoardBoom delayMs={delayMs + 240} color="rgba(230,191,106,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 360} color="rgba(126,181,154,0.85)" thickness={3} />
        <BoardRain
          delayMs={delayMs + 280}
          render={() => (
            <svg viewBox="0 0 10 16" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 C8 5 8 11 5 16 C2 11 2 5 5 0 Z" fill="#f4f7f2" stroke="#8aa0b4" strokeWidth="0.7" />
            </svg>
          )}
        />
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[40%] top-0 block h-[34%] w-[22%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 16 18" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="11" r="6" fill="#5f6b52" stroke="#2f3826" strokeWidth="1" />
          <path d="M8 5 V1 M6 2.4 H10" stroke="#8a8478" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[12%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.85)", animationDelay: `${delayMs + 260}ms` }} />
      <span className="fx-sig-shock absolute inset-[24%] block rounded-full" style={{ border: "1.5px solid rgba(126,181,154,0.8)", animationDelay: `${delayMs + 340}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={10} />
    </span>
  );
}

/** Lirili Larila: the clock-elephant plants its clock (lead); on the struck
 * squares the hands sweep backward and a Z of stopped time drifts off. */
function ClockElephantBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: time stops. The whole board greys out, a giant ghost clock
    // face sweeps its hands backward over it, the cactus-elephant grows in, and
    // Zs of stopped time drift up.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(108,114,118,0.5)" delayMs={delayMs} />
        <span className="absolute left-[30%] top-[30%] block h-[40%] w-[40%]" style={{ opacity: 0.85 }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="17" fill="rgba(244,247,242,0.28)" stroke="#8a6414" strokeWidth="1.6" />
            <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
              <path d="M20 20 L20 7" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 20 L30 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </span>
        <span className="fx-sig-grow absolute left-[39%] top-[40%] block h-[26%] w-[24%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
          <span className="fx-sig-wiggle block h-full w-full">
            <BrainrotFigure id="lirili_larila" />
          </span>
        </span>
        {[{ l: "26%", t: "30%", d: 220 }, { l: "66%", t: "36%", d: 360 }, { l: "46%", t: "22%", d: 480 }].map((z, i) => (
          <span key={i} className="fx-sig-zzz absolute block h-[8%] w-[8%]" style={{ left: z.l, top: z.t, animationDelay: `${delayMs + z.d}ms` }}>
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[30%] top-[24%] block h-[40%] w-[40%]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="#f4f7f2" stroke="#8a6414" strokeWidth="2" />
          <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
            <path d="M20 20 L20 8" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 20 L28 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[54%] top-[14%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[64%] top-[4%] block h-[18%] w-[18%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Brr Brr Patapim: a sudden cold snap gusts through and icicles spike down over
 * the frozen ranks. */
function ColdSnapBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a blizzard sweeps the whole board. A blue whiteout washes in,
    // frost creeps across, and a curtain of icicles descends board-wide.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(150,200,235,0.34)" delayMs={delayMs} />
        <span className="fx-sig-grow absolute left-[39%] top-[36%] block h-[26%] w-[22%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <BrainrotFigure id="brr_brr_patapim" />
        </span>
        <span className="fx-sig-frost absolute inset-x-[24%] top-[26%] block h-[8%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.6)", animationDelay: `${delayMs}ms` }} />
        <span className="fx-sig-frost absolute inset-x-[24%] top-[64%] block h-[8%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs + 160}ms` }} />
        <BoardRain
          delayMs={delayMs + 120}
          render={() => (
            <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 L7 5 L5 10 L3 5 Z" fill="#dbe7f2" stroke="#8aa0b4" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
        <ShardBurst vectors={BURST_MED} fill="#eaf8ff" stroke="#8aa0b4" delayMs={delayMs + 220} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[6%] top-[10%] block h-[20%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-frost absolute inset-x-[10%] top-[70%] block h-[14%] rounded-[1px]" style={{ background: "rgba(198,234,255,0.4)", animationDelay: `${delayMs + 140}ms` }} />
      {[{ l: "14%", d: 0, h: "34%" }, { l: "30%", d: 80, h: "28%" }, { l: "46%", d: 40, h: "38%" }, { l: "62%", d: 120, h: "26%" }, { l: "78%", d: 20, h: "32%" }].map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-[6%] block w-[9%]" style={{ left: s.l, height: s.h, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 8 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M1 0 H7 L4 24 Z" fill="#dbe7f2" stroke="#8aa0b4" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[16%] block rounded-full" style={{ border: "2px solid rgba(198,234,255,0.8)", animationDelay: `${delayMs}ms` }} />}
      <ShardBurst vectors={BURST_MED} fill="#eaf8ff" stroke="#8aa0b4" delayMs={delayMs + 120} sizePct={7} />
    </span>
  );
}

/** Chimpanzini Bananini: the banana-monkey thumps in (lead) and banana peels
 * spin off the empowered knight. */
function BananApeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the ape goes King-Kong. A colossal ape heaves up over the
    // board beating its chest, a thump shockwave rolls out, and a barrage of
    // spinning banana peels rains across every file.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(242,201,76,0.2)" delayMs={delayMs + 280} />
        <span className="fx-sig-phoenix absolute left-1/2 top-[20%] block h-[62%] w-[56%]" style={{ marginLeft: "-28%", animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-chomp block h-full w-full">
            <BrainrotFigure id="chimpanzini_bananini" />
          </span>
        </span>
        <BoardBoom delayMs={delayMs + 320} color="rgba(242,201,76,0.85)" thickness={4} />
        <BoardRain
          delayMs={delayMs + 180}
          render={() => (
            <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
              <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {PIN_STARS.map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-1/2 ml-[-7%] mt-[-7%] block h-[14%] w-[14%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <svg viewBox="0 0 24 16" className="h-full w-full" aria-hidden="true">
            <path d="M2 4 C6 14 18 15 22 6 C20 9 12 10 8 4 C7 2 4 2 2 4 Z" fill="#f2c94c" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(242,201,76,0.7)", animationDelay: `${delayMs + 40}ms` }} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(242,201,76,0.5)", animationDelay: `${delayMs + 80}ms` }} />
    </span>
  );
}

/** Boneca Ambalabu: the tire-frog drops its heavy tractor tire over the piece
 * and settles, weighing it down. Frog eyes peek over the rim. */
function TireFrogBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: a giant tractor tire steamrolls the full width of the board,
    // frog eyes peeking over the rim, pressing tracks across the board and
    // kicking up dust.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(43,43,47,0.26)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[36%] top-[32%] block h-[32%] w-[28%]" style={{ animationDelay: `${delayMs}ms` }}>
          <BrainrotFigure id="boneca_ambalabu" />
        </span>
        <span className="fx-sig-wave absolute inset-x-[22%] top-[62%] block h-[6%] rounded-[1px]" style={{ background: "rgba(74,74,80,0.7)", animationDelay: `${delayMs + 120}ms` }} />
        {[{ l: "12%" }, { l: "82%" }].map((s, i) => (
          <span key={i} className="fx-sig-ash absolute top-[58%] block h-[9%] w-[9%] rounded-full" style={{ left: s.l, background: "rgba(120,116,110,0.6)", animationDelay: `${delayMs + 320}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[20%] top-[18%] block h-[62%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="24" r="15" fill="#2b2b2f" stroke="#141416" strokeWidth="1.4" />
          <circle cx="20" cy="24" r="7.5" fill="#3d5a48" stroke="#141416" strokeWidth="1.2" />
          <g stroke="#4a4a50" strokeWidth="1.6"><path d="M20 9 V13 M20 35 V39 M5 24 H9 M31 24 H35 M9 13 L12 16 M31 13 L28 16 M9 35 L12 32 M31 35 L28 32" /></g>
          <circle cx="16" cy="20" r="2.4" fill="#7eb59a" stroke="#2c473a" strokeWidth="0.8" />
          <circle cx="24" cy="20" r="2.4" fill="#7eb59a" stroke="#2c473a" strokeWidth="0.8" />
          <circle cx="16" cy="20" r="0.9" fill="#141e2b" />
          <circle cx="24" cy="20" r="0.9" fill="#141e2b" />
        </svg>
      </span>
      {/* a heavier landing: a settle ring and dust kicked out both sides */}
      <span className="fx-sig-shock absolute inset-x-[10%] bottom-[8%] block h-[22%] rounded-full" style={{ border: "2px solid rgba(120,116,110,0.6)", animationDelay: `${delayMs + 260}ms` }} />
      {[{ l: "8%" }, { l: "82%" }].map((s, i) => (
        <span key={i} className="fx-sig-ash absolute bottom-[12%] block h-[16%] w-[16%] rounded-full" style={{ left: s.l, background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 300}ms` }} />
      ))}
      <span className="fx-sig-ash absolute inset-x-[18%] bottom-[12%] block h-[16%] rounded-full" style={{ background: "rgba(120,116,110,0.5)", animationDelay: `${delayMs + 180}ms` }} />
    </span>
  );
}

/** Oblivion: the mythic board-wipe. Each piece is torn into a swallowing void
 * that collapses to a point; lead adds a stark event-horizon shock ring. A
 * monochrome unmaking, distinct from the violet Annihilation / Vortex. */
function OblivionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 10) — THE RAGE QUIT (owner: "stuff like a rage quit"):
    // the light dies, a colossal fed-up hand shoots in from the side, clamps
    // the board's rim with a squeeze... and FLIPS THE ENTIRE BOARD. The
    // checkered plane heaves over its gripped corner and sails off the top of
    // the crop, pieces hurled everywhere, and where the board used to be the
    // void closes in — a stark flare and a TRIPLE event-horizon ring.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(8,8,10,0.42)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* the hand, done with this game */}
        <span
          className="gp-grab absolute left-[6%] top-[42%] block h-[20%] w-[26%]"
          style={{ "--from": "-70%", animationDelay: `${delayMs + 120}ms` } as React.CSSProperties}
        >
          <svg viewBox="0 0 30 20" className="h-full w-full" aria-hidden="true">
            {/* the sleeve */}
            <path d="M0 4 H10 L11 16 H0 Z" fill="rgba(20,20,24,0.95)" stroke="#5b6672" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the hand, fingers curling over the rim */}
            <path d="M10 5 C16 3.5 21 3.5 25 5.5 L28 7.5 C29.5 8.5 29 10.5 27 10.5 L23 10 C25 11 25.5 13 23.5 13.5 L20 13 C22 14.2 22 16 20 16.5 L16.5 15.8 C18 17 17.5 18.8 15.5 18.8 C13 18.8 11 17.5 10.5 15 Z" fill="#e8eef6" stroke="#3f4b57" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M23 7.5 L26 9 M20.5 10.5 L23 12 M18 13.5 L20 15" stroke="rgba(63,75,87,0.6)" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* THE BOARD, heaved over its gripped corner and hurled off the crop */}
        <span
          className="gp-flip absolute left-[25%] top-[27%] block h-[46%] w-[50%]"
          style={{ transformOrigin: "5% 92%", animationDelay: `${delayMs + 640}ms` }}
        >
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="38" height="38" rx="1.4" fill="#c9d2dc" stroke="#3f4b57" strokeWidth="1.4" />
            {/* the checkerboard, four ranks a side */}
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={3 + c * 8.5 + (r % 2 === 0 ? 0 : 4.25)}
                  y={3 + r * 8.5}
                  width="4.25"
                  height="8.5"
                  fill="rgba(20,20,24,0.85)"
                />
              )),
            )}
          </svg>
        </span>
        {/* the pieces, hurled clean off it */}
        {[
          { l: 34, t: 34, dx: "-160%", dy: "-260%", rot: "-260deg", d: 90, k: "rook" as const },
          { l: 46, t: 30, dx: "60%", dy: "-320%", rot: "220deg", d: 140, k: "queen" as const },
          { l: 58, t: 36, dx: "220%", dy: "-240%", rot: "300deg", d: 110, k: "pawn" as const },
          { l: 40, t: 46, dx: "-120%", dy: "-300%", rot: "-220deg", d: 190, k: "knight" as const },
          { l: 54, t: 48, dx: "180%", dy: "-280%", rot: "260deg", d: 230, k: "bishop" as const },
          { l: 47, t: 56, dx: "40%", dy: "-360%", rot: "180deg", d: 270, k: "pawn" as const },
        ].map((v, i) => (
          <span
            key={i}
            className="gp-flyoff absolute block"
            style={
              {
                left: `${v.l}%`,
                top: `${v.t}%`,
                width: "4.5%",
                height: "7%",
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": v.rot,
                animationDelay: `${delayMs + 700 + v.d}ms`,
              } as React.CSSProperties
            }
          >
            <ApexPiece kind={v.k} fill="#e8eef6" stroke="#3f4b57" />
          </span>
        ))}
        {/* where the board was, the void closes in */}
        <span
          className="gp-flash absolute left-[38%] top-[42%] block h-[16%] w-[24%] rounded-full"
          style={{ background: "rgba(232,238,246,0.5)", animationDelay: `${delayMs + 1520}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#3f4b57" delayMs={delayMs + 1560} sizePct={6} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1580 + i * 170} color="rgba(201,210,220,0.85)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-21%] mt-[-21%] block h-[42%] w-[42%] rounded-full" style={{ background: "rgba(8,8,10,0.95)", border: "1.5px solid rgba(232,238,246,0.95)", "--dx": "0%", "--dy": "0%", "--rot": "0deg", animationDelay: `${delayMs}ms` } as React.CSSProperties} />
      {BURST_BIG.map((v, i) => (
        <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <SigShard fill="#c9d2dc" stroke="#3f4b57" variant={i} />
        </span>
      ))}
    </span>
  );
}

/** Blood Pact: a wax seal presses down (lead) and the sacrificed pawn bursts in
 * a dark-crimson spatter. */
function BloodPactBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // God-tier pass — THE COLLECTOR OF DEBTS: blood-light wells up out of the
    // board and a colossal horned pact-fiend rises over the crop, pressing the
    // great wax seal down with one clawed hand; the bargain closes in a
    // crimson flare and twin blood shockwaves.
    return (
      <GodEvent
        wash="rgba(160,44,40,0.26)"
        rays="rgba(194,82,72,0.6)"
        boom="rgba(122,47,40,0.85)"
        flare="rgba(194,82,72,0.7)"
        sparkFill="#c25248"
        sparkStroke="#3a1512"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* curled horns + fiend head */}
            <path d="M12 8 C9 6 8 3 10 1 C12 3 13 5.5 13.5 8 Z M28 8 C31 6 32 3 30 1 C28 3 27 5.5 26.5 8 Z" fill="#7a2f28" stroke="#3a1512" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M14 13 C14 8 16.5 6 20 6 C23.5 6 26 8 26 13 C26 15.5 24.5 17 22.5 17.5 H17.5 C15.5 17 14 15.5 14 13 Z" fill="#a5443c" stroke="#3a1512" strokeWidth="1" strokeLinejoin="round" />
            <path d="M16.5 11.5 L18.5 12.5 M23.5 11.5 L21.5 12.5" stroke="#ffd166" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M18 15.5 C19.3 16.3 20.7 16.3 22 15.5" stroke="#3a1512" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {/* robed torso, one claw pressing the seal down */}
            <path d="M12 44 C10 33 12 21 20 19 C28 21 30 33 28 44 Z" fill="rgba(58,21,18,0.92)" stroke="#a5443c" strokeWidth="1" strokeLinejoin="round" />
            <path d="M25 24 L31 32" stroke="rgba(58,21,18,0.95)" strokeWidth="2.4" strokeLinecap="round" />
            {/* the great pact seal beneath the claw */}
            <circle cx="32" cy="36" r="5.5" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.1" />
            <path d="M32 32.5 L33.2 35.2 L36 35.2 L33.8 37 L34.6 40 L32 38.2 L29.4 40 L30.2 37 L28 35.2 L30.8 35.2 Z" fill="#c25248" stroke="#3a1512" strokeWidth="0.5" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(160,44,40,0.7)", animationDelay: `${delayMs + 120}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#a52c28" stroke="#3a1512" delayMs={delayMs + 120} sizePct={11} />
    </span>
  );
}

/** Regicide: an executioner's crown-and-cleaver drops beside the throne as the
 * queen takes station over the enemy king. */
function RegicideBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — THE ROYAL GUILLOTINE: crimson letterbox bars slam
    // in and a TOWERING guillotine frame rises over the enemy court. The
    // blade hangs... shivers... and DROPS in one clean stroke — the enemy
    // crown bounces away down the ranks (comedy physics fully intended) as a
    // TRIPLE regicidal shockwave rolls out.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(214,35,79,0.24)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* the guillotine frame, rising over the court */}
        <span className="gp-rise absolute left-[33%] top-[16%] block h-[52%] w-[34%]" style={{ animationDelay: `${delayMs + 140}ms`, animationDuration: "2.7s" }}>
          <svg viewBox="0 0 36 54" className="h-full w-full" aria-hidden="true">
            {/* the uprights + crossbeam */}
            <path d="M6 54 V4 H10 V54 Z M26 54 V4 H30 V54 Z" fill="#7a5b3a" stroke="#3a2a1a" strokeWidth="1" strokeLinejoin="round" />
            <path d="M4 1 H32 V5 H4 Z" fill="#7a5b3a" stroke="#3a2a1a" strokeWidth="1" strokeLinejoin="round" />
            {/* the rope, cut */}
            <path d="M18 5 V9 M17 9.6 L18.6 11" stroke="#e6bf6a" strokeWidth="0.9" strokeLinecap="round" />
            {/* the lunette stocks at the base */}
            <path d="M6 44 H30 V48 H6 Z" fill="#7a5b3a" stroke="#3a2a1a" strokeWidth="1" strokeLinejoin="round" />
            <circle cx="18" cy="46" r="2.6" fill="none" stroke="#3a2a1a" strokeWidth="1" />
          </svg>
        </span>
        {/* THE BLADE: shivers at the top... then drops */}
        <span className="gp-guillotine absolute left-[36%] top-[20%] block h-[19%] w-[28%]" style={{ animationDelay: `${delayMs + 700}ms` }}>
          <svg viewBox="0 0 28 19" className="h-full w-full" aria-hidden="true">
            {/* the mouton weight */}
            <rect x="3" y="0.5" width="22" height="7" rx="0.8" fill="#7a5b3a" stroke="#3a2a1a" strokeWidth="1" />
            {/* the angled blade */}
            <path d="M3 7.5 H25 L25 11 L3 17.5 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
            <path d="M4.5 15.8 L24 10" stroke="rgba(238,241,247,0.9)" strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* the stroke lands: flare at the stocks */}
        <span
          className="gp-flash absolute left-[36%] top-[52%] block h-[13%] w-[28%] rounded-full"
          style={{ background: "rgba(255,214,120,0.8)", animationDelay: `${delayMs + 1780}ms` }}
        />
        {/* ...and the crown comes off, bouncing away down the ranks */}
        <span
          className="gp-rattle absolute left-[47%] top-[52%] block h-[7%] w-[8%]"
          style={{ "--dx": "260%", "--dy": "-180%", "--rot": "220deg", animationDelay: `${delayMs + 1820}ms` } as React.CSSProperties}
        >
          <svg viewBox="0 0 12 8" className="h-full w-full" aria-hidden="true">
            <path d="M1.5 7 L2 2 L4.2 4.2 L6 1 L7.8 4.2 L10 2 L10.5 7 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
            <circle cx="4" cy="6" r="0.5" fill="#7a5b23" />
            <circle cx="8" cy="6" r="0.5" fill="#7a5b23" />
          </svg>
        </span>
        <ShardBurst vectors={BURST_MED} fill="#e6bf6a" stroke="#7a2f28" delayMs={delayMs + 1840} sizePct={6} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1880 + i * 170} color="rgba(230,191,106,0.85)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[30%] top-0 block h-[54%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 30 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 4 L10 10 L15 2 L20 10 L24 4 L24 13 L6 13 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
          <path d="M15 13 L15 30 M9 34 C9 26 21 26 21 34 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Divine Right: a shaft of heaven-light falls and a crown settles on the king,
 * who rules with a queen's reach. */
function DivineRightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — SIGNED, GOD: a parchment decree the width of the
    // sky unrolls over the board, a colossal quill bobs across it signing the
    // king's divine right into law, and then the great wax seal is slammed
    // onto the ranks below — leaving a glowing crown-in-wax impression and a
    // TRIPLE anointing shockwave. Bureaucracy, but celestial.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,246,200,0.28)" delayMs={delayMs} />
        {GOD_FAN.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-[6%] block h-[62%]"
            style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r})`, transformOrigin: "50% 0%" }}
          >
            <span
              className="fx-sig-shaft absolute inset-0 block"
              style={{ background: "linear-gradient(180deg, rgba(255,232,150,0.85), transparent 78%)", animationDelay: `${delayMs + 40 + s.d}ms` }}
            />
          </span>
        ))}
        {/* the decree, unrolling across the sky */}
        <span className="gp-drape absolute left-[25%] top-[9%] block h-[26%] w-[50%]" style={{ animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 50 26" className="h-full w-full" aria-hidden="true">
            {/* roll bars */}
            <rect x="0" y="0" width="50" height="3.4" rx="1.7" fill="#c9a244" stroke="#7a5b23" strokeWidth="0.7" />
            <rect x="0" y="22.6" width="50" height="3.4" rx="1.7" fill="#c9a244" stroke="#7a5b23" strokeWidth="0.7" />
            {/* the parchment */}
            <rect x="2" y="3" width="46" height="20" fill="#f2e7c8" stroke="#b79a5a" strokeWidth="0.9" />
            {/* the writ, line by line */}
            <path d="M6 8 H44 M6 11.5 H44 M6 15 H38" stroke="#b79a5a" strokeWidth="1" strokeLinecap="round" />
            {/* the signature line, freshly inked */}
            <path d="M6 19.5 C10 17.5 12 21 16 18.5 C19 16.8 21 20.5 25 18.5" fill="none" stroke="#8a6414" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </span>
        {/* the colossal quill, bobbing as it signs */}
        <span className="gp-quill absolute left-[36%] top-[8%] block h-[22%] w-[24%]" style={{ animationDelay: `${delayMs + 480}ms` }}>
          <svg viewBox="0 0 24 22" className="h-full w-full" aria-hidden="true">
            {/* the feather */}
            <path d="M4 20 C8 12 14 5 22 1 C20 7 15 13 8 18 Z" fill="#fff7de" stroke="#b98a2e" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M6 18 C10 12 15 7 20 3" fill="none" stroke="rgba(185,138,46,0.55)" strokeWidth="0.6" />
            {/* the nib */}
            <path d="M4 20 L2.4 21.6" stroke="#7a5b23" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        {/* the great wax seal comes DOWN on the king */}
        <span className="gp-stampdown absolute left-[41%] top-[28%] block h-[27%] w-[18%]" style={{ animationDelay: `${delayMs + 1020}ms`, animationDuration: "1.6s" }}>
          <svg viewBox="0 0 18 27" className="h-full w-full" aria-hidden="true">
            <ellipse cx="9" cy="2.6" rx="3.4" ry="2.2" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
            <path d="M7.4 4.5 C7 9 7 13 7.4 17 H10.6 C11 13 11 9 10.6 4.5 Z" fill="#c9a244" stroke="#7a5b23" strokeWidth="0.8" strokeLinejoin="round" />
            <ellipse cx="9" cy="21" rx="8" ry="5.4" fill="#c25248" stroke="#7a2f28" strokeWidth="1" />
          </svg>
        </span>
        {/* the wax impression left on the ranks */}
        <span className="gp-seal absolute left-[38%] top-[49%] block h-[15%] w-[24%]" style={{ animationDelay: `${delayMs + 1560}ms` }}>
          <svg viewBox="0 0 24 15" className="h-full w-full" aria-hidden="true">
            <ellipse cx="12" cy="7.5" rx="11" ry="6.5" fill="rgba(194,82,72,0.85)" stroke="#7a2f28" strokeWidth="1" />
            <ellipse cx="12" cy="7.5" rx="8.4" ry="4.6" fill="none" stroke="rgba(255,236,178,0.7)" strokeWidth="0.6" strokeDasharray="1.8 1.2" />
            <path d="M8.5 10 L9 5.5 L10.8 7.5 L12 4.5 L13.2 7.5 L15 5.5 L15.5 10 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </span>
        {/* the seal lands: flare + sparks + TRIPLE anointing shockwave */}
        <span
          className="gp-flash absolute left-[38%] top-[48%] block h-[15%] w-[24%] rounded-full"
          style={{ background: "rgba(255,246,200,0.85)", animationDelay: `${delayMs + 1520}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 1560} sizePct={7} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1600 + i * 170} color="rgba(230,191,106,0.9)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[34%] top-0 block h-[92%] w-[32%]" style={{ background: "rgba(255,246,200,0.6)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crown absolute left-1/2 top-[10%] ml-[-22%] block h-[34%] w-[44%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 14" className="h-full w-full" aria-hidden="true">
          <path d="M2 12 L2 4.5 L7 8 L12 1.5 L17 8 L22 4.5 L22 12 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Ascendancy: every piece is haloed and lifts as it ascends to a queen's
 * reach; motes of gold light rise around it. */
function AscendancyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 10) — THE GREAT RUBBER STAMP OF ASCENSION: gold rays
    // break over the board, a COLOSSAL bureau-of-heaven rubber stamp is
    // hoisted, SLAMMED down on the whole army ("PROMOTED. ALL OF YOU."),
    // wiggled free the way real stamps are, and lifted away — leaving a giant
    // glowing crown seal on the ranks while crowns confetti down and a TRIPLE
    // golden shockwave rolls out.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,64,0.26)" delayMs={delayMs} />
        {GOD_FAN.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-[6%] block h-[62%]"
            style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r})`, transformOrigin: "50% 0%" }}
          >
            <span
              className="fx-sig-shaft absolute inset-0 block"
              style={{ background: "linear-gradient(180deg, rgba(255,236,178,0.85), transparent 78%)", animationDelay: `${delayMs + s.d}ms` }}
            />
          </span>
        ))}
        {/* the colossal stamp: knob, handle, block — and SLAM */}
        <span className="gp-stampdown absolute left-[34%] top-[14%] block h-[40%] w-[32%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
          <svg viewBox="0 0 36 42" className="h-full w-full" aria-hidden="true">
            {/* turned wooden knob + handle */}
            <ellipse cx="18" cy="4" rx="5.5" ry="3.4" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
            <path d="M15.5 7 C15 12 15 16 15.5 20 H20.5 C21 16 21 12 20.5 7 Z" fill="#c9a244" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
            {/* the stamp block */}
            <path d="M7 20 H29 L31 28 H5 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.2" strokeLinejoin="round" />
            <rect x="5" y="28" width="26" height="6" rx="1" fill="#c9a244" stroke="#7a5b23" strokeWidth="1" />
            {/* the die face: a mirrored crown, ready to print */}
            <path d="M11 40 L11.5 35.5 L14 37.5 L18 34.5 L22 37.5 L24.5 35.5 L25 40 Z" fill="#7a5b23" stroke="#5a3f14" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
        {/* the seal it leaves: a giant crown impression ringed in gold ink */}
        <span className="gp-seal absolute left-[32%] top-[44%] block h-[26%] w-[36%]" style={{ animationDelay: `${delayMs + 860}ms` }}>
          <svg viewBox="0 0 44 30" className="h-full w-full" aria-hidden="true">
            <ellipse cx="22" cy="15" rx="20" ry="13" fill="rgba(244,196,64,0.2)" stroke="#e6bf6a" strokeWidth="1.6" />
            <ellipse cx="22" cy="15" rx="16" ry="9.8" fill="none" stroke="rgba(230,191,106,0.8)" strokeWidth="0.7" strokeDasharray="2.6 1.8" />
            <path d="M15 20 L16 11 L19.5 14.5 L22 9 L24.5 14.5 L28 11 L29 20 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
            <circle cx="17.5" cy="18" r="0.8" fill="#7a5b23" />
            <circle cx="22" cy="18" r="0.8" fill="#7a5b23" />
            <circle cx="26.5" cy="18" r="0.8" fill="#7a5b23" />
          </svg>
        </span>
        {/* crowns confetti down over the promoted ranks */}
        <BoardRain
          delayMs={delayMs + 900}
          render={() => (
            <svg viewBox="0 0 12 8" className="h-full w-full" aria-hidden="true">
              <path d="M1.5 7 L2 2 L4.2 4.2 L6 1 L7.8 4.2 L10 2 L10.5 7 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="0.7" strokeLinejoin="round" />
            </svg>
          )}
        />
        {/* the SLAM: flare + sparks + a TRIPLE golden shockwave */}
        <span
          className="gp-flash absolute left-[36%] top-[50%] block h-[16%] w-[28%] rounded-full"
          style={{ background: "rgba(255,236,178,0.85)", animationDelay: `${delayMs + 820}ms` }}
        />
        <ShardBurst vectors={BURST_MED} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 860} sizePct={7} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 900 + i * 170} color="rgba(230,191,106,0.9)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[34%] bottom-[10%] block h-[52%] w-[32%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 30" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 L5 12 L8 16 L10 8 L12 16 L15 12 L16 28 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute left-[28%] top-[6%] block h-[26%] w-[44%] rounded-full" style={{ border: "1.5px solid rgba(244,196,64,0.9)", animationDelay: `${delayMs + 80}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 120} sizePct={8} />
    </span>
  );
}

/** Divine Mandate: a sealed decree stamps down and a heaven-ward halo falls over
 * the enemy piece that defects to your side. */
// The looping ceremonial signature stroke (drawn twice: gold glow under ink).
const MANDATE_SIGNATURE =
  "M3 14 C6 6 10 5 11 9 C12 13 8 16 6 13 C10 8 16 4 19 8 C21 11 18 15 15 13 C19 7 26 5 29 9 C31 12 28 15 25 13 C30 6 38 5 41 9 C43 12 40 15 37 13 C42 7 49 6 53 10";

function MandateBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // Marquee upgrade — SIGN THE BOARD: the imperial mandate scroll unrolls
    // down the middle of the board (the tell), a quill walks the parchment
    // drawing a looping glowing signature (revealed by a sliding mask — no
    // dashoffset, transform only), and the wax seal STAMPS home with a flash
    // and a ring shockwave. No fingerprint anywhere.
    const signAt = delayMs + 700; // the quill waits for the scroll to unroll
    const sealAt = signAt + 950; // the seal waits for the signature
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,232,150,0.22)" delayMs={delayMs} />
        {/* the scroll, unrolling top to bottom */}
        <span className="fx-sig-unroll absolute left-[33%] top-[26%] block h-[46%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 54" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <rect x="4" y="3" width="32" height="48" rx="1.5" fill="#f2e7c8" stroke="#8a6414" strokeWidth="1.2" />
            {/* rolled ends */}
            <rect x="2" y="0.6" width="36" height="4.4" rx="2.2" fill="#e0cf9e" stroke="#8a6414" strokeWidth="1" />
            <rect x="2" y="49" width="36" height="4.4" rx="2.2" fill="#e0cf9e" stroke="#8a6414" strokeWidth="1" />
            {/* the decree lines above the signature block */}
            <path d="M9 11 H31 M9 15.5 H31 M9 20 H26" stroke="#b79a5a" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        {/* the signature: gold glow under ink, revealed left to right by the
            sliding-mask pair (wrapper slides right, inner slides left) */}
        <span className="fx-sig-maskslide absolute left-[36%] top-[46%] block h-[10%] w-[28%]" style={{ animationDelay: `${signAt}ms` }}>
          <span className="fx-sig-maskslide-inner absolute inset-0 block">
            <span className="absolute inset-0 block" style={{ animationDelay: `${signAt}ms` }} />
            <svg viewBox="0 0 56 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d={MANDATE_SIGNATURE} fill="none" stroke="rgba(255,232,150,0.75)" strokeWidth="3.6" strokeLinecap="round" />
              <path d={MANDATE_SIGNATURE} fill="none" stroke="#8a6414" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        {/* the quill, walking the line as the stroke appears */}
        <span className="fx-sig-quill absolute left-[47%] top-[40%] block h-[10%] w-[6%]" style={{ animationDelay: `${signAt}ms` }}>
          <svg viewBox="0 0 16 26" className="h-full w-full" aria-hidden="true">
            {/* the feather, nib down */}
            <path d="M6 22 C4 15 6 7 13 1 C14 8 12 16 8 21 Z" fill="#f2e7c8" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
            <path d="M9 18 C9 12 10 7 12.5 3" fill="none" stroke="#b79a5a" strokeWidth="0.7" />
            <path d="M6 22 L5 25.5" stroke="#3a2a1a" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        {/* the wax seal STAMPS home... */}
        <span className="fx-sig-sealstamp absolute left-[44.5%] top-[58.5%] block h-[9%] w-[11%]" style={{ animationDelay: `${sealAt}ms` }}>
          <svg viewBox="0 0 24 20" className="h-full w-full" aria-hidden="true">
            <ellipse cx="12" cy="10" rx="10.4" ry="8.8" fill="#c25248" stroke="#7a2f28" strokeWidth="1.2" />
            <ellipse cx="12" cy="10" rx="6.2" ry="5.2" fill="none" stroke="#f2e7c8" strokeWidth="0.9" />
            {/* the crowned sigil pressed into the wax */}
            <path d="M8.5 12.5 L9 8 L10.8 10 L12 7 L13.2 10 L15 8 L15.5 12.5 Z" fill="#f2e7c8" stroke="#7a2f28" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </span>
        {/* ...with a wax flash and the ring shockwave rolling past the edges */}
        <span
          className="fx-sig-flash absolute left-[45%] top-[59%] block h-[8%] w-[10%] rounded-full"
          style={{ background: "rgba(255,214,160,0.75)", animationDelay: `${sealAt + 280}ms` }}
        />
        <BoardBoom delayMs={sealAt + 320} color="rgba(230,191,106,0.9)" thickness={4} />
        <BoardBoom delayMs={sealAt + 490} color="rgba(194,82,72,0.8)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[24%] top-[16%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <rect x="9" y="7" width="22" height="26" rx="1" fill="#f2e7c8" stroke="#8a6414" strokeWidth="1.2" />
          <path d="M13 13 H27 M13 18 H27 M13 23 H23" stroke="#b79a5a" strokeWidth="1" strokeLinecap="round" />
          <circle cx="20" cy="30" r="4" fill="#c25248" stroke="#7a2f28" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[16%] block rounded-full" style={{ border: "1.5px solid rgba(255,232,150,0.85)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Blackout: the lights cut out on the enemy court. A breaker panel slams to OFF
 * and a dark curtain wipes across the square. */
function BlackoutBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 9) — SOMEONE HIT THE MASTER BREAKER: a colossal hand
    // shoots in from off-crop, grips the great wall-mounted breaker panel,
    // and THROWS the lever to OFF. The dark drops over the board curtain-band
    // by curtain-band, one last spotlight sways and gutters and dies... and
    // then two pairs of cartoon eyes blink awake in the pitch black.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(12,14,20,0.45)" delayMs={delayMs} />
        {/* the great breaker panel, bolted beside the board */}
        <span
          className="gp-grab absolute left-[64%] top-[28%] block h-[28%] w-[18%]"
          style={{ "--from": "70%", animationDelay: `${delayMs + 100}ms` } as React.CSSProperties}
        >
          <svg viewBox="0 0 20 30" className="h-full w-full" aria-hidden="true">
            <rect x="2" y="1" width="16" height="28" rx="1.4" fill="#3a4450" stroke="#141e2b" strokeWidth="1.2" />
            <rect x="4" y="3" width="12" height="7" rx="0.8" fill="rgba(20,30,43,0.9)" stroke="#141e2b" strokeWidth="0.7" />
            <circle cx="7" cy="6.5" r="1.4" fill="#7eb59a" />
            <circle cx="13" cy="6.5" r="1.4" fill="#e0776b" />
            {/* bolt heads */}
            <circle cx="4" cy="27" r="0.8" fill="#c9d2dc" />
            <circle cx="16" cy="27" r="0.8" fill="#c9d2dc" />
            {/* the lever slot */}
            <rect x="8.5" y="13" width="3" height="13" rx="1.4" fill="rgba(8,8,12,0.9)" stroke="#141e2b" strokeWidth="0.6" />
          </svg>
        </span>
        {/* the LEVER, thrown to OFF */}
        <span
          className="gp-lever absolute left-[69.5%] top-[32%] block h-[14%] w-[7%]"
          style={{ transformOrigin: "50% 88%", animationDelay: `${delayMs + 620}ms` }}
        >
          <svg viewBox="0 0 8 16" className="h-full w-full" aria-hidden="true">
            <path d="M4 14 L4 3" stroke="#c9d2dc" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="4" cy="2.4" r="2.2" fill="#e0776b" stroke="#141e2b" strokeWidth="0.7" />
          </svg>
        </span>
        {/* CLUNK: one dark ring rolls out as the grid dies */}
        <BoardBoom delayMs={delayMs + 1150} color="rgba(90,107,143,0.7)" thickness={4} />
        {/* the dark drops, curtain-band by curtain-band */}
        {[
          { t: 21.5, d: 1050 },
          { t: 36, d: 1180 },
          { t: 50, d: 1310 },
          { t: 64, d: 1440 },
        ].map((b, i) => (
          <span
            key={i}
            className="gp-drape absolute left-0 right-0 block"
            style={{ top: `${b.t}%`, height: "15%", background: "rgba(6,6,10,0.88)", animationDelay: `${delayMs + b.d}ms` }}
          />
        ))}
        {/* one last spotlight fights the dark... sways... gutters... dies */}
        <span className="gp-spotlight absolute left-[43%] top-[24%] block h-[38%] w-[14%]" style={{ animationDelay: `${delayMs + 1350}ms` }}>
          <svg viewBox="0 0 14 38" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M6 0 H8 L14 38 H0 Z" fill="rgba(255,244,200,0.5)" />
            <ellipse cx="7" cy="37" rx="7" ry="1.6" fill="rgba(255,244,200,0.55)" />
          </svg>
        </span>
        {/* ...and the eyes blink awake in the black */}
        {[
          { l: 35, t: 45, d: 1750 },
          { l: 58, t: 55, d: 1850 },
        ].map((e, i) => (
          <span key={i} className="gp-eyes absolute block" style={{ left: `${e.l}%`, top: `${e.t}%`, width: "7%", height: "4%", animationDelay: `${delayMs + e.d}ms` }}>
            <svg viewBox="0 0 14 8" className="h-full w-full" aria-hidden="true">
              <ellipse cx="4" cy="4" rx="2.6" ry="3.2" fill="#e8eef6" />
              <ellipse cx="10" cy="4" rx="2.6" ry="3.2" fill="#e8eef6" />
              <circle cx="4.6" cy="4.6" r="1" fill="#141e2b" />
              <circle cx="10.6" cy="4.6" r="1" fill="#141e2b" />
            </svg>
          </span>
        ))}
        {/* the afterthought: a faint second ring in the dark */}
        <BoardBoom delayMs={delayMs + 2200} color="rgba(58,68,80,0.7)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-[6%] block rounded-[1px]" style={{ background: "rgba(12,14,20,0.72)", animationDelay: `${delayMs + 120}ms`, transformOrigin: "50% 50%" }} />
      <span className="fx-sig-snooze absolute left-[36%] top-[22%] block h-[42%] w-[28%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 28" className="h-full w-full" aria-hidden="true">
          <rect x="4" y="2" width="12" height="24" rx="1" fill="#3a4450" stroke="#141e2b" strokeWidth="1" />
          <rect x="8" y="14" width="4" height="9" rx="1" fill="#c9d2dc" stroke="#141e2b" strokeWidth="0.8" />
          <circle cx="10" cy="8" r="1.6" fill="#e0776b" />
        </svg>
      </span>
    </span>
  );
}

/** Griffon Rider: a griffon swoops in on beating wings and sets a carried piece
 * down on the empty square. */
function GriffonCarryBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead flies the griffon over
  // the WHOLE board — a sky wash while the colossal beast streaks across the
  // crop on a beating wing.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(202,161,90,0.2)" delayMs={delayMs} />
        <span className="fx-sig-gallop absolute left-[26%] top-[30%] block h-[26%] w-[38%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
            <path d="M12 22 C8 16 11 10 17 9 C18 5 24 5 25 9 C30 11 31 18 27 24 Z" fill="#caa15a" stroke="#6e5321" strokeWidth="1" strokeLinejoin="round" />
            <path d="M28 8 L36 6 L31 10 Z" fill="#e8912d" stroke="#8a5311" strokeWidth="0.7" strokeLinejoin="round" />
            <circle cx="26" cy="8" r="0.9" fill="#141e2b" />
            <g className="fx-sig-wingbeat" style={{ animationDelay: `${delayMs + 60}ms` }}>
              <path d="M18 12 L4 2 L10 12 L4 14 Z" fill="#e8e2d2" stroke="#6e5321" strokeWidth="0.9" strokeLinejoin="round" />
            </g>
          </svg>
        </span>
        <span className="fx-sig-ash absolute left-[34%] bottom-[26%] block h-[7%] w-[32%] rounded-full" style={{ background: "rgba(196,178,142,0.45)", animationDelay: `${delayMs + 320}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-streak absolute left-[-4%] top-[-6%] block h-[62%] w-[62%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M12 22 C8 16 11 10 17 9 C18 5 24 5 25 9 C30 11 31 18 27 24 Z" fill="#caa15a" stroke="#6e5321" strokeWidth="1" strokeLinejoin="round" />
          <path d="M28 8 L36 6 L31 10 Z" fill="#e8912d" stroke="#8a5311" strokeWidth="0.7" strokeLinejoin="round" />
          <circle cx="26" cy="8" r="0.9" fill="#141e2b" />
        </svg>
      </span>
      <span className="fx-sig-wingbeat absolute left-[6%] top-[4%] block h-[34%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M20 20 L2 6 L10 20 L2 22 Z" fill="#e8e2d2" stroke="#6e5321" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[40%] bottom-[14%] block h-[40%] w-[26%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="6" r="3.2" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
          <path d="M3 22 C3.6 14 5 12 8 12 C11 12 12.4 14 13 22 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute inset-x-[36%] bottom-[10%] block h-[14%] rounded-full" style={{ background: "rgba(196,178,142,0.5)", animationDelay: `${delayMs + 300}ms` }} />
    </span>
  );
}

/** Grand Army: a fresh force answers the call. A rank of banner-topped spears
 * heaves up out of the ground. */
function GrandArmyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    // APEX pass (tier 10) — THE SKY DROPS AN ARMY: letterbox bars slam in and
    // FOUR colossal pieces scream down out of the sky one after another —
    // pawn, knight, rook — each squashing onto the ranks with its own flare
    // and dust, before the QUEEN lands dead centre and the whole muster
    // detonates a TRIPLE golden shockwave. Lesser soldiery rains in behind.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.24)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* the rank, dropping in one after another (queen last, biggest) */}
        {[
          { l: 27, w: 9, h: 20, d: 160, k: "pawn" as const },
          { l: 38, w: 10, h: 23, d: 420, k: "knight" as const },
          { l: 62, w: 10, h: 23, d: 680, k: "rook" as const },
          { l: 47.5, w: 13, h: 30, d: 940, k: "queen" as const },
        ].map((v, i) => (
          <React.Fragment key={i}>
            <span
              className="gp-pod absolute block"
              style={{ left: `${v.l}%`, top: `${62 - v.h}%`, width: `${v.w}%`, height: `${v.h}%`, animationDelay: `${delayMs + v.d}ms` }}
            >
              <ApexPiece kind={v.k} fill="#e8e2d2" stroke="#6e5321" />
            </span>
            {/* its own touchdown flare + dust puff */}
            <span
              className="gp-flash absolute block rounded-full"
              style={{
                left: `${v.l - 2}%`,
                top: "58%",
                width: `${v.w + 4}%`,
                height: "7%",
                background: "rgba(255,236,178,0.75)",
                animationDelay: `${delayMs + v.d + 480}ms`,
              }}
            />
          </React.Fragment>
        ))}
        {/* the lesser soldiery, raining in behind the vanguard */}
        <BoardRain
          delayMs={delayMs + 700}
          render={(i) => <ApexPiece kind={i % 3 === 0 ? "pawn" : i % 3 === 1 ? "rook" : "knight"} fill="#e8e2d2" stroke="#6e5321" />}
        />
        {/* the queen's landing: sparks + a TRIPLE golden shockwave */}
        <ShardBurst vectors={BURST_BIG} fill="#e6bf6a" stroke="#6e5321" delayMs={delayMs + 1440} sizePct={6} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 1480 + i * 170} color="rgba(230,191,106,0.9)" thickness={4 - i} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {[{ l: "16%", d: 0 }, { l: "40%", d: 70 }, { l: "64%", d: 35 }].map((s, i) => (
        <span key={i} className="fx-sig-brick absolute bottom-[10%] block h-[64%] w-[16%]" style={{ left: s.l, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 16 40" className="h-full w-full" aria-hidden="true">
            <path d="M8 40 L8 6" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 6 L15 8 L8 12 Z" fill={i % 2 === 0 ? "#e0776b" : "#7eb59a"} stroke="#3a2a1a" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M8 4 L8 8" stroke="#e6bf6a" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </span>
  );
}

/** Mortgage: a loan is drawn against the home. A SOLD sign plants and a
 * mortgaged rook rises behind it; a few gold coins scatter. */
function MortgageBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 6+ board-wide guarantee: the lead forecloses on the WHOLE
  // board — a gold wash while a colossal SOLD sign plants mid-crop and coins
  // rain down the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.18)" delayMs={delayMs} />
        <span className="fx-sig-brick absolute left-[34%] bottom-[34%] block h-[22%] w-[24%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 30 24" className="h-full w-full" aria-hidden="true">
            <path d="M4 24 L4 4" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="3" width="22" height="12" rx="1" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
            <path d="M8 9 H22 M8 12 H18" stroke="#f4f7f2" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <BoardRain
          delayMs={delayMs + 160}
          render={() => (
            <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill="#f4c430" stroke="#8a6414" strokeWidth="0.9" />
              <circle cx="6" cy="6" r="2.6" fill="none" stroke="#8a6414" strokeWidth="0.7" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[42%] bottom-[12%] block h-[46%] w-[26%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-brick absolute left-[18%] bottom-[16%] block h-[40%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 30 24" className="h-full w-full" aria-hidden="true">
          <path d="M4 24 L4 4" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="3" width="22" height="12" rx="1" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" />
          <path d="M8 9 H22 M8 12 H18" stroke="#f4f7f2" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 220} sizePct={8} />
    </span>
  );
}

/** Repo Rook: a repo man's tow-hook lowers a rook behind enemy lines on a chain,
 * a REPO tag swinging from it. */
function RepoRookBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead sends the tow rig over
  // the WHOLE board — a steel-dusk wash while a colossal hook lowers mid-crop
  // on its chain and the repossessed rook rises to meet it.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(91,102,114,0.24)" delayMs={delayMs} />
        <span className="fx-sig-crownfall absolute left-[49%] top-[16%] block h-[24%] w-[4%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 6 24" className="h-full w-full" aria-hidden="true">
            <path d="M3 0 V16 C3 20 6 20 6 16" fill="none" stroke="#5b6672" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="fx-sig-rise absolute left-[42%] bottom-[30%] block h-[26%] w-[13%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
          <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
            <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="fx-sig-zzz absolute left-[54%] top-[34%] block h-[8%] w-[11%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
          <svg viewBox="0 0 24 12" className="h-full w-full" aria-hidden="true">
            <rect x="1" y="2" width="22" height="8" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[52%] top-0 block h-[26%] w-[8%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 6 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 0 V16 C3 20 6 20 6 16" fill="none" stroke="#5b6672" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[36%] bottom-[14%] block h-[46%] w-[28%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 16 24" className="h-full w-full" aria-hidden="true">
          <path d="M3 22 V10 L2.4 9.4 V5 H5 V6.6 H7 V5 H9 V6.6 H11 V5 H13.6 V9.4 L13 10 V22 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[56%] top-[24%] block h-[18%] w-[26%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
        <svg viewBox="0 0 24 12" className="h-full w-full" aria-hidden="true">
          <rect x="1" y="2" width="22" height="8" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
        </svg>
      </span>
    </span>
  );
}

/** Musical Chairs: the music stops and two pieces scramble to swap seats, a
 * chair spinning in on the beat. */
function MusicalChairsBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead stops the music for the
  // WHOLE board — a warm wash while a colossal chair-and-note spins mid-crop
  // and a scramble ring rolls out on the final beat.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.18)" delayMs={delayMs} />
        <span className="fx-sig-swirl absolute inset-[32%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <path d="M12 34 V16 M12 16 H24 M24 14 V34 M12 24 H24" fill="none" stroke="#8a6a4a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M26 8 a5 5 0 1 1 -0.1 0" fill="none" stroke="#e0776b" strokeWidth="2" />
            <circle cx="26" cy="18" r="2" fill="#e6bf6a" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 300} color="rgba(224,119,107,0.8)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M12 34 V16 M12 16 H24 M24 14 V34 M12 24 H24" fill="none" stroke="#8a6a4a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 8 a5 5 0 1 1 -0.1 0" fill="none" stroke="#e0776b" strokeWidth="2" />
          <circle cx="26" cy="18" r="2" fill="#e6bf6a" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#7eb59a" stroke="#2c473a" delayMs={delayMs + 120} sizePct={8} />
    </span>
  );
}

/** Deal with the Devil: a smoking contract is signed and stamped with a red
 * sigil; the pawn is crowned in brimstone (and the devil collects). */
function DevilDealBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(90,70,80,0.24)" boom="rgba(242,231,200,0.85)" delayMs={delayMs} motifClass="fx-sig-grow">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <rect x="10" y="8" width="20" height="24" rx="1" fill="#f2e7c8" stroke="#7a2f28" strokeWidth="1.2" />
          <path d="M20 12 L22 17 L27 17 L23 20 L24.5 25 L20 22 L15.5 25 L17 20 L13 17 L18 17 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="0.7" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[26%] top-[18%] block h-[48%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <rect x="10" y="8" width="20" height="24" rx="1" fill="#f2e7c8" stroke="#7a2f28" strokeWidth="1.2" />
          <path d="M20 12 L22 17 L27 17 L23 20 L24.5 25 L20 22 L15.5 25 L17 20 L13 17 L18 17 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="0.7" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-ash absolute left-[44%] top-[10%] block h-[24%] w-[20%] rounded-full" style={{ background: "rgba(90,70,80,0.5)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Berserk Pawn: a pawn flies into a red frenzy, a snarl of rage streaks flaring
 * around it (before it burns out). */
function BerserkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(224,90,82,0.24)" boom="rgba(224,119,107,0.85)" delayMs={delayMs} motifClass="fx-sig-afterimage">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#e0776b" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M6 10 L30 20 M4 22 L26 30 M12 6 L28 26" /></g>
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[16%] top-[16%] block h-[58%] w-[58%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <g stroke="#e0776b" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M6 10 L30 20 M4 22 L26 30 M12 6 L28 26" /></g>
        </svg>
      </span>
      <span className="fx-sig-flash absolute inset-[24%] block rounded-full" style={{ background: "rgba(224,90,82,0.6)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

/** Glaciate: one enemy piece is encased solid in a block of blue ice that forms
 * with a shiver and holds. */
function EncaseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ice absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 8 L30 6 L34 32 L10 34 Z" fill="rgba(198,234,255,0.5)" stroke="#8aa0b4" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M12 10 L20 30 M26 9 L18 33" stroke="rgba(244,250,255,0.8)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#dbe7f2" stroke="#8aa0b4" delayMs={delayMs + 120} sizePct={7} />
    </span>
  );
}

/** Snowball: a snowball is hurled in from the corner and splats over the pawn in
 * a glaze of frost. */
function SnowballBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {lead && (
        <span className="fx-sig-streak absolute left-[-6%] top-[-8%] block h-[54%] w-[54%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="30" cy="30" r="7" fill="#f4faff" stroke="#8aa0b4" strokeWidth="1.2" />
            <path d="M2 2 L22 22" stroke="rgba(198,234,255,0.7)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className="fx-sig-frost absolute inset-x-[16%] top-[38%] block h-[24%] rounded-full" style={{ background: "rgba(244,250,255,0.7)", animationDelay: `${delayMs + 200}ms`, transformOrigin: "50% 50%" }} />
      <ShardBurst vectors={BURST_MED} fill="#f4faff" stroke="#8aa0b4" delayMs={delayMs + 220} sizePct={8} />
    </span>
  );
}

/** Gale: a driving wind opens gaps; a bishop shimmers and phases as the gust
 * sweeps through. */
function GalePhaseBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[4%] top-[36%] block h-[26%] rounded-full" style={{ background: "rgba(158,206,178,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-afterimage absolute left-[30%] top-[16%] block h-[52%] w-[40%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 6 C26 12 28 20 28 26 C28 31 24 34 20 34 C16 34 12 31 12 26 C12 20 14 12 20 6 Z" fill="rgba(126,181,154,0.4)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wave absolute inset-x-[10%] top-[54%] block h-[16%] rounded-full" style={{ background: "rgba(158,206,178,0.4)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

/** Opposite Day: everything runs backwards. Two arrows counter-rotate as the
 * enemy is forbidden to close on your king. */
function OppositeDayBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 11 upgrade: on the lead square the whole board flips — two giant
  // arrows charge the full crop in OPPOSITE directions (coral right-bound on
  // top, mint left-bound below) over a pale reversal wash.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(224,119,107,0.12)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[38%] top-[34%] block h-[10%] w-[16%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 48 14" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M2 7 H36" stroke="#e0776b" strokeWidth="4" strokeLinecap="round" />
            <path d="M34 1 L46 7 L34 13 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="fx-sig-crossback absolute left-[46%] top-[54%] block h-[10%] w-[16%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
          <svg viewBox="0 0 48 14" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M46 7 H12" stroke="#7eb59a" strokeWidth="4" strokeLinecap="round" />
            <path d="M14 1 L2 7 L14 13 Z" fill="#7eb59a" stroke="#2f4a3c" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 14 A13 13 0 0 1 32 14" fill="none" stroke="#e0776b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 14 L6 8 L13 10 Z" fill="#e0776b" />
          <path d="M32 26 A13 13 0 0 1 8 26" fill="none" stroke="#7eb59a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M32 26 L34 32 L27 30 Z" fill="#7eb59a" />
        </svg>
      </span>
    </span>
  );
}

// --- 10j. Batch 10 visuals (board-wide virus + gambling wheels + a livelier
// brainrot drum-man + a slapstick funny batch) -------------------------------
// Same rules as every signature: flat SVG fills / solid discs (no gradients /
// glow / box-shadow / blur), 1px corners, coral / mint / sun / gold, transform +
// opacity only, one-shot, hidden entirely under reduced motion. Most compose the
// shared fx-sig-* classes; the genuinely new motions (codefall / sweepbar /
// wheelspin / tick / reel / coinflip / punch, plus the hop / wiggle / chomp
// personality loops) live in effects.css.

// COMPUTER VIRUS: a spreading digital corruption over the WHOLE board. The lead
// paints an oversized layer (clipped by the board crop, like the dragon / wizard
// marquee leads) with cascading green code columns, sweeping glitch bars, and a
// corruption flash; every target square gets a compact code / glitch hit.
const VIRUS_COLS = [
  { left: "2%", d: 0 }, { left: "9%", d: 150 }, { left: "16%", d: 70 },
  { left: "23%", d: 240 }, { left: "30%", d: 30 }, { left: "37%", d: 180 },
  { left: "44%", d: 100 }, { left: "51%", d: 300 }, { left: "58%", d: 50 },
  { left: "65%", d: 210 }, { left: "72%", d: 130 }, { left: "79%", d: 20 },
  { left: "86%", d: 260 }, { left: "93%", d: 90 },
];
const VIRUS_BARS = [
  { top: "12%", d: 0, c: "rgba(126,181,154,0.55)" },
  { top: "30%", d: 160, c: "rgba(224,119,107,0.5)" },
  { top: "48%", d: 60, c: "rgba(126,181,154,0.5)" },
  { top: "64%", d: 220, c: "rgba(230,191,106,0.45)" },
  { top: "82%", d: 120, c: "rgba(224,119,107,0.45)" },
];
function CodeColumn() {
  return (
    <svg viewBox="0 0 10 64" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <g fill="#7eb59a">
        <rect x="2" y="1" width="6" height="2.4" opacity="0.3" />
        <rect x="1" y="7" width="7" height="2.4" opacity="0.45" />
        <rect x="3" y="13" width="5" height="2.4" opacity="0.35" />
        <rect x="1" y="19" width="6" height="2.4" opacity="0.5" />
        <rect x="2" y="25" width="7" height="2.4" opacity="0.4" />
        <rect x="1" y="31" width="5" height="2.4" opacity="0.55" />
        <rect x="3" y="37" width="6" height="2.4" opacity="0.6" />
        <rect x="1" y="43" width="7" height="2.4" opacity="0.7" />
        <rect x="2" y="49" width="6" height="2.4" opacity="0.85" />
      </g>
      <rect x="1" y="55" width="8" height="4" fill="#cfe8d8" />
    </svg>
  );
}
function VirusSpreadBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
        <span className="absolute left-[-750%] top-[-750%] block h-[1600%] w-[1600%]">
          <span className="fx-sig-glitch absolute inset-0 block" style={{ background: "rgba(126,181,154,0.12)", animationDelay: `${delayMs}ms` }} />
          {/* CRT scanline flicker over the whole board while the corruption runs. */}
          <span
            className="fx-cast-scanlines absolute inset-0 block"
            style={{
              background: "repeating-linear-gradient(0deg, rgba(126,181,154,0.10) 0 0.35%, transparent 0.35% 1%)",
              animationDelay: `${delayMs + 60}ms`,
            }}
          />
          {/* the tell: a glitchy terminal cursor blinks awake on the board */}
          <span className="fx-sig-cursor absolute left-[31%] top-[30.5%] block h-[4.5%] w-[2%]" style={{ animationDelay: `${delayMs}ms` }}>
            <svg viewBox="0 0 8 18" className="h-full w-full" aria-hidden="true">
              <rect x="1" y="1" width="6" height="16" fill="#8ff0a4" stroke="#1d3a2a" strokeWidth="0.8" />
            </svg>
          </span>
          {/* the INFECTION: jagged green packet-trails crawl square to square
              (one square ~7% of this canvas), each hop popping in a beat after
              the last under the scanline flicker */}
          {[
            { l: 32, t: 31, d: 0 },
            { l: 39, t: 30.4, d: 90 },
            { l: 46, t: 31.6, d: 180 },
            { l: 46.6, t: 38.5, d: 270 },
            { l: 53.4, t: 38, d: 360 },
            { l: 53, t: 45, d: 450 },
            { l: 60, t: 45.6, d: 540 },
          ].map((p, i) => (
            <span
              key={`pk${i}`}
              className="fx-sig-packet absolute block rounded-[1px]"
              style={{ left: `${p.l}%`, top: `${p.t}%`, width: "3.4%", height: "3.4%", background: "rgba(126,181,154,0.75)", border: "1px solid #8ff0a4", animationDelay: `${delayMs + 180 + p.d}ms` }}
            />
          ))}
          {[
            { l: 40, t: 60, d: 120 },
            { l: 40.6, t: 53, d: 220 },
            { l: 47.4, t: 53.6, d: 320 },
            { l: 47, t: 46.4, d: 420 },
          ].map((p, i) => (
            <span
              key={`pk2${i}`}
              className="fx-sig-packet absolute block rounded-[1px]"
              style={{ left: `${p.l}%`, top: `${p.t}%`, width: "3.4%", height: "3.4%", background: "rgba(126,181,154,0.55)", border: "1px solid #7eb59a", animationDelay: `${delayMs + 180 + p.d}ms` }}
            />
          ))}
          {VIRUS_COLS.map((c, i) => (
            <span key={i} className="fx-sig-codefall absolute top-[-28%] block h-[64%] w-[2.4%]" style={{ left: c.left, animationDelay: `${delayMs + c.d}ms` }}>
              <CodeColumn />
            </span>
          ))}
          {VIRUS_BARS.map((b, i) => (
            <span key={`b${i}`} className="fx-sig-sweepbar absolute left-[-30%] block h-[2.6%] w-[160%] rounded-[1px]" style={{ top: b.top, background: b.c, animationDelay: `${delayMs + b.d}ms` }} />
          ))}
          <span className="fx-sig-flash absolute inset-[42%] block rounded-[1px]" style={{ background: "rgba(224,119,107,0.4)", animationDelay: `${delayMs + 120}ms` }} />
          {/* the readout: the infection reports its haul — an '8s DRAINED'
              terminal chip slams up, holds a beat, and pixel-dissolves */}
          <span className="fx-sig-chip absolute left-[41%] top-[44%] block h-[6.5%] w-[18%]" style={{ animationDelay: `${delayMs + 1000}ms` }}>
            <svg viewBox="0 0 72 24" className="h-full w-full" aria-hidden="true">
              <rect x="1" y="1" width="70" height="22" rx="2" fill="#0c1410" stroke="#7eb59a" strokeWidth="1.4" />
              <rect x="5" y="5" width="3.6" height="14" fill="#8ff0a4" opacity="0.85" />
              <text x="13" y="17" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="11.5" fontWeight="bold" fill="#8ff0a4" letterSpacing="0.8">
                8s DRAINED
              </text>
            </svg>
          </span>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-codefall absolute left-[38%] top-[-10%] block h-[70%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>
        <CodeColumn />
      </span>
      <span className="fx-sig-glitch absolute left-[10%] top-[42%] block h-[10%] w-[80%] rounded-[1px]" style={{ background: "rgba(224,119,107,0.7)", animationDelay: `${delayMs + 40}ms` }} />
      <span className="fx-sig-flash absolute inset-[30%] block rounded-[1px]" style={{ background: "rgba(126,181,154,0.5)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

// GAMBLING: a spinning segmented wheel (Wheel of Fortune), a slot machine
// (Jackpot), and a coin flip (Gamble). Roulette keeps its own wheel.
const WHEEL_WEDGES = [
  { d: "M20 20 L20 2 A18 18 0 0 1 32.73 7.27 Z", c: "#e0776b" },
  { d: "M20 20 L32.73 7.27 A18 18 0 0 1 38 20 Z", c: "#f4c430" },
  { d: "M20 20 L38 20 A18 18 0 0 1 32.73 32.73 Z", c: "#7eb59a" },
  { d: "M20 20 L32.73 32.73 A18 18 0 0 1 20 38 Z", c: "#e6bf6a" },
  { d: "M20 20 L20 38 A18 18 0 0 1 7.27 32.73 Z", c: "#e0776b" },
  { d: "M20 20 L7.27 32.73 A18 18 0 0 1 2 20 Z", c: "#f4c430" },
  { d: "M20 20 L2 20 A18 18 0 0 1 7.27 7.27 Z", c: "#7eb59a" },
  { d: "M20 20 L7.27 7.27 A18 18 0 0 1 20 2 Z", c: "#e6bf6a" },
];
function SegmentedWheel() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      {WHEEL_WEDGES.map((w, i) => (
        <path key={i} d={w.d} fill={w.c} stroke="#3a2a1a" strokeWidth="0.7" strokeLinejoin="round" />
      ))}
      <circle cx="20" cy="20" r="18" fill="none" stroke="#3a2a1a" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="3" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
    </svg>
  );
}
// --- The gambling wheels (owner add-on) ---------------------------------------
// Every gambling-themed card plays a SPINNING WHEEL: the disc spins hard,
// decelerates on the shared fx-sig-wheelspin ease-out, and lands with a
// pointer tick + flash. Tier 5+ cards stage it board-wide like the other big
// leads; below that it plays as a compact centred wheel. Each card's disc is
// its own (carnival wedges / red-black pockets / gold coin faces / zodiac
// ring / dice pips / reroll runes) so no two wheels are identical.

/** A segmented wheel disc: `colors` paints the wedges clockwise from 12
 * o'clock; `detail` renders extra art (glyphs, pips, the roulette ball)
 * between the wedges and the hub. */
function WheelFace({
  colors,
  rim = "#3a2a1a",
  hub = "#e6bf6a",
  hubStroke = "#7a5b23",
  detail,
}: {
  colors: string[];
  rim?: string;
  hub?: string;
  hubStroke?: string;
  detail?: React.ReactNode;
}) {
  const n = colors.length;
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      {colors.map((c, i) => {
        const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
        const x0 = 20 + 18 * Math.cos(a0);
        const y0 = 20 + 18 * Math.sin(a0);
        const x1 = 20 + 18 * Math.cos(a1);
        const y1 = 20 + 18 * Math.sin(a1);
        return (
          <path
            key={i}
            d={`M20 20 L${x0.toFixed(2)} ${y0.toFixed(2)} A18 18 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`}
            fill={c}
            stroke={rim}
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        );
      })}
      <circle cx="20" cy="20" r="18" fill="none" stroke={rim} strokeWidth="1.6" />
      {detail}
      <circle cx="20" cy="20" r="3" fill={hub} stroke={hubStroke} strokeWidth="1" />
    </svg>
  );
}

/** Points evenly spaced on the wheel's mid-radius, for glyph/pip placement. */
function wheelPoints(n: number, r: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i + 0.5) / n) * 2 * Math.PI - Math.PI / 2;
    return { x: 20 + r * Math.cos(a), y: 20 + r * Math.sin(a) };
  });
}

/** The full spin-down play: disc spins on fx-sig-wheelspin, the pointer flicks
 * off the pegs on fx-sig-tick, and the landing (~0.95s in, as the wheel
 * settles) fires a flash + star burst (`landFx` adds per-card extras). Board-
 * wide when `wide`, compact and centred otherwise. */
function WheelSpinPlay({
  wide,
  delayMs,
  disc,
  wash,
  boom,
  landFx,
  scale = 1,
}: {
  wide: boolean;
  delayMs: number;
  disc: React.ReactNode;
  wash: string;
  boom: string;
  landFx?: React.ReactNode;
  /** Uniform shrink for the whole board-wide effect (wheel, wash, shards,
   * boom), scaled about the centre so it stays in place. 1 = full size. */
  scale?: number;
}) {
  const pointer = (
    <span className="fx-sig-tick absolute left-[44%] top-[-6%] block h-[16%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>
      <svg viewBox="0 0 12 18" className="h-full w-full" aria-hidden="true">
        <path d="M1 1 H11 L6 16 Z" fill="#f4f7f2" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </span>
  );
  // The whole wheel fades away after it lands: the spin keyframes only
  // rotate, so without this wrapper the disc sat on the board at full
  // opacity until the next card played ("the reroll wheel gets stuck").
  const wheel = (extraClass: string) => (
    <span
      className={"fx-sig-wheelfade absolute block " + extraClass}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="fx-sig-wheelspin absolute inset-0 block" style={{ animationDelay: `${delayMs}ms` }}>{disc}</span>
      {pointer}
      <span
        className="fx-sig-flash absolute inset-[30%] block rounded-full"
        style={{ background: "rgba(255,244,200,0.75)", animationDelay: `${delayMs + 950}ms` }}
      />
    </span>
  );
  if (wide) {
    const body = (
      <>
        <BoardWash color={wash} delayMs={delayMs} />
        {wheel("inset-[27%]")}
        {landFx}
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 950} sizePct={6} />
        <BoardBoom delayMs={delayMs + 1000} color={boom} />
      </>
    );
    return (
      <BoardWideStage>
        {scale === 1 ? (
          body
        ) : (
          <span className="absolute inset-0 block" style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
            {body}
          </span>
        )}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {wheel("inset-[14%]")}
      {landFx}
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 950} sizePct={9} />
    </span>
  );
}

/** Wheel of Fortune (T6): the carnival wheel itself — bright fairground
 * wedges, gold pegs, spun board-wide and left to clatter to a stop. */
function FortuneWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const disc = (
    <WheelFace
      colors={["#e0776b", "#e6bf6a", "#7eb59a", "#f4f7f2", "#e0776b", "#e6bf6a", "#7eb59a", "#f4f7f2", "#e0776b", "#e6bf6a", "#7eb59a", "#f4f7f2"]}
      detail={
        <g fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.4">
          {wheelPoints(12, 17).map((p, i) => (
            <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="0.8" />
          ))}
        </g>
      }
    />
  );
  if (lead) {
    return <WheelSpinPlay wide delayMs={delayMs} disc={disc} wash="rgba(230,191,106,0.2)" boom="rgba(230,191,106,0.85)" />;
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wheelspin absolute inset-[22%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <SegmentedWheel />
      </span>
    </span>
  );
}

/** Jackpot (T7): the golden payout wheel — coin-faced wedges, and when it
 * lands the pot pays out: a rain of gold coins across the whole board. */
function GoldWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const coin = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <circle cx="6" cy="6" r="5" fill="#f4c430" stroke="#8a6414" strokeWidth="0.9" />
      <circle cx="6" cy="6" r="2.6" fill="none" stroke="#8a6414" strokeWidth="0.7" />
    </svg>
  );
  const disc = (
    <WheelFace
      colors={["#f4c430", "#c9a84c", "#fff2c9", "#e6bf6a", "#f4c430", "#c9a84c", "#fff2c9", "#e6bf6a", "#f4c430", "#c9a84c", "#fff2c9", "#e6bf6a"]}
      rim="#7a5b23"
      hub="#fff2c9"
      detail={
        <g>
          {wheelPoints(12, 12.5).map((p, i) => (
            <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={i % 3 === 0 ? 1.6 : 1.1} fill="#8a6414" opacity="0.8" />
          ))}
        </g>
      }
    />
  );
  if (lead) {
    // Marquee upgrade — FORTUNA'S FLOOR SHOW, now with the house lever: the
    // gilded pit lever is CRANKED and the arm recoils (the tell), only then
    // does the colossal payout wheel spin down, the pointer tick-tick-slowing
    // off the pegs; the winning coin-wedge flares under the pointer as it
    // lands, and the jackpot pays out — a coin fountain bursting off the hub
    // and raining TOWARD the bottom edge under gold god-rays and twin gilded
    // shockwaves.
    const spinAt = delayMs + 420; // the wheel only turns once the lever is thrown
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.22)" delayMs={delayMs} />
        {/* the tell: the house lever, cranked hard, arm recoiling */}
        <span className="fx-sig-wheelfade absolute left-[65%] top-[46.5%] block h-[5%] w-[8%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 16 10" className="h-full w-full" aria-hidden="true">
            <rect x="1" y="2" width="14" height="7" rx="1.4" fill="#7a5b23" stroke="#3a2a1a" strokeWidth="1" />
            <circle cx="8" cy="5.5" r="1.6" fill="#e6bf6a" stroke="#3a2a1a" strokeWidth="0.7" />
          </svg>
        </span>
        <span
          className="fx-sig-leverpull absolute left-[66.5%] top-[35%] block h-[13%] w-[5%]"
          style={{ transformOrigin: "50% 90%", animationDelay: `${delayMs}ms` }}
        >
          <svg viewBox="0 0 10 26" className="h-full w-full" aria-hidden="true">
            <path d="M5 24 V5" stroke="#7a5b23" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M5 24 V6" stroke="#e6bf6a" strokeWidth="1" strokeLinecap="round" />
            <circle cx="5" cy="4" r="3.4" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
          </svg>
        </span>
        {/* the wheel: spin-down, pointer ticking itself slow off the pegs */}
        <span className="fx-sig-wheelfade absolute inset-[27%] block" style={{ animationDelay: `${spinAt}ms` }}>
          <span className="fx-sig-wheelspin absolute inset-0 block" style={{ animationDelay: `${spinAt}ms` }}>
            {disc}
            {/* the winning wedge (the one the pointer lands in after the
                1044deg spin-down) flares gold — mounted inside the spinning
                wrapper so it lands exactly under the pointer */}
            <span className="absolute inset-0 block">
              <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
                <path
                  className="fx-sig-wedgeglow"
                  style={{ animationDelay: `${spinAt + 1020}ms` }}
                  d="M20 20 L29 4.41 A18 18 0 0 1 35.59 11 Z"
                  fill="rgba(255,244,200,0.95)"
                  stroke="#fff2c9"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
          <span className="fx-sig-tick absolute left-[44%] top-[-6%] block h-[16%] w-[12%]" style={{ animationDelay: `${spinAt}ms` }}>
            <svg viewBox="0 0 12 18" className="h-full w-full" aria-hidden="true">
              <path d="M1 1 H11 L6 16 Z" fill="#f4f7f2" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </span>
          <span
            className="fx-sig-flash absolute inset-[30%] block rounded-full"
            style={{ background: "rgba(255,244,200,0.75)", animationDelay: `${spinAt + 1000}ms` }}
          />
        </span>
        {/* gold god-rays break as the wheel settles */}
        {GOD_FAN.map((s, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-[6%] block h-[62%]"
            style={{ width: s.w, marginLeft: `calc(${s.w} / -2)`, transform: `rotate(${s.r})`, transformOrigin: "50% 0%" }}
          >
            <span
              className="fx-sig-shaft absolute inset-0 block"
              style={{ background: "linear-gradient(180deg, rgba(255,236,178,0.8), transparent 78%)", animationDelay: `${spinAt + 900 + s.d}ms` }}
            />
          </span>
        ))}
        {/* the PAYOUT: a coin fountain off the hub, raining to the bottom edge */}
        {[
          { dx: "-520%", rot: "-300deg", d: 0 },
          { dx: "-300%", rot: "260deg", d: 45 },
          { dx: "-100%", rot: "-220deg", d: 20 },
          { dx: "110%", rot: "240deg", d: 60 },
          { dx: "320%", rot: "-260deg", d: 30 },
          { dx: "540%", rot: "300deg", d: 75 },
        ].map((c, i) => (
          <span
            key={`pay${i}`}
            className="fx-sig-coinpay absolute left-[48%] top-[46%] block h-[4%] w-[4%]"
            style={{ "--dx": c.dx, "--rot": c.rot, animationDelay: `${spinAt + 1000 + c.d}ms` } as React.CSSProperties}
          >
            {coin}
          </span>
        ))}
        <BoardRain delayMs={spinAt + 1060} render={() => coin} />
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={spinAt + 1000} sizePct={6} />
        <BoardBoom delayMs={spinAt + 1150} color="rgba(244,196,48,0.9)" />
        <BoardBoom delayMs={spinAt + 1320} color="rgba(255,236,178,0.8)" thickness={4} />
      </BoardWideStage>
    );
  }
  return <WheelSpinPlay wide={false} delayMs={delayMs} disc={disc} wash="" boom="" />;
}

/** Gamble (T4): the chancer's wheel — six red/gold double-or-nothing wedges
 * around the lucky-coin hub. Compact: a T4 flutter, not a floor show. */
function GambleWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const disc = (
    <WheelFace
      colors={["#c65a4a", "#e6bf6a", "#c65a4a", "#e6bf6a", "#c65a4a", "#e6bf6a"]}
      rim="#7a2f28"
      detail={
        <g fill="#fff2c9" opacity="0.9">
          {wheelPoints(6, 12).map((p, i) =>
            i % 2 === 0 ? (
              <path key={i} d={`M${(p.x - 1.8).toFixed(2)} ${(p.y + 1.6).toFixed(2)} L${p.x.toFixed(2)} ${(p.y - 2).toFixed(2)} L${(p.x + 1.8).toFixed(2)} ${(p.y + 1.6).toFixed(2)} Z`} />
            ) : (
              <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="1.4" />
            ),
          )}
        </g>
      }
    />
  );
  return <WheelSpinPlay wide={false} delayMs={delayMs + (lead ? 0 : 120)} disc={disc} wash="" boom="" />;
}

/** Zodiac Wheel (T4): the star-chart wheel — midnight-indigo houses under a
 * gold ecliptic ring, star glyphs wheeling past the pointer. */
function ZodiacWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const disc = (
    <WheelFace
      colors={["#2c3e6b", "#3a2a63", "#2c3e6b", "#3a2a63", "#2c3e6b", "#3a2a63", "#2c3e6b", "#3a2a63", "#2c3e6b", "#3a2a63", "#2c3e6b", "#3a2a63"]}
      rim="#c9a84c"
      hub="#cdd6ff"
      hubStroke="#5a6b8f"
      detail={
        <g stroke="#cdd6ff" strokeWidth="0.7" strokeLinecap="round" fill="none">
          {wheelPoints(12, 12.5).map((p, i) =>
            i % 2 === 0 ? (
              <path key={i} d={`M${p.x.toFixed(2)} ${(p.y - 1.8).toFixed(2)} V${(p.y + 1.8).toFixed(2)} M${(p.x - 1.8).toFixed(2)} ${p.y.toFixed(2)} H${(p.x + 1.8).toFixed(2)}`} />
            ) : (
              <path key={i} d={`M${(p.x - 1.4).toFixed(2)} ${(p.y - 1.4).toFixed(2)} L${(p.x + 1.4).toFixed(2)} ${(p.y + 1.4).toFixed(2)} M${(p.x + 1.4).toFixed(2)} ${(p.y - 1.4).toFixed(2)} L${(p.x - 1.4).toFixed(2)} ${(p.y + 1.4).toFixed(2)}`} />
            ),
          )}
          <circle cx="20" cy="20" r="9" strokeDasharray="1.6 2.2" opacity="0.7" />
        </g>
      }
    />
  );
  return <WheelSpinPlay wide={false} delayMs={delayMs + (lead ? 0 : 120)} disc={disc} wash="" boom="" />;
}

/** High Roll (T4): the gambler-mage's dice wheel — violet and ivory wedges
 * carrying die pips 1-6, twice around. */
function DiceWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const pipSets: [number, number][][] = [
    [[0, 0]],
    [[-1.4, -1.4], [1.4, 1.4]],
    [[-1.6, -1.6], [0, 0], [1.6, 1.6]],
    [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]],
    [[-1.6, -1.6], [1.6, -1.6], [0, 0], [-1.6, 1.6], [1.6, 1.6]],
    [[-1.4, -1.8], [1.4, -1.8], [-1.4, 0], [1.4, 0], [-1.4, 1.8], [1.4, 1.8]],
  ];
  const disc = (
    <WheelFace
      colors={["#5a3fa0", "#f4f7f2", "#5a3fa0", "#f4f7f2", "#5a3fa0", "#f4f7f2", "#5a3fa0", "#f4f7f2", "#5a3fa0", "#f4f7f2", "#5a3fa0", "#f4f7f2"]}
      rim="#3a2a63"
      hub="#a877d8"
      hubStroke="#3a2a63"
      detail={
        <g>
          {wheelPoints(12, 12.5).map((p, i) => (
            <g key={i} fill={i % 2 === 0 ? "#f4f7f2" : "#3a2a63"}>
              {pipSets[i % 6].map(([dx, dy], k) => (
                <circle key={k} cx={(p.x + dx).toFixed(2)} cy={(p.y + dy).toFixed(2)} r="0.75" />
              ))}
            </g>
          ))}
        </g>
      }
    />
  );
  return <WheelSpinPlay wide={false} delayMs={delayMs + (lead ? 0 : 120)} disc={disc} wash="" boom="" />;
}

/** Arcane Reroll (T3): the reroll wheel — teal and violet wedges etched with
 * rune ticks, respun until the fates cough up something better. */
function RuneWheelBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const disc = (
    <WheelFace
      colors={["#1f5a5a", "#3a2a63", "#1f5a5a", "#3a2a63", "#1f5a5a", "#3a2a63", "#1f5a5a", "#3a2a63"]}
      rim="#12303a"
      hub="#7fd8d8"
      hubStroke="#1f5a5a"
      detail={
        <g stroke="#7fd8d8" strokeWidth="0.7" strokeLinecap="round" fill="none">
          {wheelPoints(8, 12.5).map((p, i) =>
            i % 2 === 0 ? (
              <path key={i} d={`M${p.x.toFixed(2)} ${(p.y - 2).toFixed(2)} V${(p.y + 2).toFixed(2)} M${p.x.toFixed(2)} ${(p.y - 0.6).toFixed(2)} L${(p.x + 1.6).toFixed(2)} ${(p.y - 1.8).toFixed(2)}`} />
            ) : (
              <path key={i} d={`M${(p.x - 1.4).toFixed(2)} ${(p.y + 2).toFixed(2)} L${p.x.toFixed(2)} ${(p.y - 2).toFixed(2)} L${(p.x + 1.4).toFixed(2)} ${(p.y + 2).toFixed(2)}`} />
            ),
          )}
        </g>
      }
    />
  );
  return <WheelSpinPlay wide={false} delayMs={delayMs + (lead ? 0 : 120)} disc={disc} wash="" boom="" />;
}
function SlotSymbol({ variant }: { variant: number }) {
  if (variant % 4 === 0)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <path d="M10 3 C12 6 15 7 15 7 M10 3 C8 6 6 8 6 8" fill="none" stroke="#5f927a" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6" cy="12" r="4" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
        <circle cx="14" cy="13" r="4" fill="#c25248" stroke="#7a2f28" strokeWidth="1" />
      </svg>
    );
  if (variant % 4 === 1)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <path d="M5 4 H15 L9 18 H12" fill="none" stroke="#e0776b" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  if (variant % 4 === 2)
    return (
      <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
        <rect x="3" y="8" width="14" height="5" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
      <path d="M6 14 C6 8 8 5 10 5 C12 5 14 8 14 14 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="10" cy="16" r="1.4" fill="#7a5b23" />
    </svg>
  );
}
function SlotReel({ delayMs, start }: { delayMs: number; start: number }) {
  return (
    <span className="absolute inset-0 block overflow-hidden">
      <span className="fx-sig-reel absolute left-0 top-0 block w-full" style={{ height: "400%", animationDelay: `${delayMs}ms` }}>
        {[0, 1, 2, 3, 4].map((k) => (
          <span key={k} className="block h-[20%] w-full p-[8%]">
            <SlotSymbol variant={start + k} />
          </span>
        ))}
      </span>
    </span>
  );
}
function SlotMachineBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(122,47,40,0.24)" boom="rgba(122,47,40,0.85)" delayMs={delayMs} motifClass="fx-sig-grow">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <rect x="4" y="4" width="32" height="32" rx="2" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.4" />
            <rect x="7" y="8" width="26" height="14" rx="1" fill="#141e2b" />
            <rect x="9" y="26" width="22" height="6" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
          </svg>
      </BoardWideLead>
    );
  }
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-grow absolute inset-[8%] block" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <rect x="4" y="4" width="32" height="32" rx="2" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.4" />
            <rect x="7" y="8" width="26" height="14" rx="1" fill="#141e2b" />
            <rect x="9" y="26" width="22" height="6" rx="1" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" />
          </svg>
        </span>
        <span className="absolute left-[20%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs} start={1} /></span>
        <span className="absolute left-[41%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs + 140} start={0} /></span>
        <span className="absolute left-[62%] top-[22%] block h-[30%] w-[18%]"><SlotReel delayMs={delayMs + 280} start={1} /></span>
        <span className="fx-sig-snooze absolute right-[4%] top-[20%] block h-[26%] w-[10%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 8 26" className="h-full w-full" aria-hidden="true">
            <path d="M4 26 V6" stroke="#8aa0b4" strokeWidth="2" strokeLinecap="round" />
            <circle cx="4" cy="4" r="3" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
          </svg>
        </span>
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 620} sizePct={9} />
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[30%] top-[24%] block h-[42%] w-[40%]">
        <span className="absolute inset-0 block rounded-[1px]" style={{ border: "1.5px solid #7a5b23", background: "#141e2b" }} />
        <span className="absolute inset-[10%] block"><SlotReel delayMs={delayMs} start={1} /></span>
      </span>
    </span>
  );
}
function GambleCoin() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#f4c430" stroke="#8a6414" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#c79a2a" strokeWidth="0.8" />
      <path d="M12 6 C15 9 16 12 12 17 C8 12 9 9 12 6 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M12 15 L12 19 M9.5 19 H14.5" stroke="#7a2f28" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function CoinFlipBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const size = lead ? "58%" : "40%";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-coinflip absolute left-1/2 bottom-[14%] block" style={{ height: size, width: size, marginLeft: lead ? "-29%" : "-20%", animationDelay: `${delayMs}ms` }}>
        <GambleCoin />
      </span>
      {lead && <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 820} sizePct={8} />}
    </span>
  );
}


// BRAINROT: the drum-man (tung_tung_sahur) finally gets his own signature: he
// marches in bobbing (lead), then a drumstick bonks each nearest enemy.
function DrumBonkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // BOARD-WIDE: the drum-man marches the full width of the board, three
    // drumbeat shockwaves pulse out across it, and the chant itself lands as
    // stamped words — TUNG, TUNG, TUNG on each beat, then a big SAHUR.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(224,119,107,0.16)" delayMs={delayMs + 220} />
        <span className="fx-sig-cross absolute left-[36%] top-[34%] block h-[30%] w-[26%]" style={{ animationDelay: `${delayMs}ms` }}>
          <span className="fx-sig-hop block h-full w-full">
            <BrainrotFigure id="tung_tung_sahur" />
          </span>
        </span>
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 180 + i * 240} color="rgba(224,119,107,0.8)" thickness={3} />
        ))}
        {["35%", "45%", "55%"].map((left, i) => (
          <span
            key={`t${i}`}
            className="fx-cast-stamp absolute top-[38%] block h-[4%] w-[8%]"
            style={{ left, animationDelay: `${delayMs + 180 + i * 240}ms`, "--tilt": `${i % 2 ? 4 : -5}deg` } as React.CSSProperties}
          >
            <svg viewBox="0 0 60 22" className="h-full w-full" aria-hidden="true">
              <text x="30" y="16" textAnchor="middle" fontSize="15" fontWeight="800" fill="#f4e9c8" stroke="#5a1512" strokeWidth="0.6" style={{ letterSpacing: "1px" }}>
                TUNG
              </text>
            </svg>
          </span>
        ))}
        <span
          className="fx-cast-stamp absolute left-[41%] top-[50%] block h-[6%] w-[14%]"
          style={{ animationDelay: `${delayMs + 900}ms`, "--tilt": "-3deg" } as React.CSSProperties}
        >
          <svg viewBox="0 0 90 26" className="h-full w-full" aria-hidden="true">
            <text x="45" y="19" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ffd95e" stroke="#5a1512" strokeWidth="0.7" style={{ letterSpacing: "1.5px" }}>
              SAHUR!
            </text>
          </svg>
        </span>
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[40%] top-[2%] block h-[46%] w-[20%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 28" className="h-full w-full" aria-hidden="true">
          <path d="M6 27 L6 8" stroke="#6b4a34" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="6" cy="6" r="4.5" fill="#8a6a4a" stroke="#4a3320" strokeWidth="1" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[16%] block rounded-full" style={{ border: "2px solid rgba(224,119,107,0.85)", animationDelay: `${delayMs + 300}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}

// SLAPSTICK FUNNY BATCH: a rake, a fly swatter, a nap, super glue, a bear trap,
// an anvil, a boxing glove, bubble wrap, vertigo, origami, gremlins, homesick,
// jet lag, king-of-the-hill, and a sugar rush.
function RakeBonkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 11 upgrade: the lead square swings a COLOSSAL rake up over the whole
  // board crop (the classic step-on-it gag at billboard scale), with a gold
  // shockwave rolling past the edges when the handle smacks home.
  if (lead) {
    return (
      <BoardWideStage>
        <span className="fx-sig-arc absolute left-[40%] bottom-[18%] block h-[52%] w-[20%]" style={{ animationDelay: `${delayMs}ms`, animationDuration: "0.9s" }}>
          <svg viewBox="0 0 20 40" className="h-full w-full" aria-hidden="true">
            <path d="M10 40 L10 12" stroke="#8a6a4a" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M3 12 H17" stroke="#6b4a34" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M4 12 L4 6 M8 12 L8 6 M12 12 L12 6 M16 12 L16 6" stroke="#6b4a34" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 420} color="rgba(230,191,106,0.85)" thickness={4} />
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 460} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-arc absolute left-[30%] bottom-[6%] block h-[80%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 40" className="h-full w-full" aria-hidden="true">
          <path d="M10 40 L10 12" stroke="#8a6a4a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M3 12 H17" stroke="#6b4a34" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M4 12 L4 6 M8 12 L8 6 M12 12 L12 6 M16 12 L16 6" stroke="#6b4a34" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(230,191,106,0.8)", animationDelay: `${delayMs + 260}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={9} />
    </span>
  );
}
function FlySwatBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-star absolute left-1/2 top-1/2 ml-[-8%] mt-[-8%] block h-[16%] w-[16%]" style={{ "--dx": "40%", "--dy": "-30%", "--rot": "40deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}>
        <svg viewBox="0 0 20 16" className="h-full w-full" aria-hidden="true">
          <ellipse cx="10" cy="9" rx="3.4" ry="4.4" fill="#2b2b2f" stroke="#141416" strokeWidth="0.8" />
          <path d="M8 6 C2 2 1 7 6 8 Z M12 6 C18 2 19 7 14 8 Z" fill="rgba(126,181,154,0.55)" stroke="#5f927a" strokeWidth="0.7" />
        </svg>
      </span>
      <span className="fx-sig-snooze absolute left-[26%] top-[2%] block h-[70%] w-[48%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 56" className="h-full w-full" aria-hidden="true">
          <path d="M20 56 L20 26" stroke="#4a5560" strokeWidth="2.4" strokeLinecap="round" />
          <rect x="6" y="4" width="28" height="24" rx="4" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.4" />
          <path d="M12 8 V24 M20 6 V26 M28 8 V24 M8 12 H32 M8 18 H32" stroke="#7a2f28" strokeWidth="0.9" />
        </svg>
      </span>
      <span className="fx-sig-splat absolute inset-x-[30%] top-[52%] block h-[16%] rounded-full" style={{ background: "rgba(74,85,96,0.5)", animationDelay: `${delayMs + 360}ms` }} />
    </span>
  );
}
function SleepCapBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[20%] top-[16%] block h-[52%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 C6 12 20 6 34 10 C30 16 30 22 32 28 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M4 28 H34" stroke="#cfe8d8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="33" cy="9" r="3" fill="#f4f7f2" stroke="#8aa0b4" strokeWidth="1" />
        </svg>
      </span>
      {[{ l: "56%", t: "10%", d: 0 }, { l: "66%", t: "2%", d: 220 }].map((z, i) => (
        <span key={i} className="fx-sig-zzz absolute block h-[22%] w-[22%]" style={{ left: z.l, top: z.t, animationDelay: `${delayMs + z.d}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </span>
  );
}
function SuperGlueBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[52%] top-[-2%] block h-[36%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 12 24" className="h-full w-full" aria-hidden="true">
          <rect x="3" y="4" width="6" height="16" rx="2" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
          <path d="M5 4 L5 1 H7 L7 4 Z" fill="#4a5560" />
        </svg>
      </span>
      <span className="fx-sig-grow absolute left-[24%] top-[28%] block h-[52%] w-[52%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 18 C8 10 16 8 20 10 C24 6 34 10 32 18 C36 22 34 32 26 32 C22 38 12 36 12 30 C6 28 4 20 8 18 Z" fill="rgba(126,181,154,0.6)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M14 20 C16 22 16 26 14 28 M26 20 C24 24 26 28 28 30" stroke="rgba(244,250,242,0.7)" strokeWidth="1" strokeLinecap="round" fill="none" />
        </svg>
      </span>
      {[{ l: "30%", d: 220 }, { l: "60%", d: 320 }].map((s, i) => (
        <span key={i} className="fx-sig-crownfall absolute top-[60%] block h-[24%] w-[8%]" style={{ left: s.l, animationDelay: `${delayMs + s.d}ms` }}>
          <svg viewBox="0 0 8 24" className="h-full w-full" aria-hidden="true">
            <path d="M4 0 C1 10 1 16 4 20 C7 16 7 10 4 0 Z" fill="rgba(126,181,154,0.6)" stroke="#5f927a" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[32%] block rounded-full" style={{ background: "rgba(126,181,154,0.4)", animationDelay: `${delayMs + 180}ms` }} />}
    </span>
  );
}
function BearTrapBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[16%] top-[24%] block h-[52%] w-[68%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 30" className="h-full w-full" aria-hidden="true">
          <ellipse cx="24" cy="24" rx="18" ry="5" fill="#5b6672" stroke="#2f3640" strokeWidth="1.2" />
          <path d="M8 24 C10 8 20 6 24 6 C28 6 38 8 40 24" fill="none" stroke="#8aa0b4" strokeWidth="2.2" />
          <path d="M8 24 L11 18 L14 24 L17 18 L20 24 L24 18 L28 24 L31 18 L34 24 L37 18 L40 24 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-star absolute left-[6%] top-[62%] block h-[10%] w-[10%]" style={{ "--dx": "-120%", "--dy": "40%", "--rot": "20deg", animationDelay: `${delayMs}ms` } as React.CSSProperties}>
        <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" stroke="#5b6672" strokeWidth="1.6" /></svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#c9d2dc" stroke="#4a5560" delayMs={delayMs + 180} sizePct={8} />
    </span>
  );
}
function AcmeAnvil() {
  return (
    <svg viewBox="0 0 32 26" className="h-full w-full" aria-hidden="true">
      <path d="M2 8 H30 L26 14 H14 L12 18 H24 L22 24 H8 L10 14 H4 Z" fill="#3a4450" stroke="#141e2b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 8 H12 L10 12 H4 Z" fill="#4a5560" />
      <path d="M9 4 H23" stroke="#c25248" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
function AnvilDropBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-bombdrop absolute left-[24%] top-[-4%] block h-[54%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
          <AcmeAnvil />
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[24%] top-[6%] block h-[48%] w-[52%]" style={{ animationDelay: `${delayMs}ms` }}>
        <AcmeAnvil />
      </span>
      <span className="fx-sig-splat absolute inset-x-[20%] top-[58%] block h-[16%] rounded-full" style={{ background: "rgba(20,30,43,0.5)", animationDelay: `${delayMs + 300}ms` }} />
      <span className="fx-sig-shock absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(140,160,180,0.7)", animationDelay: `${delayMs + 300}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}
function BoxingGloveBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 11 upgrade: the lead square throws a HAYMAKER — a giant spring-arm
  // glove punches across the whole board crop, landing with a coral shockwave
  // and a burst of stars.
  if (lead) {
    return (
      <BoardWideStage>
        <span className="fx-sig-punch absolute left-[22%] top-[42%] block h-[16%] w-[42%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 48 24" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M2 12 L8 6 L12 18 L18 6 L22 18 L28 8" fill="none" stroke="#8aa0b4" strokeWidth="2" strokeLinejoin="round" />
            <path d="M28 4 C40 2 46 8 46 12 C46 16 40 22 28 20 C24 19 24 16 26 15 C22 15 22 9 26 9 C24 8 24 5 28 4 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M30 12 H42" stroke="#7a2f28" strokeWidth="0.9" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 340} color="rgba(224,119,107,0.85)" thickness={4} />
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 380} sizePct={6} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-punch absolute left-[2%] top-[30%] block h-[40%] w-[76%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 24" className="h-full w-full" aria-hidden="true">
          <path d="M2 12 L8 6 L12 18 L18 6 L22 18 L28 8" fill="none" stroke="#8aa0b4" strokeWidth="2" strokeLinejoin="round" />
          <path d="M28 4 C40 2 46 8 46 12 C46 16 40 22 28 20 C24 19 24 16 26 15 C22 15 22 9 26 9 C24 8 24 5 28 4 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M30 12 H42" stroke="#7a2f28" strokeWidth="0.9" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={9} />
    </span>
  );
}
const WRAP_BUBBLES = [
  { l: "22%", t: "26%", d: 120 }, { l: "44%", t: "20%", d: 260 },
  { l: "62%", t: "30%", d: 60 }, { l: "30%", t: "52%", d: 320 },
  { l: "56%", t: "56%", d: 200 },
];
function BubbleWrapBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ward absolute inset-[14%] block rounded-[2px]" style={{ border: "1.5px solid rgba(126,181,154,0.7)", background: "rgba(126,181,154,0.14)", animationDelay: `${delayMs}ms` }} />
      {WRAP_BUBBLES.map((b, i) => (
        <span key={i} className="fx-sig-flash absolute block h-[14%] w-[14%] rounded-full" style={{ left: b.l, top: b.t, border: "1px solid rgba(126,181,154,0.8)", background: "rgba(207,232,216,0.5)", animationDelay: `${delayMs + b.d}ms` }} />
      ))}
      {lead && <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(126,181,154,0.7)", animationDelay: `${delayMs}ms` }} />}
    </span>
  );
}
function VertigoBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 20 C20 14 26 14 26 20 C26 28 16 28 16 20 C16 10 28 10 28 20 C28 32 12 32 12 20 C12 8 30 8 30 20" fill="none" stroke="#e0776b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      {PIN_STARS.slice(0, 4).map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-[20%] ml-[-6%] block h-[12%] w-[12%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
            <path d="M6 1 L7.4 4.6 L11 6 L7.4 7.4 L6 11 L4.6 7.4 L1 6 L4.6 4.6 Z" fill="#e6bf6a" stroke="#8a6414" strokeWidth="0.6" strokeLinejoin="round" />
          </svg>
        </span>
      ))}
      {lead && <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(224,119,107,0.4)", animationDelay: `${delayMs + 80}ms` }} />}
    </span>
  );
}
function OrigamiBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[18%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M8 26 L24 20 L20 30 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          <path d="M24 20 L34 8 L30 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          <path d="M6 12 L24 20 L10 22 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wing-l absolute left-[14%] top-[24%] block h-[30%] w-[34%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 24" className="h-full w-full" aria-hidden="true"><path d="M34 20 L2 4 L14 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" /></svg>
      </span>
      <span className="fx-sig-wing-r absolute right-[14%] top-[24%] block h-[30%] w-[34%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 24" className="h-full w-full" aria-hidden="true"><path d="M0 20 L32 4 L20 22 Z" fill="#f2a79c" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" /></svg>
      </span>
    </span>
  );
}
function Gremlin() {
  return (
    <svg viewBox="0 0 18 18" className="h-full w-full" aria-hidden="true">
      <path d="M9 16 C4 16 3 10 5 7 C4 3 7 4 8 6 C8 3 10 3 10 6 C11 4 14 3 13 7 C15 10 14 16 9 16 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="7" cy="9" r="1.2" fill="#141e2b" />
      <circle cx="11" cy="9" r="1.2" fill="#141e2b" />
      <path d="M6.5 12 H11.5" stroke="#2c473a" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
const GREMLIN_POS = [
  { dx: "-230%", dy: "-120%", rot: "-30deg", delay: 0 },
  { dx: "220%", dy: "-150%", rot: "30deg", delay: 90 },
  { dx: "-190%", dy: "150%", rot: "-20deg", delay: 160 },
  { dx: "240%", dy: "120%", rot: "24deg", delay: 60 },
];
function GremlinsBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {GREMLIN_POS.map((v, i) => (
        <span key={i} className="fx-sig-star absolute left-1/2 top-1/2 ml-[-11%] mt-[-11%] block h-[22%] w-[22%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.delay}ms` } as React.CSSProperties}>
          <span className="fx-sig-hop block h-full w-full"><Gremlin /></span>
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[34%] block rounded-full" style={{ background: "rgba(126,181,154,0.4)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}
function HomesickBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 12 — tier 5+ board-wide guarantee: the lead calls everyone home —
  // a warm hearth wash over the WHOLE crop while a colossal cottage grows
  // mid-board and hearts drift down the central band.
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.2)" delayMs={delayMs} />
        <span className="fx-sig-grow absolute left-[38%] top-[36%] block h-[26%] w-[24%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <path d="M6 20 L20 8 L34 20 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
            <rect x="10" y="20" width="20" height="14" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1.2" />
            <rect x="17" y="26" width="6" height="8" fill="#7a2f28" />
          </svg>
        </span>
        <BoardRain
          delayMs={delayMs + 140}
          render={() => (
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M10 18 C2 12 3 4 8 5 C9.5 5.4 10 7 10 7 C10 7 10.5 5.4 12 5 C17 4 18 12 10 18 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[26%] top-[24%] block h-[50%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M6 20 L20 8 L34 20 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
          <rect x="10" y="20" width="20" height="14" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1.2" />
          <rect x="17" y="26" width="6" height="8" fill="#7a2f28" />
        </svg>
      </span>
      <span className="fx-sig-crownfall absolute left-[46%] top-[6%] block h-[22%] w-[20%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M10 18 C2 12 3 4 8 5 C9.5 5.4 10 7 10 7 C10 7 10.5 5.4 12 5 C17 4 18 12 10 18 Z" fill="#c25248" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
function JetLagBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="fx-sig-streak absolute left-[-6%] top-[2%] block h-[46%] w-[56%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 24" className="h-full w-full" aria-hidden="true">
            <path d="M2 14 L26 10 L38 6 L30 14 L38 15 L24 16 L14 22 L16 15 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="fx-sig-grow absolute left-[30%] bottom-[10%] block h-[44%] w-[40%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden="true">
            <rect x="6" y="10" width="18" height="16" rx="2" fill="#7a2f28" stroke="#3a1512" strokeWidth="1.2" />
            <path d="M12 10 V6 H18 V10" fill="none" stroke="#3a1512" strokeWidth="1.4" />
            <path d="M15 12 V24 M9 18 H21" stroke="#e6bf6a" strokeWidth="1" />
          </svg>
        </span>
      </span>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="absolute left-[28%] top-[22%] block h-[42%] w-[42%]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="#f4f7f2" stroke="#8a6414" strokeWidth="2" />
          <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs}ms` }}>
            <path d="M20 20 L20 9" stroke="#7a2f28" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 20 L27 20" stroke="#c25248" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[54%] top-[12%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
function HillFlagBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(244,196,64,0.24)" boom="rgba(126,181,154,0.85)" delayMs={delayMs} motifClass="fx-sig-rise">
        <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 20 C10 6 30 6 40 20 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute inset-x-[10%] bottom-[6%] block h-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 20 C10 6 30 6 40 20 Z" fill="#7eb59a" stroke="#2c473a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-brick absolute left-[46%] bottom-[24%] block h-[54%] w-[8%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 6 40" className="h-full w-full" aria-hidden="true"><path d="M3 40 V2" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
      <span className="fx-sig-wave absolute left-[50%] top-[14%] block h-[20%] w-[26%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 26 16" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 1 H24 L20 8 L24 15 H0 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
function SugarRushBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-afterimage absolute left-[26%] top-[14%] block h-[54%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>
        <span className="fx-sig-hop block h-full w-full">
          <svg viewBox="0 0 30 40" className="h-full w-full" aria-hidden="true">
            <path d="M15 40 V16" stroke="#f4f7f2" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="15" cy="12" r="10" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" />
            <path d="M15 12 C15 8 19 8 19 12 C19 17 11 17 11 12 C11 6 23 6 23 12" fill="none" stroke="#f4f7f2" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </span>
      {lead && (
        <span className="fx-sig-zzz absolute left-[56%] top-[8%] block h-[24%] w-[24%]" style={{ animationDelay: `${delayMs + 520}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M4 4 H12 L4 14 H12" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <ShardBurst vectors={PIN_STARS} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 60} sizePct={8} />
    </span>
  );
}

// --- 10k. Batch 11 visuals: fantasy & meta spectacles ------------------------
// The coverage pass. Every FANTASY card that still had no bespoke signature
// gets a BOARD-WIDE statement (the oversized-lead pattern of the dragon /
// wizard / brainrot takeovers: the lead square paints an oversized canvas
// clipped by the board crop via BoardWideStage), and the FUNNY + PT ("meta")
// sets get bespoke gags. Same law as every signature: flat SVG fills / solid
// discs (no gradients / glow / box-shadow / blur), coral / mint / sun / gold,
// transform + opacity only, one-shot, hidden entirely under reduced motion.
// NO new keyframes: every motion here composes fx-sig-* classes already in
// effects.css (wash / cross / rain / boom / muzzle / frost / wave / grow /
// rise / swirl / crown / cage / hole / quake / splat / dart / sweepbar /
// rewind / glitch / chomp / wiggle / hop / punch / moat / implode / dome ...).

/** A jagged crack ray radiating out from the stage centre: a static-rotated
 * wrapper (the animation owns the child's transform) around a muzzle-extend. */
function CrackRay({ deg, lengthPct, delayMs, color }: { deg: number; lengthPct: number; delayMs: number; color: string }) {
  return (
    <span
      className="absolute left-1/2 top-1/2 block h-[2%]"
      style={{ width: `${lengthPct}%`, transform: `rotate(${deg}deg)`, transformOrigin: "0% 50%" }}
    >
      <span className="fx-sig-muzzle absolute inset-0 block" style={{ animationDelay: `${delayMs}ms`, animationDuration: "0.6s" }}>
        <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 2 L16 0.8 L32 3 L50 1 L68 3.2 L84 1 L100 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

const SINKHOLE_RAYS = [8, 55, 104, 152, 199, 251, 305];

/** Sinkhole: the earth gives way. Lead: jagged cracks radiate BOARD-WIDE from
 * the caster square, the ground shudders under a dust wash, and a debris ring
 * blooms past the board edges; each rigged square then yawns open into a dark
 * pit with a crumbling rim. */
function SinkholeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(74,53,33,0.2)" delayMs={delayMs} />
        {SINKHOLE_RAYS.map((deg, i) => (
          <CrackRay key={i} deg={deg} lengthPct={26 + (i % 3) * 7} delayMs={delayMs + i * 55} color="#4a3521" />
        ))}
        <span className="fx-sig-quake absolute left-[38%] top-[40%] block h-[20%] w-[24%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
          <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
            <ellipse cx="20" cy="15" rx="17" ry="10" fill="rgba(20,14,8,0.9)" stroke="#4a3521" strokeWidth="1.6" />
            <path d="M6 10 L1 6 M34 10 L39 5 M8 22 L3 26 M32 22 L38 25" stroke="#4a3521" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 380} color="rgba(150,110,66,0.7)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-hole absolute inset-[18%] block rounded-full" style={{ background: "rgba(20,14,8,0.92)", border: "2px solid rgba(74,53,33,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-crumble absolute left-[14%] top-[10%] block h-[16%] w-[16%]" style={{ animationDelay: `${delayMs + 90}ms` }}>
        <SigShard fill="#966e42" stroke="#4a3521" variant={0} />
      </span>
      <span className="fx-sig-crumble absolute right-[14%] top-[24%] block h-[13%] w-[13%]" style={{ animationDelay: `${delayMs + 170}ms` }}>
        <SigShard fill="#7a5b3a" stroke="#4a3521" variant={1} />
      </span>
      <span className="fx-sig-soot absolute inset-[6%] block rounded-full" style={{ border: "2px solid rgba(150,110,66,0.55)", animationDelay: `${delayMs + 60}ms` }} />
    </span>
  );
}

/** Fissure Field: the ground splits into a lattice. Lead: two full-width
 * jagged fissures rip across the whole board crop (staggered heights) while
 * the earth shudders; each pawn's square takes its own ground-split and a
 * spray of grit. */
function FissureFieldBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(107,74,52,0.16)" delayMs={delayMs} />
        {[
          { t: "38%", d: 0 },
          { t: "56%", d: 220 },
        ].map((f, i) => (
          <span key={i} className="fx-sig-frost absolute left-[20%] block h-[3%] w-[60%]" style={{ top: f.t, animationDelay: `${delayMs + f.d}ms`, animationDuration: "0.9s" }}>
            <svg viewBox="0 0 200 6" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 3 L22 1 L40 5 L62 2 L84 4.6 L108 1.2 L130 4.8 L154 1.6 L176 4.4 L200 3" fill="none" stroke="#4a3521" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M40 5 L46 8 M108 1.2 L104 -2 M154 1.6 L160 -1" stroke="#6b4a34" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        <BoardBoom delayMs={delayMs + 420} color="rgba(150,110,66,0.6)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-quake absolute inset-x-[6%] top-[38%] block h-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 10" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 5 L8 2 L15 8 L23 3 L31 7 L40 4" fill="none" stroke="#4a3521" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#966e42" stroke="#4a3521" delayMs={delayMs + 80} sizePct={9} />
    </span>
  );
}

const ORB_TENDRILS = [24, 96, 168, 232, 316];

/** Orb of Dominion: a violet orb of command rises over the board and casts
 * crackling tendrils of will board-wide; the seized piece's square is gripped
 * by a spinning rune ring as wisps of purple are drawn INTO it. */
function DominionOrbBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — THE WILL MADE FLESH: the crop dims violet and a
    // COLOSSAL crowned hand rises out of the board holding the orb of
    // dominion aloft; its tendrils of will crackle out across the whole crop
    // before the flare and twin dominion shockwaves.
    return (
      <GodEvent
        wash="rgba(90,63,160,0.2)"
        rays="rgba(168,119,216,0.55)"
        boom="rgba(168,119,216,0.85)"
        flare="rgba(201,182,224,0.6)"
        sparkFill="#a877d8"
        sparkStroke="#4a3070"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the orb of dominion, held aloft */}
            <circle cx="20" cy="12" r="10" fill="#5a3fa0" stroke="#3a2a63" strokeWidth="1.6" />
            <circle cx="17" cy="9" r="3" fill="#a877d8" />
            <path d="M13 6 L15 8 M25 5 L23.5 7.5" stroke="#c9b6e0" strokeWidth="0.9" strokeLinecap="round" />
            {/* the colossal gauntleted hand gripping it from below */}
            <path d="M12 44 V30 C12 26 14 23.5 16 22.5 L15 19 L17.5 21.5 L18.5 18 L20 21.5 L21.5 18 L22.5 21.5 L25 19 L24 22.5 C26 23.5 28 26 28 30 V44 Z" fill="rgba(58,42,99,0.95)" stroke="#a877d8" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M16 28 H24 M15 34 H25" stroke="rgba(168,119,216,0.55)" strokeWidth="0.8" fill="none" />
          </svg>
        }
      >
        {ORB_TENDRILS.map((deg, i) => (
          <CrackRay key={i} deg={deg} lengthPct={24 + (i % 2) * 8} delayMs={delayMs + 300 + i * 60} color="#a877d8" />
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[10%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#a877d8" strokeWidth="1.8" strokeDasharray="6 4" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#5a3fa0" strokeWidth="1.1" strokeDasharray="3 3" />
        </svg>
      </span>
      {VORTEX_VEC.slice(0, 4).map((v, i) => (
        <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 120 + v.d}ms` } as React.CSSProperties}>
          <SigShard fill="#a877d8" stroke="#4a3070" variant={i} />
        </span>
      ))}
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "rgba(168,119,216,0.6)", animationDelay: `${delayMs + 260}ms` }} />
    </span>
  );
}

/** Lich Phylactery: the queen's soul is decanted for safe keeping. Lead: a
 * sickly-green wash settles board-wide while a soul-gem vessel rises and
 * drifting soul-wisps are drawn INTO it from across the board; the queen's
 * square gets the gem seal and a wisp ring. */
function PhylacteryBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(94,170,120,0.14)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[44%] top-[34%] block h-[26%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 24 48" className="h-full w-full" aria-hidden="true">
            <path d="M12 2 L22 16 L18 40 L6 40 L2 16 Z" fill="#2e5f4a" stroke="#1c3a2d" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M12 10 L17 17 L15 32 L9 32 L7 17 Z" fill="#7eb59a" />
            <circle cx="12" cy="21" r="3" fill="#c9f2dd" />
          </svg>
        </span>
        {VORTEX_VEC.map((v, i) => (
          <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-2%] mt-[-2%] block h-[4%] w-[4%] rounded-full" style={{ background: "rgba(160,222,190,0.85)", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 240 + v.d * 6}ms`, animationDuration: "0.9s" } as React.CSSProperties} />
        ))}
        <BoardBoom delayMs={delayMs + 520} color="rgba(126,181,154,0.7)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[34%] top-[20%] block h-[52%] w-[32%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 48" className="h-full w-full" aria-hidden="true">
          <path d="M12 2 L22 16 L18 40 L6 40 L2 16 Z" fill="#2e5f4a" stroke="#1c3a2d" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="12" cy="21" r="3" fill="#c9f2dd" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[12%] block rounded-full" style={{ border: "1.5px solid rgba(126,181,154,0.85)", animationDelay: `${delayMs + 160}ms` }} />
      <span className="fx-sig-zzz absolute left-[58%] top-[10%] block h-[18%] w-[14%] rounded-full" style={{ background: "rgba(160,222,190,0.6)", animationDelay: `${delayMs + 300}ms` }} />
    </span>
  );
}

/** Metamorphosis: a violent change of form. Lead: an amber wash floods the
 * board as a giant chrysalis swells and BURSTS in a wide shard scatter with a
 * shockwave; the reshaped piece's square grows a rook silhouette out of the
 * wreckage. */
function MetamorphosisBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.16)" delayMs={delayMs} />
        <span className="fx-sig-grow absolute left-[41%] top-[34%] block h-[26%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 30 42" className="h-full w-full" aria-hidden="true">
            <path d="M15 2 C25 8 27 20 24 32 C22 39 8 39 6 32 C3 20 5 8 15 2 Z" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M15 4 V38 M8 14 C13 17 17 17 22 14 M8 26 C13 23 17 23 22 26" stroke="#5d3a1e" strokeWidth="1" fill="none" />
          </svg>
        </span>
        <ShardBurst vectors={BURST_BIG} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 460} sizePct={6} />
        <BoardBoom delayMs={delayMs + 460} color="rgba(230,191,106,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[20%] block rounded-full" style={{ background: "rgba(230,191,106,0.7)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute left-[30%] bottom-[10%] block h-[64%] w-[40%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M4 32 L6 14 H18 L20 32 Z M4 8 H8 V4 H10 V8 H14 V4 H16 V8 H20 V14 H4 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8a6a4a" stroke="#5d3a1e" delayMs={delayMs} sizePct={10} />
    </span>
  );
}

/** Apotheosis: a piece is raised to godhood. Lead: golden light shafts descend
 * across the whole board, a colossal crown lowers onto the centre with a
 * spring-settle, and a halo shockwave rolls past the edges; the ascending
 * square gets its own shaft, halo ring, and falling crown. */
function ApotheosisBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.14)" delayMs={delayMs} />
        {[
          { l: "30%", d: 0 },
          { l: "47%", d: 130 },
          { l: "64%", d: 260 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-shaft absolute top-[26%] block h-[48%] w-[5%]" style={{ left: s.l, background: "rgba(255,240,180,0.5)", animationDelay: `${delayMs + s.d}ms`, animationDuration: "1s" }} />
        ))}
        <span className="fx-sig-crown absolute left-[42%] top-[38%] block h-[16%] w-[16%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
            <path d="M4 22 L4 8 L13 15 L20 4 L27 15 L36 8 L36 22 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="20" cy="19" r="2" fill="#e05252" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 560} color="rgba(244,196,48,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute inset-x-[30%] top-0 block h-[70%]" style={{ background: "rgba(255,240,180,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "2px solid rgba(244,196,48,0.9)", animationDelay: `${delayMs + 140}ms` }} />
      <span className="fx-sig-crownfall absolute left-[32%] top-[6%] block h-[28%] w-[36%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
          <path d="M4 22 L4 8 L13 15 L20 4 L27 15 L36 8 L36 22 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 220} sizePct={9} />
    </span>
  );
}

/** Philosopher's Stone: base metal to gold. Lead: a giant alchemical circle —
 * dashed rings and an inscribed triangle — draws itself over the whole board
 * in gold while transmutation sparkle rains down the crop; each pawn square
 * flares gold and receives a crown. */
function TransmuteBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.15)" delayMs={delayMs} />
        <span className="fx-sig-swirl absolute left-[28%] top-[28%] block h-[44%] w-[44%]" style={{ animationDelay: `${delayMs}ms`, animationDuration: "1.3s" }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#e6bf6a" strokeWidth="1.4" strokeDasharray="6 3" />
            <circle cx="20" cy="20" r="12.5" fill="none" stroke="#f4c430" strokeWidth="1" strokeDasharray="3 2.5" />
            <path d="M20 6 L32 28 L8 28 Z" fill="none" stroke="#e6bf6a" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="20" cy="20" r="2.4" fill="#f4c430" />
          </svg>
        </span>
        <BoardRain
          delayMs={delayMs + 200}
          render={() => (
            <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" />
            </svg>
          )}
        />
        {/* God-tier pass — THE MAGNUM OPUS: the Stone itself manifests at the
            circle's heart, rising blinding red-gold, and the Great Work lands
            a flare and twin transmutation shockwaves. */}
        <span className="fx-sig-rise absolute left-[42%] top-[38%] block h-[24%] w-[16%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
          <svg viewBox="0 0 24 36" className="h-full w-full" aria-hidden="true">
            <path d="M12 1 L22 12 L18 34 L6 34 L2 12 Z" fill="#c25248" stroke="#7a2410" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M12 6 L17 13 L15 28 L9 28 L7 13 Z" fill="#f4c430" />
            <circle cx="12" cy="17" r="2.6" fill="#fff2c9" />
          </svg>
        </span>
        <span className="fx-sig-flash absolute left-[40%] top-[42%] block h-[16%] w-[20%] rounded-full" style={{ background: "rgba(255,217,94,0.8)", animationDelay: `${delayMs + 640}ms` }} />
        <BoardBoom delayMs={delayMs + 680} color="rgba(244,196,48,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 820} color="rgba(230,191,106,0.75)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[16%] block rounded-full" style={{ background: "rgba(244,196,48,0.75)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-petrify absolute bottom-[8%] left-[22%] right-[22%] top-[14%] block rounded-[1px]" style={{ background: "rgba(230,191,106,0.6)", border: "1px solid rgba(138,100,20,0.8)", animationDelay: `${delayMs + 80}ms` }} />
      <span className="fx-sig-crown absolute left-[34%] top-[26%] block h-[30%] w-[32%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
          <path d="M4 22 L4 8 L13 15 L20 4 L27 15 L36 8 L36 22 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 160} sizePct={9} />
    </span>
  );
}

/** Shackle the Queen: cursed iron. Lead: two colossal chains whip across the
 * whole board in opposite directions over an iron-grey wash and clank home
 * with a shockwave; the queen's square takes falling manacle bars and a chain
 * link ring. */
function ShackleQueenBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const chain = (
    <svg viewBox="0 0 64 12" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={8 + i * 16} cy="6" rx="7" ry="4.6" fill="none" stroke="#5b6672" strokeWidth="2.6" />
      ))}
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(91,102,114,0.2)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[36%] top-[38%] block h-[6%] w-[20%]" style={{ animationDelay: `${delayMs}ms` }}>{chain}</span>
        <span className="fx-sig-crossback absolute left-[44%] top-[52%] block h-[6%] w-[20%]" style={{ animationDelay: `${delayMs + 150}ms` }}>{chain}</span>
        <BoardBoom delayMs={delayMs + 430} color="rgba(91,102,114,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-cage absolute inset-x-[18%] top-[6%] block h-[74%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M8 0 V40 M20 0 V40 M32 0 V40" stroke="#5b6672" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M2 34 H38" stroke="#3f474f" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-ring absolute inset-[14%] block rounded-full" style={{ border: "2px dashed rgba(91,102,114,0.9)", animationDelay: `${delayMs + 180}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#8aa0b4" stroke="#3f474f" delayMs={delayMs + 220} sizePct={8} />
    </span>
  );
}

/** Curse of Frailty: a wasting curse. Lead: the whole board desaturates under
 * a double grey pulse while a cracked hex sigil turns overhead; every enemy
 * square takes a brittle-crack overlay and a grey shiver. */
function FrailtyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(90,90,98,0.26)" delayMs={delayMs} />
        <BoardWash color="rgba(90,90,98,0.2)" delayMs={delayMs + 340} />
        <span className="fx-sig-swirl absolute left-[34%] top-[32%] block h-[36%] w-[32%]" style={{ animationDelay: `${delayMs + 120}ms`, animationDuration: "1.2s" }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#71717a" strokeWidth="1.6" strokeDasharray="7 4" />
            <path d="M20 8 L23 17 L32 17 L25 23 L27 32 L20 26 L13 32 L15 23 L8 17 L17 17 Z" fill="none" stroke="#9a9a9f" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M12 12 L16 16 M28 26 L24 22" stroke="#5b6672" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute inset-[8%] block rounded-[2px]" style={{ background: "rgba(122,122,130,0.4)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-quake absolute inset-[12%] block" style={{ animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 4 L17 14 L22 20 L16 27 L21 36 M17 14 L9 18 M22 20 L31 22 M16 27 L8 31" fill="none" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-crumble absolute left-[20%] top-[16%] block h-[12%] w-[12%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <SigShard fill="#9a9a9f" stroke="#5b6672" variant={2} />
      </span>
    </span>
  );
}

/** Doom March: a dread compulsion drives the enemy backward. Lead: a black
 * tide — a full-width dark wave crested with a skull standard — rolls across
 * the whole board crop under a dusk wash; each cursed square takes a dark
 * wavelet and a falling back-rank chevron. */
function DoomTideBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(24,18,36,0.3)" delayMs={delayMs} />
        <span className="fx-sig-wave absolute left-[18%] top-[36%] block h-[26%] w-[64%]" style={{ animationDelay: `${delayMs + 100}ms`, animationDuration: "1.3s" }}>
          <svg viewBox="0 0 120 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 30 C12 14 26 22 40 12 C54 4 68 16 82 8 C96 2 108 14 120 10 V30 Z" fill="rgba(40,30,58,0.88)" stroke="#181224" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M56 10 C52 4 52 0 56 -4 M56 10 C60 4 60 0 56 -4" fill="none" stroke="#8a8aa0" strokeWidth="1" />
            <circle cx="56" cy="2" r="3.4" fill="#c9c9d4" />
            <circle cx="54.8" cy="1.4" r="0.8" fill="#181224" />
            <circle cx="57.2" cy="1.4" r="0.8" fill="#181224" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 520} color="rgba(122,91,154,0.7)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wave absolute inset-x-[6%] bottom-[12%] block h-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 14" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M0 14 C6 5 12 10 18 4 C24 0 30 7 40 3 V14 Z" fill="rgba(40,30,58,0.82)" stroke="#181224" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-crownfall absolute left-[36%] top-[8%] block h-[26%] w-[28%]" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 20 16" className="h-full w-full" aria-hidden="true">
          <path d="M2 2 L10 8 L18 2 M2 8 L10 14 L18 8" fill="none" stroke="#8a8aa0" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

// --- Batch 11 meta: the clock economy (deadlines, whistles, wages) -----------

/** Deadline: the deadline moves UP. Lead: a red panic wash, a giant office
 * clock whose hands whip backward as the half-minute is docked, and a red
 * strike-through slash; targets get a small docked clock and a red flash. */
function DeadlineBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const clock = (size: string) => (
    <svg viewBox="0 0 40 40" className={size} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="#f4f0e8" stroke="#7a2f28" strokeWidth="2" />
      <path d="M20 6 V9 M34 20 H31 M20 34 V31 M6 20 H9" stroke="#7a2f28" strokeWidth="1.6" strokeLinecap="round" />
      <g className="fx-sig-rewind" style={{ animationDelay: `${delayMs + 140}ms` }}>
        <path d="M20 20 L20 9 M20 20 L28 24" stroke="#c2403a" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle cx="20" cy="20" r="2" fill="#7a2f28" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(194,64,58,0.16)" delayMs={delayMs} />
        <span className="fx-sig-grow absolute left-[40%] top-[34%] block h-[26%] w-[20%]" style={{ animationDelay: `${delayMs}ms` }}>{clock("h-full w-full")}</span>
        <span className="fx-sig-slash absolute left-[36%] top-[30%] block h-[34%] w-[28%]" style={{ animationDelay: `${delayMs + 480}ms` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <path d="M4 36 L36 4" stroke="#c2403a" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 520} color="rgba(194,64,58,0.8)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[18%] block">{clock("h-full w-full")}</span>
      <span className="fx-sig-flash absolute inset-[8%] block rounded-full" style={{ background: "rgba(194,64,58,0.35)", animationDelay: `${delayMs + 260}ms` }} />
    </span>
  );
}

/** Overtime Whistle / Time Out: the ref makes a call. Lead: a giant whistle
 * with concentric TWEET shockwaves rolling past the board edges; the Time Out
 * variant also hurls the yellow penalty flag down the crop. Targets get a
 * small whistle and a ring. */
function WhistleBurst({ lead, delayMs, flag }: { lead: boolean; delayMs: number; flag: boolean }) {
  const whistle = (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
      <path d="M4 10 H26 V16 C26 24 18 28 12 26 C5 24 2 16 4 10 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="14" cy="18" r="3" fill="#8a6414" />
      <path d="M26 11 L36 8 M26 15 L36 16" stroke="#8a6414" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color={flag ? "rgba(244,196,48,0.12)" : "rgba(126,181,154,0.12)"} delayMs={delayMs} />
        <span className="fx-sig-grow absolute left-[41%] top-[38%] block h-[16%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>{whistle}</span>
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 260 + i * 170} color={flag ? "rgba(244,196,48,0.85)" : "rgba(126,181,154,0.85)"} thickness={3} />
        ))}
        {flag && (
          <span className="fx-sig-crownfall absolute left-[52%] top-[30%] block h-[12%] w-[10%]" style={{ animationDelay: `${delayMs + 200}ms`, animationDuration: "1.1s" }}>
            <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
              <path d="M6 2 L6 22" stroke="#8a6414" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 3 H20 L16 8 L20 13 H7 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[26%] top-[30%] block h-[40%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>{whistle}</span>
      <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: `2px solid ${flag ? "rgba(244,196,48,0.85)" : "rgba(126,181,154,0.85)"}`, animationDelay: `${delayMs + 180}ms` }} />
    </span>
  );
}

const COIN_GLYPH = (
  <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
    <circle cx="6" cy="6" r="5" fill="#f4c430" stroke="#8a6414" strokeWidth="1" />
    <path d="M6 3.4 V8.6 M4.4 4.6 C4.4 3.9 7.6 3.9 7.6 5 C7.6 6.4 4.4 5.8 4.4 7.2 C4.4 8.2 7.6 8.2 7.6 7.4" fill="none" stroke="#8a6414" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

/** Overtime Pay: time and a half, paid in full. Lead: a golden payday — coins
 * rain down the whole board while a punch-card clock rises and a gold wash
 * settles; targets get a coin pop and sparks. */
function CashClockBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.14)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[42%] top-[36%] block h-[22%] w-[14%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 30 40" className="h-full w-full" aria-hidden="true">
            <rect x="3" y="6" width="24" height="30" rx="3" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.4" />
            <circle cx="15" cy="16" r="7" fill="#f4f0e8" stroke="#5d3a1e" strokeWidth="1.2" />
            <path d="M15 16 L15 11 M15 16 L18 18" stroke="#5d3a1e" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="8" y="27" width="14" height="5" rx="1" fill="#f4c430" stroke="#8a6414" strokeWidth="0.9" />
          </svg>
        </span>
        <BoardRain delayMs={delayMs + 160} render={() => COIN_GLYPH} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[32%] top-[24%] block h-[36%] w-[36%]" style={{ animationDelay: `${delayMs}ms` }}>{COIN_GLYPH}</span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 160} sizePct={8} />
    </span>
  );
}

/** Overclocked: crank the clock until it glows. Lead: a hot red wash, a giant
 * gear spinning up with speed-streaks darting across, then steam puffs as it
 * all has to cool down; targets get a small gear whirl and a hot flash. */
function OverclockBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const gear = (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <path d="M20 2 L23 8 L29 5 L29 12 L36 12 L32 17 L38 20 L32 23 L36 28 L29 28 L29 35 L23 32 L20 38 L17 32 L11 35 L11 28 L4 28 L8 23 L2 20 L8 17 L4 12 L11 12 L11 5 L17 8 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="6" fill="#f4f0e8" stroke="#7a2f28" strokeWidth="1.2" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE ENGINE GOD REDLINES: heat-light blazes up out of
    // the board and a COLOSSAL overclocked gear-titan rises over the crop —
    // the great gear its burning heart — while speed-streaks dart across and
    // steam vents off it; the redline lands a flare and twin hot shockwaves.
    return (
      <GodEvent
        wash="rgba(224,82,82,0.18)"
        rays="rgba(255,214,120,0.65)"
        boom="rgba(224,119,107,0.85)"
        flare="rgba(255,214,120,0.75)"
        sparkFill="#e0776b"
        sparkStroke="#7a2f28"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the gear-titan's shoulders */}
            <path d="M8 44 L7 32 C7 24 12 19 20 19 C28 19 33 24 33 32 L32 44 Z" fill="rgba(122,47,40,0.9)" stroke="#3a1512" strokeWidth="1.2" strokeLinejoin="round" />
            {/* the great gear burning as its heart */}
            <g transform="translate(9 8) scale(0.55)">
              <path d="M20 2 L23 8 L29 5 L29 12 L36 12 L32 17 L38 20 L32 23 L36 28 L29 28 L29 35 L23 32 L20 38 L17 32 L11 35 L11 28 L4 28 L8 23 L2 20 L8 17 L4 12 L11 12 L11 5 L17 8 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="20" cy="20" r="6" fill="#f4f0e8" stroke="#7a2f28" strokeWidth="1.2" />
            </g>
            {/* rivet eyes over the boiler chest */}
            <path d="M15 27 H18 M22 27 H25" stroke="#ffd166" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13 34 H27 M14 39 H26" stroke="rgba(58,21,18,0.7)" strokeWidth="0.9" fill="none" />
            {/* steam venting off its shoulders */}
            <circle cx="7" cy="20" r="2.4" fill="rgba(220,220,228,0.7)" />
            <circle cx="34" cy="18" r="2" fill="rgba(220,220,228,0.6)" />
          </svg>
        }
      >
        {[
          { t: "36%", d: 200 },
          { t: "50%", d: 320 },
          { t: "62%", d: 440 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-dart absolute left-[24%] block h-[2%] w-[50%]" style={{ top: s.t, animationDelay: `${delayMs + s.d}ms` }}>
            <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 2 H100" stroke="rgba(255,214,120,0.85)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[22%] block" style={{ animationDelay: `${delayMs}ms` }}>{gear}</span>
      <span className="fx-sig-flash absolute inset-[10%] block rounded-full" style={{ background: "rgba(224,82,82,0.4)", animationDelay: `${delayMs + 120}ms` }} />
    </span>
  );
}

// --- Batch 11 meta: the PT gambling / faustian market -------------------------

/** All In: everything pushed to the centre. Lead: a felt-green wash, a stack
 * of poker chips shoved across the whole board, and a shower of chips raining
 * down the crop; targets get a chip spin and star sparks. */
function AllInBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const chip = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <circle cx="6" cy="6" r="5.2" fill="#e0776b" stroke="#7a2f28" strokeWidth="0.9" />
      <circle cx="6" cy="6" r="2.6" fill="#f4f0e8" />
      <path d="M6 0.8 V2.6 M6 9.4 V11.2 M0.8 6 H2.6 M9.4 6 H11.2" stroke="#f4f0e8" strokeWidth="1.2" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(46,95,74,0.2)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[38%] top-[42%] block h-[12%] w-[14%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 30 24" className="h-full w-full" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <ellipse cx="15" cy={20 - i * 6} rx="12" ry="4" fill={i % 2 ? "#7eb59a" : "#e0776b"} stroke={i % 2 ? "#2f4a3c" : "#7a2f28"} strokeWidth="1" />
              </g>
            ))}
          </svg>
        </span>
        <BoardRain delayMs={delayMs + 240} render={() => chip} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-spin absolute inset-[26%] block" style={{ animationDelay: `${delayMs}ms` }}>{chip}</span>
      <ShardBurst vectors={PIN_STARS} fill="#7eb59a" stroke="#2f4a3c" delayMs={delayMs + 100} sizePct={8} />
    </span>
  );
}

/** Mystery Box: rattle the crate, pop the lid. Lead: a giant crate shivers,
 * its lid flips open, and a fountain of question-mark shards erupts over the
 * board; targets get a small rattling box and a drifting "?". */
function MysteryBoxBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const qmark = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <path d="M4 4 C4 1.6 8 1.6 8 4 C8 5.6 6 5.6 6 7.4 M6 9.6 V10.4" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(122,91,154,0.14)" delayMs={delayMs} />
        <span className="fx-sig-wiggle absolute left-[41%] top-[42%] block h-[18%] w-[16%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
            <rect x="3" y="10" width="26" height="20" rx="2" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.6" />
            <path d="M3 16 H29 M16 10 V30" stroke="#5d3a1e" strokeWidth="1.2" />
          </svg>
        </span>
        <span className="fx-sig-flap-l absolute left-[41%] top-[40%] block h-[4%] w-[16%]" style={{ transformOrigin: "0% 50%", animationDelay: `${delayMs + 420}ms` }}>
          <svg viewBox="0 0 32 6" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <rect x="1" y="0.5" width="30" height="5" rx="1.5" fill="#a3814f" stroke="#5d3a1e" strokeWidth="1" />
          </svg>
        </span>
        <ShardBurst vectors={BURST_BIG} fill="#a877d8" stroke="#4a3070" delayMs={delayMs + 480} sizePct={5} />
        <BoardBoom delayMs={delayMs + 520} color="rgba(168,119,216,0.8)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-wiggle absolute left-[28%] top-[34%] block h-[44%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
          <rect x="3" y="10" width="26" height="20" rx="2" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.6" />
          <path d="M3 16 H29 M16 10 V30" stroke="#5d3a1e" strokeWidth="1.2" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[52%] top-[10%] block h-[26%] w-[24%]" style={{ animationDelay: `${delayMs + 300}ms` }}>{qmark}</span>
    </span>
  );
}

/** Swap Meet: shake on the deal. Lead: two trading cards charge the whole
 * board in opposite directions and pass mid-crop under a market-stall wash;
 * targets get a pair of counter-curved swap arrows. */
function SwapMeetBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const card = (flip: boolean) => (
    <svg viewBox="0 0 20 28" className="h-full w-full" aria-hidden="true" style={{ transform: flip ? "rotate(8deg)" : "rotate(-8deg)" }}>
      <rect x="1.5" y="1.5" width="17" height="25" rx="2.5" fill={flip ? "#7eb59a" : "#e0776b"} stroke={flip ? "#2f4a3c" : "#7a2f28"} strokeWidth="1.4" />
      <circle cx="10" cy="11" r="4" fill="#f4f0e8" />
      <path d="M5 20 H15" stroke="#f4f0e8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,191,106,0.12)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[40%] top-[34%] block h-[13%] w-[8%]" style={{ animationDelay: `${delayMs}ms` }}>{card(false)}</span>
        <span className="fx-sig-crossback absolute left-[52%] top-[52%] block h-[13%] w-[8%]" style={{ animationDelay: `${delayMs + 120}ms` }}>{card(true)}</span>
        <span className="fx-sig-flash absolute left-[44%] top-[44%] block h-[12%] w-[12%] rounded-full" style={{ background: "rgba(244,196,48,0.5)", animationDelay: `${delayMs + 560}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[16%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M10 16 A12 12 0 0 1 30 12" fill="none" stroke="#e0776b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M30 12 L32 5 L24 8 Z" fill="#e0776b" />
          <path d="M30 24 A12 12 0 0 1 10 28" fill="none" stroke="#7eb59a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10 28 L8 35 L16 32 Z" fill="#7eb59a" />
        </svg>
      </span>
    </span>
  );
}

/** Golden Touch: the price of greed. Lead: a golden wash, a giant reaching
 * hand rising over the board, and transmutation sparkle raining down; the
 * touched square is glazed in climbing gold with coin-bright sparks. */
function GoldenTouchBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.15)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[40%] top-[32%] block h-[28%] w-[16%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 30 44" className="h-full w-full" aria-hidden="true">
            <path d="M8 44 V22 C8 18 12 18 12 22 V14 C12 10 16 10 16 14 V12 C16 8 20 8 20 12 V16 C20 13 24 13 24 16 V30 C24 38 20 44 14 44 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </span>
        <BoardRain
          delayMs={delayMs + 220}
          render={(i) => (i % 2 === 0 ? COIN_GLYPH : (
            <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#ffd95e" stroke="#8a6414" strokeWidth="0.5" />
            </svg>
          ))}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-petrify absolute bottom-[8%] left-[20%] right-[20%] top-[12%] block rounded-[1px]" style={{ background: "rgba(244,196,48,0.55)", border: "1px solid rgba(138,100,20,0.8)", animationDelay: `${delayMs}ms` }} />
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 140} sizePct={9} />
    </span>
  );
}

// --- Batch 11 meta: PT curses & chaos -----------------------------------------

/** Understaffed: the next hire never shows. A desk sign slams down, papers
 * scatter, and a lone Z drifts off the empty chair. Deliberately small — the
 * joke is the anticlimax. */
function OutOfOfficeBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-snooze absolute left-[22%] top-[26%] block h-[46%] w-[56%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M6 28 L12 6 H28 L34 28" fill="none" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
          <rect x="8" y="8" width="24" height="12" rx="2" fill="#f4f0e8" stroke="#5d3a1e" strokeWidth="1.4" />
          <path d="M12 12 H28 M12 16 H24" stroke="#8aa0b4" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-crumble absolute left-[12%] top-[20%] block h-[14%] w-[14%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
        <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="#f4f0e8" stroke="#8aa0b4" strokeWidth="0.6" /></svg>
      </span>
      <span className="fx-sig-zzz absolute left-[62%] top-[8%] block h-[22%] w-[20%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M5 5 H13 L5 14 H13" fill="none" stroke="#8aa0b4" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Allergies: the sniffles strike. Lead: pollen motes drift down the whole
 * board before a colossal AH-CHOO — a green sneeze cloud splat and a
 * shockwave; the sneezy square gets its own splat cloud and droplet spray. */
function SneezeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardRain
          delayMs={delayMs}
          render={() => (
            <svg viewBox="0 0 8 8" className="h-full w-full" aria-hidden="true"><circle cx="4" cy="4" r="2.6" fill="rgba(230,214,120,0.85)" stroke="#8a6414" strokeWidth="0.5" /></svg>
          )}
        />
        <span className="fx-sig-splat absolute left-[36%] top-[38%] block h-[22%] w-[28%]" style={{ animationDelay: `${delayMs + 520}ms` }}>
          <svg viewBox="0 0 48 24" className="h-full w-full" aria-hidden="true">
            <path d="M6 18 C0 18 2 8 10 9 C10 2 22 0 25 6 C32 1 42 6 40 12 C46 13 46 18 40 19 Z" fill="rgba(163,209,150,0.8)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </span>
        <BoardBoom delayMs={delayMs + 560} color="rgba(163,209,150,0.8)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-splat absolute inset-x-[14%] top-[30%] block h-[36%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 48 24" className="h-full w-full" aria-hidden="true">
          <path d="M6 18 C0 18 2 8 10 9 C10 2 22 0 25 6 C32 1 42 6 40 12 C46 13 46 18 40 19 Z" fill="rgba(163,209,150,0.75)" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#a3d196" stroke="#5f927a" delayMs={delayMs + 80} sizePct={8} />
    </span>
  );
}

/** Chaos Theory: a tornado sweeps the board. Lead: a great grey funnel churns
 * across the entire crop while flung pawns rain back down; each reshuffled
 * square spins up its own dust spiral and scatters debris wide. */
function TornadoBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — THE STORM THAT THINKS: the crop greys out under a
    // COLOSSAL churning funnel that grinds across the whole board — a storm
    // god's face scowling in its thunderhead — while flung pawns rain back
    // down; it lands a dust flare and twin gale shockwaves.
    return (
      <GodEvent
        wash="rgba(122,122,130,0.2)"
        rays="rgba(154,154,159,0.5)"
        boom="rgba(154,154,159,0.85)"
        flare="rgba(201,201,212,0.6)"
        sparkFill="#c9c9d4"
        sparkStroke="#5b6672"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 48" className="h-full w-full" aria-hidden="true">
            {/* the thunderhead with the storm god's scowl */}
            <path d="M6 10 C6 4 12 1 17 3 C19 -1 27 -1 29 3 C35 1 40 6 38 11 C36 14 32 15 28 14 L12 14 C8 14 6 13 6 10 Z" fill="rgba(90,96,110,0.92)" stroke="#2f3540" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M13 8 H17 M23 8 H27" stroke="#ffd166" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M17 11.5 C19 10.5 21 10.5 23 11.5" stroke="#2f3540" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* the colossal funnel churning down out of it */}
            <path d="M6 15 C14 11 26 11 34 15 C28 19 12 19 10 23 C18 27 28 25 30 29 C22 33 14 31 14 35 C20 39 24 37 24 41 C18 45 16 43 17 47" fill="none" stroke="#9a9a9f" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M12 17 C20 14 28 15 32 17 M14 25 C20 23 26 24 28 26 M17 33 C20 32 22 32 23 34" stroke="rgba(201,201,212,0.6)" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
        }
      >
        <BoardRain
          delayMs={delayMs + 220}
          render={() => (
            <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
              <circle cx="6" cy="5" r="3" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.8" />
              <path d="M3 15 C3 10 9 10 9 15 Z" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.8" strokeLinejoin="round" />
            </svg>
          )}
        />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-whirl absolute inset-[12%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M20 20 C20 12 30 12 30 20 C30 30 12 30 12 20 C12 8 34 8 34 22" fill="none" stroke="#9a9a9f" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_BIG} fill="#c9c9d4" stroke="#5b6672" delayMs={delayMs + 60} sizePct={9} />
    </span>
  );
}

/** Greenhouse: a glass dome over one file. Lead: a giant translucent dome
 * descends over the crop while sun shafts warm it; each pawn square on the
 * file gets a small dome and a sprouting leaf. */
function GreenhouseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(163,209,96,0.12)" delayMs={delayMs} />
        <span className="fx-sig-shaft absolute left-[30%] top-[24%] block h-[46%] w-[5%]" style={{ background: "rgba(255,240,180,0.45)", animationDelay: `${delayMs + 80}ms`, animationDuration: "1s" }} />
        <span className="fx-sig-shaft absolute left-[62%] top-[24%] block h-[46%] w-[5%]" style={{ background: "rgba(255,240,180,0.45)", animationDelay: `${delayMs + 220}ms`, animationDuration: "1s" }} />
        <span className="fx-sig-dome absolute left-[34%] top-[36%] block h-[26%] w-[32%]" style={{ animationDelay: `${delayMs + 140}ms` }}>
          <svg viewBox="0 0 60 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M2 30 C2 8 58 8 58 30 Z" fill="rgba(198,234,255,0.35)" stroke="#7fb8dd" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M30 9 V30 M14 13 C13 20 12 25 12 30 M46 13 C47 20 48 25 48 30" stroke="#7fb8dd" strokeWidth="1" fill="none" />
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-dome absolute inset-x-[10%] bottom-[10%] block h-[62%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 60 30" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          <path d="M2 30 C2 8 58 8 58 30 Z" fill="rgba(198,234,255,0.3)" stroke="#7fb8dd" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-grow absolute left-[38%] bottom-[16%] block h-[36%] w-[24%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
          <path d="M10 26 V10" stroke="#5f927a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 14 C4 14 2 8 3 4 C8 4 11 8 10 14 Z M10 10 C16 10 18 5 17 1 C12 1 9 5 10 10 Z" fill="#a3d160" stroke="#5f927a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

/** Groundhog Day: the VHS rewind. Lead: static scanline bars sweep the whole
 * board while a giant double-triangle rewind glyph jitters over a grey wash;
 * targets get a glitch bar and a ghosted double image. */
function GroundhogBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const rewindGlyph = (
    <svg viewBox="0 0 40 24" className="h-full w-full" aria-hidden="true">
      <path d="M20 2 L4 12 L20 22 Z M38 2 L22 12 L38 22 Z" fill="#c9c9d4" stroke="#5b6672" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(90,90,98,0.22)" delayMs={delayMs} />
        {[
          { t: "34%", d: 0 },
          { t: "50%", d: 180 },
          { t: "64%", d: 360 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-sweepbar absolute left-[20%] block h-[2.6%] w-[60%]" style={{ top: b.t, background: "rgba(201,201,212,0.5)", animationDelay: `${delayMs + b.d}ms` }} />
        ))}
        <span className="fx-sig-glitch absolute left-[40%] top-[42%] block h-[14%] w-[18%]" style={{ animationDelay: `${delayMs + 240}ms` }}>{rewindGlyph}</span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-glitch absolute inset-x-[10%] top-[30%] block h-[16%]" style={{ background: "rgba(201,201,212,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-afterimage absolute left-[28%] top-[24%] block h-[50%] w-[44%]" style={{ animationDelay: `${delayMs + 160}ms` }}>{rewindGlyph}</span>
    </span>
  );
}

/** Hot Potato: too hot to hold. Lead: a steaming potato ricochets across the
 * whole board over an oven-orange wash with an ember shockwave; the cursed
 * square's potato hops in place shedding flame licks. */
function HotPotatoBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const potato = (
    <svg viewBox="0 0 24 18" className="h-full w-full" aria-hidden="true">
      <ellipse cx="12" cy="10" rx="10" ry="7" fill="#b98a5a" stroke="#6b4a2a" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="0.9" fill="#6b4a2a" />
      <circle cx="15" cy="12" r="0.9" fill="#6b4a2a" />
      <path d="M8 2 C7 0.5 9 0 9 -1 M13 2 C12 0.5 14 0 14 -1" fill="none" stroke="#c9c9d4" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,110,60,0.16)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[38%] top-[40%] block h-[10%] w-[12%]" style={{ animationDelay: `${delayMs}ms` }}>{potato}</span>
        <BoardBoom delayMs={delayMs + 480} color="rgba(255,214,120,0.8)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-hop absolute left-[26%] top-[28%] block h-[44%] w-[48%]" style={{ animationDelay: `${delayMs}ms` }}>{potato}</span>
      <span className="fx-sig-rise absolute left-[42%] bottom-[10%] block h-[30%] w-[16%]" style={{ animationDelay: `${delayMs + 240}ms` }}>
        <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
          <path d="M6 16 C2 12 4 7 6 4 C6 8 9 8 8 11 C10 9 9 6 8 4 C11 8 10 13 8 16 Z" fill="rgba(224,119,107,0.9)" stroke="#7a2f28" strokeWidth="0.7" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-soot absolute inset-[18%] block rounded-full" style={{ border: "2px solid rgba(230,110,60,0.5)", animationDelay: `${delayMs + 160}ms` }} />
    </span>
  );
}

/** Pinocchio: the nose grows. Lead: an enormous wooden nose telescopes out
 * across the board from a startled wooden face; the pawn's square gets its
 * own nose-extend and a sparkle of splinters. */
function PinocchioBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <span className="fx-sig-grow absolute left-[30%] top-[38%] block h-[18%] w-[10%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
            <circle cx="12" cy="16" r="11" fill="#e8d3b0" stroke="#8a6a4a" strokeWidth="1.6" />
            <circle cx="9" cy="13" r="1.6" fill="#3a2a1a" />
            <circle cx="17" cy="13" r="1.6" fill="#3a2a1a" />
            <path d="M8 22 C11 24 15 24 18 22" fill="none" stroke="#3a2a1a" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2 4 L12 10 L4 12 Z" fill="#c2403a" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="absolute left-[39%] top-[45%] block h-[3.5%] w-[26%]" style={{ transformOrigin: "0% 50%" }}>
          <span className="fx-sig-muzzle absolute inset-0 block" style={{ animationDelay: `${delayMs + 260}ms`, animationDuration: "0.8s" }}>
            <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <path d="M0 1 L96 2 L100 3 L96 4 L0 5 Z" fill="#b98a5a" stroke="#6b4a2a" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M20 1.4 V4.6 M44 1.2 V4.8 M70 1.1 V4.9" stroke="#6b4a2a" strokeWidth="0.5" />
            </svg>
          </span>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flash absolute left-[8%] top-[26%] block h-[48%] w-[42%] rounded-full" style={{ background: "rgba(232,211,176,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="absolute left-[42%] top-[46%] block h-[10%] w-[52%]" style={{ transformOrigin: "0% 50%" }}>
        <span className="fx-sig-muzzle absolute inset-0 block" style={{ animationDelay: `${delayMs + 100}ms`, animationDuration: "0.7s" }}>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d="M0 1 L94 3 L100 5 L94 7 L0 9 Z" fill="#b98a5a" stroke="#6b4a2a" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e8d3b0" stroke="#8a6a4a" delayMs={delayMs + 300} sizePct={7} />
    </span>
  );
}

/** Sea Monkeys: just add water. Lead: an aqua splash wash and a spreading
 * ripple shockwave with bubbles popping across the crop; each hatching square
 * splashes, bubbles, and raises a tiny pawn. */
function SeaMonkeysBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(79,125,104,0.2)" delayMs={delayMs} />
        {[0, 1].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 160 + i * 240} color="rgba(163,209,150,0.75)" thickness={3} />
        ))}
        {[
          { l: "34%", t: "38%", d: 120 }, { l: "56%", t: "32%", d: 300 },
          { l: "46%", t: "56%", d: 220 }, { l: "64%", t: "50%", d: 420 },
          { l: "30%", t: "56%", d: 500 },
        ].map((b, i) => (
          <span key={i} className="fx-sig-flash absolute block h-[4%] w-[4%] rounded-full" style={{ left: b.l, top: b.t, border: "1.5px solid rgba(198,234,255,0.9)", background: "rgba(198,234,255,0.3)", animationDelay: `${delayMs + b.d}ms` }} />
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-splat absolute inset-x-[16%] bottom-[10%] block h-[26%] rounded-full" style={{ background: "rgba(126,181,154,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute left-[36%] bottom-[16%] block h-[46%] w-[28%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
          <circle cx="6" cy="5" r="3" fill="#7eb59a" stroke="#2f4a3c" strokeWidth="0.9" />
          <path d="M3 15 C3 10 9 10 9 15 Z" fill="#7eb59a" stroke="#2f4a3c" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[58%] top-[16%] block h-[12%] w-[10%] rounded-full" style={{ border: "1.2px solid rgba(198,234,255,0.9)", animationDelay: `${delayMs + 320}ms` }} />
    </span>
  );
}

/** Slowpoke: famously bad. Lead: a giant snail trundles across the whole
 * board at half speed over a sheepish mint wash; each sluggish square gets a
 * slime wipe and its own tiny crawler. */
function SnailBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const snail = (
    <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
      <path d="M4 24 C2 18 8 16 14 17 L30 17 C34 17 36 20 34 24 Z" fill="#a3d196" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="20" cy="12" r="9" fill="#b98a5a" stroke="#6b4a2a" strokeWidth="1.2" />
      <path d="M20 12 C20 8 25 8 25 12 C25 17 15 17 15 12 C15 5 28 5 28 13" fill="none" stroke="#6b4a2a" strokeWidth="1.1" />
      <path d="M32 17 C33 12 32 8 34 6 M34 17 C36 13 36 10 38 8" fill="none" stroke="#5f927a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="34" cy="5" r="1.2" fill="#5f927a" />
      <circle cx="38" cy="7" r="1.2" fill="#5f927a" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(126,181,154,0.12)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[38%] top-[42%] block h-[12%] w-[16%]" style={{ animationDelay: `${delayMs}ms`, animationDuration: "1.6s" }}>{snail}</span>
        <span className="fx-sig-frost absolute left-[26%] top-[52%] block h-[2.5%] w-[44%] rounded-full" style={{ background: "rgba(198,234,216,0.6)", animationDelay: `${delayMs + 200}ms`, animationDuration: "1.4s" }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-frost absolute inset-x-[8%] bottom-[22%] block h-[8%] rounded-full" style={{ background: "rgba(198,234,216,0.55)", animationDelay: `${delayMs}ms`, animationDuration: "1.1s" }} />
      <span className="fx-sig-dart absolute left-[18%] top-[34%] block h-[38%] w-[64%]" style={{ animationDelay: `${delayMs + 80}ms`, animationDuration: "1.3s" }}>{snail}</span>
    </span>
  );
}

/** Snooze Button: hit snooze on the whole army. Lead: a navy dusk wash, a
 * giant alarm clock rising mid-board, a colossal snooze bar slamming onto it,
 * and Zs raining down the crop; each sleeper gets a drifting Z. */
function SnoozeButtonBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(26,34,46,0.3)" delayMs={delayMs} />
        <span className="fx-sig-rise absolute left-[40%] top-[36%] block h-[24%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="26" r="16" fill="#f4f0e8" stroke="#4a5560" strokeWidth="2.2" />
            <path d="M20 26 L20 16 M20 26 L27 29" stroke="#4a5560" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 12 L3 6 M32 12 L37 6" stroke="#4a5560" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="3" cy="5" r="3" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
            <circle cx="37" cy="5" r="3" fill="#e0776b" stroke="#7a2f28" strokeWidth="1" />
          </svg>
        </span>
        <span className="fx-sig-snooze absolute left-[43%] top-[28%] block h-[6%] w-[12%]" style={{ animationDelay: `${delayMs + 300}ms` }}>
          <svg viewBox="0 0 30 8" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="28" height="6" rx="3" fill="#8aa0b4" stroke="#4a5560" strokeWidth="1" />
          </svg>
        </span>
        <BoardRain
          delayMs={delayMs + 380}
          render={() => (
            <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
              <path d="M5 5 H14 L5 15 H14" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          )}
        />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-zzz absolute left-[30%] top-[20%] block h-[34%] w-[32%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M4 4 H13 L4 14 H13" fill="none" stroke="#8aa0b4" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-zzz absolute left-[52%] top-[36%] block h-[22%] w-[20%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M5 5 H13 L5 14 H13" fill="none" stroke="#67748a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/** Stinky: one piece reeks. Lead: a queasy green wash with three colossal
 * stench wisps curling up the whole crop and a scatter of fleeing flies; the
 * smelly square gets its own wisps and orbiting flies. */
function StinkBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const wisp = (
    <svg viewBox="0 0 12 32" className="h-full w-full" aria-hidden="true">
      <path d="M6 32 C2 26 10 22 6 16 C2 10 10 6 6 0" fill="none" stroke="rgba(163,209,150,0.85)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(122,145,64,0.18)" delayMs={delayMs} />
        {[
          { l: "36%", d: 0 }, { l: "47%", d: 180 }, { l: "58%", d: 340 },
        ].map((w, i) => (
          <span key={i} className="fx-sig-ash absolute top-[34%] block h-[26%] w-[5%]" style={{ left: w.l, animationDelay: `${delayMs + w.d}ms`, animationDuration: "1.1s" }}>{wisp}</span>
        ))}
        <ShardBurst vectors={BURST_BIG} fill="#2b2b2f" stroke="#141416" delayMs={delayMs + 420} sizePct={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-ash absolute left-[24%] bottom-[24%] block h-[54%] w-[16%]" style={{ animationDelay: `${delayMs}ms` }}>{wisp}</span>
      <span className="fx-sig-ash absolute left-[44%] bottom-[28%] block h-[58%] w-[16%]" style={{ animationDelay: `${delayMs + 160}ms` }}>{wisp}</span>
      <span className="fx-sig-ash absolute left-[62%] bottom-[22%] block h-[50%] w-[16%]" style={{ animationDelay: `${delayMs + 300}ms` }}>{wisp}</span>
      <span className="fx-sig-swirl absolute inset-[20%] block" style={{ animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="14" r="1.6" fill="#2b2b2f" />
          <circle cx="32" cy="20" r="1.6" fill="#2b2b2f" />
          <circle cx="18" cy="34" r="1.6" fill="#2b2b2f" />
        </svg>
      </span>
    </span>
  );
}

/** Whoopee Cushion: the rude noise heard around the board. Lead: a giant pink
 * cushion flattens with a SPLAT while honk-rings roll past the edges and
 * musical notes scatter; targets get a small deflating cushion. */
function WhoopeeBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const cushion = (
    <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
      <ellipse cx="18" cy="14" rx="15" ry="10" fill="#e07ab8" stroke="#8a3a6a" strokeWidth="1.4" />
      <path d="M31 10 C36 8 39 9 39 12 C39 14 35 15 32 14" fill="#e07ab8" stroke="#8a3a6a" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="18" cy="14" r="3" fill="none" stroke="#8a3a6a" strokeWidth="0.9" strokeDasharray="2 1.6" />
    </svg>
  );
  const note = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <path d="M8 1 V8 M8 1 L11 2 V4 L8 3" fill="none" stroke="#8a3a6a" strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="6.4" cy="8.6" rx="2" ry="1.5" fill="#8a3a6a" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(224,122,184,0.14)" delayMs={delayMs} />
        <span className="fx-sig-splat absolute left-[38%] top-[40%] block h-[16%] w-[20%]" style={{ animationDelay: `${delayMs}ms` }}>{cushion}</span>
        {[0, 1].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 220 + i * 200} color="rgba(224,122,184,0.8)" thickness={4} />
        ))}
        <ShardBurst vectors={BURST_MED} fill="#e07ab8" stroke="#8a3a6a" delayMs={delayMs + 300} sizePct={5} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-splat absolute inset-x-[12%] top-[30%] block h-[42%]" style={{ animationDelay: `${delayMs}ms` }}>{cushion}</span>
      <span className="fx-sig-shock absolute inset-[10%] block rounded-full" style={{ border: "2px solid rgba(224,122,184,0.8)", animationDelay: `${delayMs + 160}ms` }} />
      <span className="fx-sig-zzz absolute left-[60%] top-[10%] block h-[22%] w-[20%]" style={{ animationDelay: `${delayMs + 240}ms` }}>{note}</span>
    </span>
  );
}

/** Trapdoor (funny): the rigged spring. The doors flap open, a coil spring
 * extends with a BOING, and the sprung piece is flung back in a star arc. A
 * per-square gag by design (the trap is one square's secret). */
function SpringTrapBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-flap-l absolute left-[10%] top-[46%] block h-[8%] w-[40%]" style={{ transformOrigin: "0% 50%", animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 8" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true"><rect x="0.5" y="0.5" width="39" height="7" rx="1" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1" /></svg>
      </span>
      <span className="fx-sig-flap-r absolute right-[10%] top-[46%] block h-[8%] w-[40%]" style={{ transformOrigin: "100% 50%", animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 8" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true"><rect x="0.5" y="0.5" width="39" height="7" rx="1" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1" /></svg>
      </span>
      <span className="fx-sig-crown absolute left-[34%] bottom-[10%] block h-[52%] w-[32%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 32" className="h-full w-full" aria-hidden="true">
          <path d="M4 32 L16 28 L4 24 L16 20 L4 16 L16 12 L4 8 L16 4" fill="none" stroke="#8aa0b4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-star absolute left-1/2 top-1/2 ml-[-9%] mt-[-9%] block h-[18%] w-[18%]" style={{ "--dx": "-40%", "--dy": "-260%", "--rot": "-160deg", animationDelay: `${delayMs + 360}ms` } as React.CSSProperties}>
        <SigShard fill="#ffd95e" stroke="#8a6414" variant={1} />
      </span>
    </span>
  );
}

// --- Batch 11 meta: PT passives -----------------------------------------------

/** Contagion: freezes are catching. Lead: a sickly green wash with THREE
 * expanding infection rings rolling past the board edges one after another —
 * the spread made literal; each square gets a double ripple and droplets. */
function ContagionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // God-tier pass — THE PLAGUE HERALD: sickly grave-light wells up out of
    // the board and a colossal beaked plague-doctor herald rises over the
    // crop, censer swinging, while THREE infection rings roll past the board
    // edges one after another — the spread made literal.
    return (
      <GodEvent
        wash="rgba(122,181,122,0.18)"
        rays="rgba(163,209,150,0.55)"
        boom="rgba(163,209,150,0.8)"
        flare="rgba(163,209,150,0.55)"
        sparkFill="#a3d196"
        sparkStroke="#5f927a"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* wide plague hat + beaked mask */}
            <path d="M8 10 C8 8 13 6.5 20 6.5 C27 6.5 32 8 32 10 C32 12 27 13 20 13 C13 13 8 12 8 10 Z" fill="rgba(47,58,38,0.95)" stroke="#1c2e20" strokeWidth="0.9" />
            <path d="M16 7 C16 4 17.5 2 20 2 C22.5 2 24 4 24 7 Z" fill="rgba(47,58,38,0.95)" stroke="#1c2e20" strokeWidth="0.9" />
            <path d="M17 13 C17 15 18 16.5 20 19 L26 24 C23 20 22 16 22 13 Z" fill="#c9c9b0" stroke="#5f927a" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="18.5" cy="14.5" r="1" fill="#a3d196" stroke="#2f3a26" strokeWidth="0.5" />
            {/* the herald's long robe */}
            <path d="M12 44 C10 33 12 20 20 18 C28 20 30 33 28 44 Z" fill="rgba(47,58,38,0.9)" stroke="#5f927a" strokeWidth="1" strokeLinejoin="round" />
            <path d="M16 26 H24 M15 33 H25" stroke="rgba(95,146,122,0.5)" strokeWidth="0.8" fill="none" />
            {/* the swinging censer, leaking miasma */}
            <path d="M27 24 L33 32" stroke="rgba(47,58,38,0.95)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M31 33 C31 31.5 32 30.5 33.5 30.5 C35 30.5 36 31.5 36 33 C36 35 34.8 36 33.5 36 C32.2 36 31 35 31 33 Z" fill="#5f927a" stroke="#2f3a26" strokeWidth="0.8" />
            <circle cx="36.5" cy="27" r="1.4" fill="rgba(163,209,150,0.6)" />
            <circle cx="38" cy="23.5" r="1.1" fill="rgba(163,209,150,0.5)" />
          </svg>
        }
      >
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 240 + i * 240} color="rgba(163,209,150,0.75)" thickness={3} />
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shock absolute inset-[16%] block rounded-full" style={{ border: "2px solid rgba(163,209,150,0.9)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-shock absolute inset-[6%] block rounded-full" style={{ border: "1.5px solid rgba(163,209,150,0.6)", animationDelay: `${delayMs + 180}ms` }} />
      <ShardBurst vectors={BURST_MED} fill="#a3d196" stroke="#5f927a" delayMs={delayMs + 80} sizePct={8} />
    </span>
  );
}

/** Fan Club: the home crowd goes wild. Lead: confetti rains down the whole
 * board while a giant pennant waves over a warm wash and a cheer-ring rolls
 * out; each guarded pawn gets a mini pennant and confetti sparks. */
function FanClubBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const pennant = (
    <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
      <path d="M6 25 L6 3" stroke="#3a2a1a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 4 L36 9 L7 16 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
  const CONFETTI = ["#e0776b", "#7eb59a", "#f4c430", "#a877d8"];
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.1)" delayMs={delayMs} />
        <span className="fx-sig-crown absolute left-[40%] top-[36%] block h-[20%] w-[16%]" style={{ animationDelay: `${delayMs}ms` }}>{pennant}</span>
        <BoardRain
          delayMs={delayMs + 120}
          render={(i) => (
            <svg viewBox="0 0 8 8" className="h-full w-full" aria-hidden="true">
              <rect x="1.4" y="1.4" width="5.2" height="5.2" rx="0.8" fill={CONFETTI[i % CONFETTI.length]} />
            </svg>
          )}
        />
        <BoardBoom delayMs={delayMs + 340} color="rgba(244,196,48,0.75)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[28%] top-[22%] block h-[46%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}>{pennant}</span>
      <ShardBurst vectors={PIN_STARS} fill="#f4c430" stroke="#8a6414" delayMs={delayMs + 180} sizePct={8} />
    </span>
  );
}

/** Gravity Well: the king bends space. Lead: an indigo wash, two colossal
 * orbit rings locking in around the king, and a field of starlets dragged
 * INTO the well; the king's square gets a small orbit and a dark core. */
function GravityWellBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(40,34,66,0.24)" delayMs={delayMs} />
        <span className="fx-sig-moat absolute left-[30%] top-[32%] block h-[36%] w-[40%]" style={{ animationDelay: `${delayMs + 80}ms` }}>
          <svg viewBox="0 0 80 60" className="h-full w-full" aria-hidden="true">
            <ellipse cx="40" cy="30" rx="37" ry="24" fill="none" stroke="#a877d8" strokeWidth="1.8" strokeDasharray="8 5" />
            <ellipse cx="40" cy="30" rx="24" ry="13" fill="none" stroke="#7a5b9a" strokeWidth="1.2" strokeDasharray="4 4" />
          </svg>
        </span>
        {VORTEX_VEC.map((v, i) => (
          <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-1.6%] mt-[-1.6%] block h-[3.2%] w-[3.2%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 260 + v.d * 8}ms`, animationDuration: "0.9s" } as React.CSSProperties}>
            <SigShard fill="#c9b8e8" stroke="#4a3070" variant={i} />
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-moat absolute inset-[8%] block" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <ellipse cx="20" cy="20" rx="17" ry="11" fill="none" stroke="#a877d8" strokeWidth="1.6" strokeDasharray="5 4" />
        </svg>
      </span>
      <span className="fx-sig-hole absolute inset-[38%] block rounded-full" style={{ background: "rgba(24,18,36,0.85)", border: "1.5px solid rgba(122,91,154,0.9)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Magnetism: the knights go magnetic. A horseshoe magnet rises, dashed field
 * arcs pulse around it, and iron filings snap INTO the square; the lead adds
 * a wider field ring and a flash. */
function MagnetBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(224,82,107,0.24)" boom="rgba(224,82,107,0.85)" delayMs={delayMs} motifClass="fx-sig-rise">
        <svg viewBox="0 0 24 28" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 V10 C4 -2 20 -2 20 10 V28 H14 V10 C14 6 10 6 10 10 V28 Z" fill="#e0526b" stroke="#7a2035" strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="4" y="22" width="6" height="6" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.9" />
          <rect x="14" y="22" width="6" height="6" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.9" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[32%] bottom-[14%] block h-[50%] w-[36%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 28" className="h-full w-full" aria-hidden="true">
          <path d="M4 28 V10 C4 -2 20 -2 20 10 V28 H14 V10 C14 6 10 6 10 10 V28 Z" fill="#e0526b" stroke="#7a2035" strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="4" y="22" width="6" height="6" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.9" />
          <rect x="14" y="22" width="6" height="6" fill="#c9c9d4" stroke="#5b6672" strokeWidth="0.9" />
        </svg>
      </span>
      <span className="fx-sig-moat absolute inset-[10%] block" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="#8aa0b4" strokeWidth="1.2" strokeDasharray="4 3" />
        </svg>
      </span>
      {VORTEX_VEC.slice(0, 4).map((v, i) => (
        <span key={i} className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-4%] mt-[-4%] block h-[8%] w-[8%]" style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 220 + v.d}ms` } as React.CSSProperties}>
          <SigShard fill="#8aa0b4" stroke="#3f474f" variant={i} />
        </span>
      ))}
    </span>
  );
}

/** Photosynthesis: growing toward the light. Lead: a warm dawn wash, a giant
 * sun blooming with turning rays, and leaves fluttering down the whole crop;
 * each pawn square gets a sunbeam and a sprout. */
function PhotosynthesisBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const leaf = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <path d="M2 10 C2 4 6 1 10 1 C10 7 6 10 2 10 Z" fill="#a3d160" stroke="#5f927a" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M3 9 C5 7 7 5 9 3" fill="none" stroke="#5f927a" strokeWidth="0.6" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(244,196,48,0.13)" delayMs={delayMs} />
        <span className="fx-sig-swirl absolute left-[40%] top-[34%] block h-[24%] w-[18%]" style={{ animationDelay: `${delayMs}ms`, animationDuration: "1.2s" }}>
          <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
            <circle cx="20" cy="20" r="9" fill="#f4c430" stroke="#8a6414" strokeWidth="1.4" />
            <path d="M20 2 V8 M20 32 V38 M2 20 H8 M32 20 H38 M7 7 L11 11 M29 29 L33 33 M33 7 L29 11 M11 29 L7 33" stroke="#f4c430" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
        <BoardRain delayMs={delayMs + 240} render={() => leaf} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute inset-x-[32%] top-0 block h-[64%]" style={{ background: "rgba(255,240,180,0.5)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-grow absolute left-[36%] bottom-[12%] block h-[42%] w-[28%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
          <path d="M10 26 V10" stroke="#5f927a" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 14 C4 14 2 8 3 4 C8 4 11 8 10 14 Z M10 10 C16 10 18 5 17 1 C12 1 9 5 10 10 Z" fill="#a3d160" stroke="#5f927a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 260} sizePct={7} />
    </span>
  );
}

/** Termites: the towers are being eaten. Lead: a swarm rains down the crop
 * over a timber-brown wash while a pair of colossal mandibles CHOMP mid-board;
 * each rook square gets gnawing jaws, sawdust, and a fresh crack. */
function TermitesBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const bug = (
    <svg viewBox="0 0 12 12" className="h-full w-full" aria-hidden="true">
      <ellipse cx="6" cy="7" rx="3" ry="4" fill="#b98a5a" stroke="#6b4a2a" strokeWidth="0.8" />
      <circle cx="6" cy="2.6" r="1.8" fill="#8a6a4a" stroke="#6b4a2a" strokeWidth="0.7" />
      <path d="M3 6 L1 5 M3 9 L1 10 M9 6 L11 5 M9 9 L11 10" stroke="#6b4a2a" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(107,74,42,0.16)" delayMs={delayMs} />
        <span className="fx-sig-chomp absolute left-[42%] top-[40%] block h-[16%] w-[14%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden="true">
            <path d="M2 13 C8 5 22 5 28 13 L22 11 L18 14 L12 14 L8 11 Z" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M2 17 C8 25 22 25 28 17 L22 19 L18 16 L12 16 L8 19 Z" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </span>
        <BoardRain delayMs={delayMs} render={() => bug} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-chomp absolute left-[30%] top-[26%] block h-[44%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 30 30" className="h-full w-full" aria-hidden="true">
          <path d="M2 13 C8 5 22 5 28 13 L22 11 L18 14 L12 14 L8 11 Z" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M2 17 C8 25 22 25 28 17 L22 19 L18 16 L12 16 L8 19 Z" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-crumble absolute left-[18%] top-[18%] block h-[12%] w-[12%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
        <SigShard fill="#b98a5a" stroke="#6b4a2a" variant={0} />
      </span>
      <span className="fx-sig-crumble absolute right-[16%] top-[30%] block h-[10%] w-[10%]" style={{ animationDelay: `${delayMs + 280}ms` }}>
        <SigShard fill="#8a6a4a" stroke="#5d3a1e" variant={2} />
      </span>
    </span>
  );
}

/** Union Rules: the picket line forms. Lead: three staggered strike placards
 * heave up across the whole board over a solidarity wash, with a rally ring;
 * each protected square raises its own placard. */
function PicketLineBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const sign = (
    <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
      <path d="M12 31 V14" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
      <rect x="2" y="2" width="20" height="13" rx="1.5" fill="#f4f0e8" stroke="#5d3a1e" strokeWidth="1.3" />
      <path d="M6 6.5 H18 M6 10.5 H14" stroke="#c2403a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(194,64,58,0.1)" delayMs={delayMs} />
        {[
          { l: "32%", t: "40%", d: 0 }, { l: "45%", t: "36%", d: 170 }, { l: "58%", t: "42%", d: 340 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-brick absolute block h-[18%] w-[9%]" style={{ left: s.l, top: s.t, animationDelay: `${delayMs + s.d}ms` }}>{sign}</span>
        ))}
        <BoardBoom delayMs={delayMs + 520} color="rgba(194,64,58,0.7)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-brick absolute left-[28%] bottom-[8%] block h-[74%] w-[44%]" style={{ animationDelay: `${delayMs}ms` }}>{sign}</span>
      <ShardBurst vectors={PIN_STARS} fill="#e0776b" stroke="#7a2f28" delayMs={delayMs + 220} sizePct={7} />
    </span>
  );
}

// --- Batch 11 meta: funny slapstick / summons / transforms --------------------

/** Cream Pie: right in the face. Lead: a giant pie darts across the whole
 * board and detonates in a cream splat with a white shockwave; the stunned
 * square gets its own splat, drips, and the cherry on top. */
function CreamPieBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const pie = (
    <svg viewBox="0 0 32 16" className="h-full w-full" aria-hidden="true">
      <path d="M2 10 H30 L27 15 H5 Z" fill="#d8a86a" stroke="#8a6a3a" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M3 10 C6 4 12 8 16 4 C20 8 26 4 29 10 Z" fill="#f7f2e6" stroke="#c9bfa4" strokeWidth="0.9" strokeLinejoin="round" />
      <circle cx="16" cy="4" r="2" fill="#e05252" stroke="#7a2f28" strokeWidth="0.7" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(247,242,230,0.16)" delayMs={delayMs} />
        <span className="fx-sig-dart absolute left-[30%] top-[42%] block h-[8%] w-[18%]" style={{ animationDelay: `${delayMs}ms` }}>{pie}</span>
        <span className="fx-sig-splat absolute left-[52%] top-[40%] block h-[12%] w-[14%] rounded-full" style={{ background: "rgba(247,242,230,0.85)", animationDelay: `${delayMs + 420}ms` }} />
        <BoardBoom delayMs={delayMs + 460} color="rgba(247,242,230,0.85)" thickness={4} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-splat absolute inset-x-[12%] top-[28%] block h-[38%]" style={{ animationDelay: `${delayMs}ms` }}>{pie}</span>
      <span className="fx-sig-crumble absolute left-[24%] top-[52%] block h-[14%] w-[10%] rounded-full" style={{ background: "rgba(247,242,230,0.9)", animationDelay: `${delayMs + 200}ms` }} />
      <span className="fx-sig-crumble absolute left-[60%] top-[50%] block h-[12%] w-[9%] rounded-full" style={{ background: "rgba(247,242,230,0.85)", animationDelay: `${delayMs + 300}ms` }} />
    </span>
  );
}

/** Clone / Clone Army: run it through the photocopier. Lead: a blinding green
 * scan bar sweeps the entire board crop under a copier-light wash; each copy
 * square gets a mini scan bar and a ghosted duplicate sliding off the
 * original. */
function PhotocopyBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(163,209,150,0.14)" delayMs={delayMs} />
        <span className="fx-sig-sweepbar absolute left-[20%] top-[28%] block h-[44%] w-[6%]" style={{ background: "rgba(198,255,214,0.65)", animationDelay: `${delayMs + 80}ms`, animationDuration: "1.2s" }} />
        <span className="fx-sig-flash absolute left-[20%] top-[28%] block h-[44%] w-[60%]" style={{ background: "rgba(198,255,214,0.22)", animationDelay: `${delayMs + 560}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-sweepbar absolute inset-y-[12%] left-[10%] block w-[10%]" style={{ background: "rgba(198,255,214,0.7)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-afterimage absolute left-[30%] top-[22%] block h-[54%] w-[40%]" style={{ animationDelay: `${delayMs + 220}ms` }}>
        <svg viewBox="0 0 12 16" className="h-full w-full" aria-hidden="true">
          <circle cx="6" cy="5" r="3" fill="none" stroke="#5f927a" strokeWidth="1.2" />
          <path d="M3 15 C3 10 9 10 9 15 Z" fill="none" stroke="#5f927a" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#f4f0e8" stroke="#8aa0b4" delayMs={delayMs + 320} sizePct={7} />
    </span>
  );
}

/** Insurance: the policy pays out. An umbrella pops open over the square with
 * a dome flourish and deflected-drop sparks. A per-square read on purpose —
 * it is a quiet contingency, not a spectacle. */
function UmbrellaBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-dome absolute left-[18%] top-[14%] block h-[56%] w-[64%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true">
          <path d="M2 16 C2 4 38 4 38 16 C33 12 29 12 26 16 C24 12 16 12 14 16 C11 12 7 12 2 16 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M20 6 V26 C20 29 16 29 16 26" fill="none" stroke="#7a2f28" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#8ba9c4" stroke="#3f5a74" delayMs={delayMs + 200} sizePct={7} />
    </span>
  );
}

/** Understudy: the stage call. Lead: the board dims to house-black, two
 * spotlight shafts swing in from the wings, and a star takes centre stage
 * with a spring bow; the promoted square gets its own beam and rising star. */
function SpotlightBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(10,10,16,0.4)" delayMs={delayMs} />
        <span className="absolute left-[34%] top-[24%] block h-[42%] w-[8%]" style={{ transform: "rotate(14deg)", transformOrigin: "50% 0%" }}>
          <span className="fx-sig-shaft absolute inset-0 block" style={{ background: "rgba(255,240,180,0.5)", animationDelay: `${delayMs + 120}ms`, animationDuration: "1s" }} />
        </span>
        <span className="absolute left-[58%] top-[24%] block h-[42%] w-[8%]" style={{ transform: "rotate(-14deg)", transformOrigin: "50% 0%" }}>
          <span className="fx-sig-shaft absolute inset-0 block" style={{ background: "rgba(255,240,180,0.5)", animationDelay: `${delayMs + 260}ms`, animationDuration: "1s" }} />
        </span>
        <span className="fx-sig-crown absolute left-[44%] top-[44%] block h-[12%] w-[12%]" style={{ animationDelay: `${delayMs + 380}ms` }}>
          <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
            <path d="M10 1 L12.4 7 L19 7.4 L13.8 11.4 L15.6 18 L10 14 L4.4 18 L6.2 11.4 L1 7.4 L7.6 7 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute inset-x-[28%] top-0 block h-[72%]" style={{ background: "rgba(255,240,180,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-rise absolute left-[32%] bottom-[12%] block h-[42%] w-[36%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
          <path d="M10 1 L12.4 7 L19 7.4 L13.8 11.4 L15.6 18 L10 14 L4.4 18 L6.2 11.4 L1 7.4 L7.6 7 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 300} sizePct={8} />
    </span>
  );
}

/** Summon Intern: the new hire reports in. A necktied pawn springs up with a
 * steaming coffee cup and a flurry of memo pages. Deliberately small — it's
 * one intern. */
function InternBurst({ delayMs }: { delayMs: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crown absolute left-[28%] bottom-[12%] block h-[62%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 16 22" className="h-full w-full" aria-hidden="true">
          <circle cx="8" cy="5" r="3.6" fill="#e8d3b0" stroke="#5d3a1e" strokeWidth="0.9" />
          <path d="M3 21 C3 13 13 13 13 21 Z" fill="#8aa0b4" stroke="#4a5560" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M8 12 L7 16 L8 19 L9 16 Z" fill="#c2403a" stroke="#7a2f28" strokeWidth="0.5" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-rise absolute left-[62%] bottom-[30%] block h-[30%] w-[20%]" style={{ animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 14 14" className="h-full w-full" aria-hidden="true">
          <path d="M2 5 H10 V12 C10 13 3 13 3 12 Z" fill="#f4f0e8" stroke="#8a6a4a" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M10 7 C13 7 13 10 10 10" fill="none" stroke="#8a6a4a" strokeWidth="0.9" />
          <path d="M5 3 C4.5 2 5.5 1.4 5 0.5 M8 3 C7.5 2 8.5 1.4 8 0.5" fill="none" stroke="#c9c9d4" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="fx-sig-crumble absolute left-[14%] top-[20%] block h-[13%] w-[13%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
        <svg viewBox="0 0 10 10" className="h-full w-full" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="#f4f0e8" stroke="#8aa0b4" strokeWidth="0.6" /></svg>
      </span>
    </span>
  );
}

/** Supply Drop: air support inbound. Lead: parachute crates drift down the
 * whole board crop with a dust ring where the payload lands; the drop square
 * takes the crate thump, chute collapse, and dust. */
function CrateDropBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const chuteCrate = (
    <svg viewBox="0 0 20 26" className="h-full w-full" aria-hidden="true">
      <path d="M2 8 C2 1 18 1 18 8 L14 7 L10 8 L6 7 Z" fill="#e0776b" stroke="#7a2f28" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M4 8 L8 15 M16 8 L12 15" stroke="#7a2f28" strokeWidth="0.7" />
      <rect x="7" y="15" width="7" height="7" fill="#8a6a4a" stroke="#5d3a1e" strokeWidth="0.9" />
      <path d="M7 18.5 H14 M10.5 15 V22" stroke="#5d3a1e" strokeWidth="0.6" />
    </svg>
  );
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(139,169,196,0.1)" delayMs={delayMs} />
        <BoardRain delayMs={delayMs} render={() => chuteCrate} />
        <BoardBoom delayMs={delayMs + 620} color="rgba(150,110,66,0.7)" thickness={3} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute left-[30%] top-[4%] block h-[52%] w-[40%]" style={{ animationDelay: `${delayMs}ms` }}>{chuteCrate}</span>
      <span className="fx-sig-soot absolute inset-x-[16%] bottom-[10%] block h-[18%] rounded-full" style={{ background: "rgba(150,110,66,0.4)", animationDelay: `${delayMs + 520}ms` }} />
    </span>
  );
}

/** Rent-a-Rook: the loaner arrives. A rook rolls up with its price tag still
 * swinging, a gold deal-ring pops, and coins spark; the lead flashes the
 * showroom lights. */
function RentARookBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  // Batch 13 — board-wide lead upgrade: the lead flourish now takes over the
  // whole crop (palette wash + the card's own motif writ large + a shockwave
  // past the board edges) instead of a square-local pop.
  if (lead) {
    return (
      <BoardWideLead wash="rgba(244,196,48,0.24)" boom="rgba(138,160,180,0.85)" delayMs={delayMs} motifClass="fx-sig-rise">
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M4 32 L6 14 H18 L20 32 Z M4 8 H8 V4 H10 V8 H14 V4 H16 V8 H20 V14 H4 Z" fill="#8aa0b4" stroke="#4a5560" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </BoardWideLead>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-rise absolute left-[28%] bottom-[10%] block h-[62%] w-[38%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 24 32" className="h-full w-full" aria-hidden="true">
          <path d="M4 32 L6 14 H18 L20 32 Z M4 8 H8 V4 H10 V8 H14 V4 H16 V8 H20 V14 H4 Z" fill="#8aa0b4" stroke="#4a5560" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="fx-sig-wiggle absolute left-[58%] top-[18%] block h-[26%] w-[22%]" style={{ animationDelay: `${delayMs + 260}ms` }}>
        <svg viewBox="0 0 14 18" className="h-full w-full" aria-hidden="true">
          <path d="M7 0 V5" stroke="#8a6414" strokeWidth="1" />
          <path d="M2 5 H12 L12 16 L7 18 L2 16 Z" fill="#f4c430" stroke="#8a6414" strokeWidth="1" strokeLinejoin="round" />
          <circle cx="7" cy="8" r="1.2" fill="#8a6414" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 200} sizePct={8} />
    </span>
  );
}

/** Pizza Delivery: thirty minutes or free. Lead: the delivery scooter tears
 * across the whole board trailing steam puffs over a warm oven wash; each
 * drop square gets a flipped-open pizza box and pepperoni sparks. */
function PizzaRunBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(230,110,60,0.1)" delayMs={delayMs} />
        <span className="fx-sig-cross absolute left-[37%] top-[40%] block h-[13%] w-[15%]" style={{ animationDelay: `${delayMs}ms` }}>
          <svg viewBox="0 0 44 30" className="h-full w-full" aria-hidden="true">
            <circle cx="10" cy="24" r="5" fill="#2b2b2f" stroke="#141416" strokeWidth="1" />
            <circle cx="34" cy="24" r="5" fill="#2b2b2f" stroke="#141416" strokeWidth="1" />
            <path d="M6 18 C10 12 16 12 20 14 L28 14 L32 8 L38 8 M28 14 L30 20 L34 22" fill="none" stroke="#e0776b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="31" cy="5" r="2.6" fill="#e8d3b0" stroke="#8a6a4a" strokeWidth="0.8" />
            <rect x="12" y="6" width="10" height="7" rx="1" fill="#d8a86a" stroke="#8a6a3a" strokeWidth="1" />
          </svg>
        </span>
        <span className="fx-sig-zzz absolute left-[30%] top-[46%] block h-[6%] w-[5%] rounded-full" style={{ background: "rgba(220,220,228,0.6)", animationDelay: `${delayMs + 240}ms` }} />
        <span className="fx-sig-zzz absolute left-[26%] top-[50%] block h-[5%] w-[4%] rounded-full" style={{ background: "rgba(220,220,228,0.5)", animationDelay: `${delayMs + 380}ms` }} />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute left-[20%] top-[28%] block h-[46%] w-[60%]" style={{ animationDelay: `${delayMs}ms` }}>
        <svg viewBox="0 0 40 26" className="h-full w-full" aria-hidden="true">
          <path d="M4 12 L20 4 L36 12 Z" fill="#d8a86a" stroke="#8a6a3a" strokeWidth="1.1" strokeLinejoin="round" />
          <rect x="4" y="12" width="32" height="10" rx="1.5" fill="#e8c98a" stroke="#8a6a3a" strokeWidth="1.1" />
          <circle cx="14" cy="17" r="2" fill="#e05252" />
          <circle cx="22" cy="18" r="2" fill="#e05252" />
          <circle cx="29" cy="16" r="2" fill="#e05252" />
        </svg>
      </span>
      <ShardBurst vectors={BURST_MED} fill="#e05252" stroke="#7a2f28" delayMs={delayMs + 180} sizePct={7} />
      <span className="fx-sig-ash absolute left-[44%] top-[10%] block h-[14%] w-[12%] rounded-full" style={{ background: "rgba(220,220,228,0.55)", animationDelay: `${delayMs + 260}ms` }} />
    </span>
  );
}

// --- Batch 14: tier 7+ distinctness splits ------------------------------------
// Owner directive: every card above tier 7 must be unique, distinct, and read
// as its NAME. These eight components split the visuals that two-plus tier 7+
// cards used to share (crownrain, aegis, summonrift, dragonlord, archmage,
// phoenixrise). Same rules as every batch: flat SVG, transform/opacity only,
// one-shot fx-sig-* classes, hidden under reduced motion via effects.css.

/** Amazon Army (crownlegion): the WHOLE minor corps is crowned at once — a
 * board-wide rain of crowns and bishop mitres under one great regnal crown. */
function CrownLegionBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const mitre = (
    <svg viewBox="0 0 20 22" className="h-full w-full" aria-hidden="true">
      <path d="M10 1 C14 5 16 11 15 18 H5 C4 11 6 5 10 1 Z" fill="#e8e2d2" stroke="#6e5321" strokeWidth="1" strokeLinejoin="round" />
      <path d="M10 3 V16 M6.5 9 H13.5" stroke="#c9a84c" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE QUEENMAKER: gold god-rays split the sky and a
    // colossal winged queenmaker descends holding the great regnal crown out
    // over the whole corps while crowns and mitres rain the central band; the
    // mass coronation lands a flare and twin gilded shockwaves.
    return (
      <GodEvent
        wash="rgba(230,191,106,0.24)"
        rays="rgba(255,231,150,0.8)"
        boom="rgba(230,191,106,0.85)"
        flare="rgba(255,236,178,0.75)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* queenmaker wings */}
            <path d="M13 12 C6 8 2 10 1 15 C6 15 9 17 11 20 Z" fill="rgba(255,231,150,0.75)" stroke="#8a6414" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M31 12 C38 8 42 10 43 15 C38 15 35 17 33 20 Z" fill="rgba(255,231,150,0.75)" stroke="#8a6414" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the queenmaker, robed */}
            <circle cx="22" cy="8" r="3" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M22 12 C18.5 12 17 15 16.5 19 L14 32 H30 L27.5 19 C27 15 25.5 12 22 12 Z" fill="rgba(168,119,216,0.8)" stroke="#4a2a6e" strokeWidth="1" strokeLinejoin="round" />
            {/* arms holding the great regnal crown out over the corps */}
            <path d="M17 18 L10 28 M27 18 L34 28" stroke="rgba(168,119,216,0.9)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M10 38 L10 30 L15 33.5 L22 28 L29 33.5 L34 30 L34 38 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1.1" strokeLinejoin="round" />
            <circle cx="16" cy="35.5" r="0.9" fill="#7a5b23" />
            <circle cx="22" cy="35.5" r="0.9" fill="#7a5b23" />
            <circle cx="28" cy="35.5" r="0.9" fill="#7a5b23" />
          </svg>
        }
      >
        {/* crowns for the knights, mitres for the bishops */}
        <BoardRain delayMs={delayMs + 80} render={(i) => (i % 2 === 0 ? <SigCrown /> : mitre)} />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-crownfall absolute top-0 left-[12%] block h-[26%] w-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        <SigCrown />
      </span>
      <span className="fx-sig-crownfall absolute top-0 left-[54%] block h-[30%] w-[30%]" style={{ animationDelay: `${delayMs + 110}ms` }}>
        {mitre}
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#e6bf6a" stroke="#7a5b23" delayMs={delayMs + 240} sizePct={8} />
    </span>
  );
}

/** Aegis of the Ages (agesward): the ANCIENT ward — a round bronze-age shield,
 * boss and rivets, inside a slow ring of weathered runes. */
function AgesWardBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const shield = (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      {/* rune ring */}
      <circle cx="20" cy="20" r="18" fill="none" stroke="#c9a84c" strokeWidth="0.9" strokeDasharray="2.5 3.5" />
      <g stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" fill="none">
        <path d="M20 1 V4 M20 36 V39 M1 20 H4 M36 20 H39" />
      </g>
      {/* the round shield: rim, field, boss, rivets */}
      <circle cx="20" cy="20" r="13" fill="rgba(58,50,30,0.88)" stroke="#c9a84c" strokeWidth="1.8" />
      <circle cx="20" cy="20" r="4.2" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="1" />
      <g fill="#c9a84c">
        <circle cx="20" cy="10" r="1" />
        <circle cx="20" cy="30" r="1" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="30" cy="20" r="1" />
        <circle cx="13" cy="13" r="0.8" />
        <circle cx="27" cy="13" r="0.8" />
        <circle cx="13" cy="27" r="0.8" />
        <circle cx="27" cy="27" r="0.8" />
      </g>
    </svg>
  );
  if (lead) {
    // God-tier pass — THE FIRST WARDEN WAKES: bronze-age light wells up out
    // of the board and a colossal ancient warden rises over the crop — a
    // bearded titan of the old age with the riveted aegis on its arm — before
    // the flare and twin weathered-bronze shockwaves.
    return (
      <GodEvent
        wash="rgba(201,168,76,0.22)"
        rays="rgba(230,191,106,0.65)"
        boom="rgba(201,168,76,0.85)"
        flare="rgba(255,236,178,0.65)"
        sparkFill="#c9a84c"
        sparkStroke="#7a5b23"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the old warden: horned bronze helm, great beard */}
            <path d="M14 8 C12 6 12 3 14 2 C15.5 3.5 16 5.5 16 8 Z M30 8 C32 6 32 3 30 2 C28.5 3.5 28 5.5 28 8 Z" fill="#c9a84c" stroke="#7a5b23" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M16 12 C16 7 18.5 5 22 5 C25.5 5 28 7 28 12 V14 H16 Z" fill="#8a6a3a" stroke="#5c5138" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M18.5 10.5 H20.5 M23.5 10.5 H25.5" stroke="#ffe9b0" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M18 14 C18.5 20 20 23 22 23 C24 23 25.5 20 26 14 Z" fill="#e8e2d2" stroke="#8a8a80" strokeWidth="0.6" strokeLinejoin="round" />
            {/* weathered cloak */}
            <path d="M13 44 C11 33 13 22 22 20 C31 22 33 33 31 44 Z" fill="rgba(92,81,56,0.9)" stroke="#c9a84c" strokeWidth="1" strokeLinejoin="round" />
            {/* the riveted round aegis on its arm */}
            <circle cx="13" cy="31" r="9" fill="rgba(58,50,30,0.92)" stroke="#c9a84c" strokeWidth="1.6" />
            <circle cx="13" cy="31" r="3" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" />
            <g fill="#c9a84c">
              <circle cx="13" cy="24.5" r="0.8" />
              <circle cx="13" cy="37.5" r="0.8" />
              <circle cx="6.5" cy="31" r="0.8" />
              <circle cx="19.5" cy="31" r="0.8" />
            </g>
          </svg>
        }
      />
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-grow absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>{shield}</span>
      <span className="fx-sig-flash absolute inset-[30%] block rounded-full" style={{ background: "radial-gradient(circle, rgba(230,191,106,0.6), transparent 70%)", animationDelay: `${delayMs + 80}ms` }} />
    </span>
  );
}

/** Dug-In Defense (dugin): heads down — a sandbag parapet is thrown up and a
 * helmet ducks behind it in a puff of trench dust. */
function DugInBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const sandbags = (
    <svg viewBox="0 0 48 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <g fill="#b0a072" stroke="#5c5138" strokeWidth="0.9" strokeLinejoin="round">
        <rect x="1" y="11" width="14" height="8" rx="3.5" />
        <rect x="17" y="11" width="14" height="8" rx="3.5" />
        <rect x="33" y="11" width="14" height="8" rx="3.5" />
        <rect x="9" y="3" width="14" height="8" rx="3.5" />
        <rect x="25" y="3" width="14" height="8" rx="3.5" />
      </g>
      <path d="M4 15 H12 M20 15 H28 M36 15 H44 M12 7 H20 M28 7 H36" stroke="rgba(92,81,56,0.6)" strokeWidth="0.6" fill="none" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE PATRON SAINT OF SANDBAGS: trench-light heaves up
    // out of the ground and a COLOSSAL helmeted sapper god rises behind the
    // parapet, entrenching spade shouldered, dust rolling off the works — an
    // equally epic, equally deadpan dig-in with twin olive shockwaves.
    return (
      <GodEvent
        wash="rgba(124,138,74,0.22)"
        rays="rgba(176,160,114,0.6)"
        boom="rgba(124,138,74,0.85)"
        flare="rgba(176,160,114,0.6)"
        sparkFill="#b0a072"
        sparkStroke="#5c5138"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the great brodie helmet */}
            <path d="M8 14 C8 6 14 2 20 2 C26 2 32 6 32 14 Z" fill="#7c8a4a" stroke="#3a4022" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5 14 H35" stroke="#3a4022" strokeWidth="1.8" strokeLinecap="round" />
            {/* the sapper's mud-caked greatcoat, half dug-in */}
            <path d="M11 44 L11 26 C11 20 15 16 20 16 C25 16 29 20 29 26 L29 44 Z" fill="rgba(92,81,56,0.92)" stroke="#3a4022" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M15 20 H18 M22 20 H25" stroke="#e8e2d2" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M13 30 H27 M14 36 H26" stroke="rgba(58,64,34,0.6)" strokeWidth="0.8" fill="none" />
            {/* the shouldered entrenching spade */}
            <path d="M29 24 L37 14" stroke="#8a6a4a" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M36 15 C39 12 40 9 38 7 C36 7.5 34 9.5 33 12.5 Z" fill="#c9d2dc" stroke="#4a5560" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the parapet at its waist */}
            <g fill="#b0a072" stroke="#5c5138" strokeWidth="0.8" strokeLinejoin="round">
              <rect x="2" y="38" width="11" height="6" rx="2.6" />
              <rect x="27" y="38" width="11" height="6" rx="2.6" />
              <rect x="8" y="32" width="11" height="6" rx="2.6" />
              <rect x="21" y="32" width="11" height="6" rx="2.6" />
            </g>
          </svg>
        }
      >
        {/* the works thrown up across the central band */}
        <span className="fx-sig-brick absolute left-[26%] bottom-[32%] block h-[10%] w-[48%]" style={{ animationDelay: `${delayMs + 200}ms` }}>
          {sandbags}
        </span>
        <span className="fx-sig-ash absolute left-[28%] bottom-[30%] block h-[6%] w-[44%] rounded-full" style={{ background: "rgba(176,160,114,0.5)", animationDelay: `${delayMs + 420}ms` }} />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-brick absolute inset-x-[6%] bottom-[8%] block h-[34%]" style={{ animationDelay: `${delayMs}ms` }}>
        {sandbags}
      </span>
      <span className="fx-sig-ash absolute inset-x-[20%] bottom-[6%] block h-[14%] rounded-full" style={{ background: "rgba(176,160,114,0.5)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Summoning Circle (chalkcircle): the chalked pentacle itself — a double
 * chalk ring, a five-point star, and rune ticks, inscribing in violet light. */
function ChalkCircleBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const pentacle = (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="#f0ead8" strokeWidth="1.3" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="#f0ead8" strokeWidth="0.8" strokeDasharray="2 2.4" />
      {/* the five-point star, drawn unbroken */}
      <path
        d="M20 6 L23.9 17.6 L36 17.6 L26.2 24.6 L30 36 L20 29 L10 36 L13.8 24.6 L4 17.6 L16.1 17.6 Z"
        fill="none"
        stroke="#a877d8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* rune ticks between the rings */}
      <g stroke="#f0ead8" strokeWidth="0.8" strokeLinecap="round" fill="none">
        <path d="M20 2.6 V5 M32.6 8 L31 9.6 M37.4 20 H35 M32.6 32 L31 30.4 M20 37.4 V35 M7.4 32 L9 30.4 M2.6 20 H5 M7.4 8 L9 9.6" />
      </g>
    </svg>
  );
  if (lead) {
    // God-tier pass — THE ANSWERED CALL: the chalked pentacle inscribes
    // itself across the whole crop while violet light wells up out of it —
    // and something COLOSSAL actually steps through: a horned eidolon rising
    // out of the circle before the flare and twin conjuring shockwaves.
    return (
      <GodEvent
        wash="rgba(168,119,216,0.2)"
        rays="rgba(214,190,240,0.6)"
        boom="rgba(168,119,216,0.85)"
        flare="rgba(214,190,240,0.65)"
        sparkFill="#c9b6e0"
        sparkStroke="#463357"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the horned eidolon, half-manifested */}
            <path d="M12 10 C9 7 8.5 3 11 1 C12.5 3.5 13.5 6 13.5 9 Z M28 10 C31 7 31.5 3 29 1 C27.5 3.5 26.5 6 26.5 9 Z" fill="rgba(90,63,160,0.9)" stroke="#3a2a63" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M14 14 C14 9 16.5 7 20 7 C23.5 7 26 9 26 14 C26 16.5 24.5 18 22.5 18.5 H17.5 C15.5 18 14 16.5 14 14 Z" fill="rgba(122,92,192,0.85)" stroke="#3a2a63" strokeWidth="1" strokeLinejoin="round" />
            <path d="M17 12.5 L19 13.5 M23 12.5 L21 13.5" stroke="#f0ead8" strokeWidth="1.2" strokeLinecap="round" />
            {/* the body still dissolving into conjuring light below */}
            <path d="M13 38 C12 28 14 20 20 19.5 C26 20 28 28 27 38 C25 35.5 23.5 36.5 22.5 39 C21 36.5 19 36.5 17.5 39 C16.5 36.5 15 35.5 13 38 Z" fill="rgba(122,92,192,0.65)" stroke="#a877d8" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M15 41 V43 M20 41.5 V44 M25 41 V43" stroke="rgba(214,190,240,0.8)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        }
      >
        <span className="fx-sig-swirl absolute inset-[24%] block" style={{ animationDelay: `${delayMs + 60}ms` }}>{pentacle}</span>
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-swirl absolute inset-[10%] block" style={{ animationDelay: `${delayMs}ms` }}>{pentacle}</span>
      <ShardBurst vectors={BURST_MED} fill="#c9b6e0" stroke="#463357" delayMs={delayMs + 140} sizePct={8} />
    </span>
  );
}

/** King's Legion (kingsmuster): the king's own muster — his crown over a rank
 * of banner-spears snapping upright, one per recruit. */
function KingsMusterBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const banner = (i: number) => (
    <svg viewBox="0 0 16 40" className="h-full w-full" aria-hidden="true">
      <path d="M8 40 L8 6" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6 H15 L12.5 9.5 L15 13 H8 Z" fill={i % 2 === 0 ? "#c65a4a" : "#e6bf6a"} stroke="#3a2a1a" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE KING'S OWN HERALD: war-red rays split the sky and a
    // colossal crowned herald descends bearing the king's standard, the
    // legion's banners snapping up in a rank at his feet before the flare and
    // twin muster shockwaves.
    return (
      <GodEvent
        wash="rgba(198,90,74,0.2)"
        rays="rgba(230,191,106,0.7)"
        boom="rgba(198,90,74,0.85)"
        flare="rgba(255,214,120,0.7)"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* crown + tabarded herald */}
            <path d="M14 8 L15 3 L17.5 6 L20 2 L22.5 6 L25 3 L26 8 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" strokeLinejoin="round" />
            <circle cx="20" cy="11.5" r="3" fill="#ffe9b0" stroke="#8a6414" strokeWidth="0.8" />
            <path d="M20 15 C16.5 15 15 18 14.5 22 L12 43 H28 L25.5 22 C25 18 23.5 15 20 15 Z" fill="rgba(198,90,74,0.9)" stroke="#7a2f28" strokeWidth="1" strokeLinejoin="round" />
            <path d="M20 16 V41 M14 24 H26" stroke="rgba(230,191,106,0.75)" strokeWidth="1" fill="none" />
            {/* the king's standard, planted */}
            <path d="M31 43 V6" stroke="#8a6a4a" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M31 6 H40 L36.5 10.5 L40 15 H31 Z" fill="#c65a4a" stroke="#3a2a1a" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M31 4 V8" stroke="#e6bf6a" strokeWidth="1.6" strokeLinecap="round" />
            {/* the raised muster-horn */}
            <path d="M14 22 L7 16 C5.5 14.5 5.5 12.5 7.5 12 C8.5 14 10.5 15.5 13 16.5 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        }
      >
        {/* the legion's banners snapping up in a rank at his feet */}
        {[
          { l: "32%", d: 260 },
          { l: "45%", d: 380 },
          { l: "58%", d: 320 },
        ].map((s, i) => (
          <span key={i} className="fx-sig-brick absolute bottom-[26%] block h-[26%] w-[6%]" style={{ left: s.l, animationDelay: `${delayMs + s.d}ms` }}>
            {banner(i)}
          </span>
        ))}
        <span className="fx-sig-ash absolute left-[30%] bottom-[24%] block h-[6%] w-[36%] rounded-full" style={{ background: "rgba(196,178,142,0.5)", animationDelay: `${delayMs + 460}ms` }} />
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-brick absolute left-[38%] bottom-[8%] block h-[68%] w-[24%]" style={{ animationDelay: `${delayMs}ms` }}>
        {banner(0)}
      </span>
      <span className="fx-sig-ash absolute inset-x-[28%] bottom-[6%] block h-[14%] rounded-full" style={{ background: "rgba(196,178,142,0.5)", animationDelay: `${delayMs + 140}ms` }} />
    </span>
  );
}

/** Total Annihilation (totalannihilation): three kill-marks. Crosshairs snap
 * onto three points and each erupts — nothing implodes quietly here. */
function TotalAnnihilationBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const reticle = (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#c9b6e0" strokeWidth="1.6" />
      <path d="M12 1 V6 M12 18 V23 M1 12 H6 M18 12 H23" stroke="#c9b6e0" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#e0776b" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE THREE-EYED ANNIHILATOR: the crop goes void-dark and
    // a colossal three-eyed archon descends over the board — each of its eyes
    // snapping a kill-reticle onto a doomed piece below — before the triple
    // detonation, the flare and twin violet shockwaves.
    return (
      <GodEvent
        wash="rgba(22,14,28,0.32)"
        rays="rgba(164,140,196,0.6)"
        boom="rgba(164,140,196,0.9)"
        flare="rgba(224,119,107,0.7)"
        sparkFill="#c9b6e0"
        sparkStroke="#463357"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden="true">
            {/* the archon's crowned void head with three burning eyes */}
            <path d="M14 3 L16 7 L20 2 L24 7 L26 3 L27 10 H13 Z" fill="rgba(30,22,40,0.95)" stroke="#a48cc4" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M13 16 C13 11 16 9 20 9 C24 9 27 11 27 16 C27 19 25 21 22.5 21.5 H17.5 C15 21 13 19 13 16 Z" fill="rgba(40,30,56,0.95)" stroke="#a48cc4" strokeWidth="1" strokeLinejoin="round" />
            <circle cx="16.5" cy="14.5" r="1.2" fill="#e0776b" />
            <circle cx="20" cy="13" r="1.4" fill="#e0776b" />
            <circle cx="23.5" cy="14.5" r="1.2" fill="#e0776b" />
            {/* the mantle, spread over the doomed board */}
            <path d="M11 44 C9 33 11 24 20 22 C29 24 31 33 29 44 C26.5 41 25 42 24 44 C22 41.5 20 41.5 18 44 C16.5 41.5 14.5 41 11 44 Z" fill="rgba(30,22,40,0.9)" stroke="#a48cc4" strokeWidth="0.9" strokeLinejoin="round" />
            {/* sighting lines flicking down from the eyes */}
            <path d="M16 16 L8 34 M20 15 L20 36 M24 16 L32 34" stroke="rgba(224,119,107,0.6)" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2 2" />
          </svg>
        }
      >
        {[
          { l: "24%", t: "62%", d: 200 },
          { l: "44%", t: "68%", d: 360 },
          { l: "64%", t: "60%", d: 520 },
        ].map((s, i) => (
          <React.Fragment key={i}>
            <span className="fx-sig-reticle absolute block h-[11%] w-[11%]" style={{ left: s.l, top: s.t, animationDelay: `${delayMs + s.d}ms` }}>
              {reticle}
            </span>
            <span
              className="fx-sig-flash absolute block h-[9%] w-[9%] rounded-full"
              style={{ left: s.l, top: s.t, margin: "1%", background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + s.d + 200}ms` }}
            />
          </React.Fragment>
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-reticle absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>{reticle}</span>
      <span className="fx-sig-flash absolute inset-[26%] block rounded-full" style={{ background: "rgba(224,119,107,0.8)", animationDelay: `${delayMs + 180}ms` }} />
      <ShardBurst vectors={BURST_BIG} fill="#c9b6e0" stroke="#463357" delayMs={delayMs + 180} sizePct={10} />
      <span className="fx-sig-scorch absolute inset-[30%] block rounded-full" style={{ background: "rgba(22,14,28,0.72)", animationDelay: `${delayMs + 320}ms` }} />
    </span>
  );
}

/** The Void Realm (voidrealm): three patches of board simply STOP EXISTING —
 * hungry violet-rimmed pits yawning open one after another. */
function VoidRealmBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  const pit = (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="rgba(18,8,31,0.94)" stroke="#8f6bff" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="11" fill="rgba(8,3,15,0.97)" stroke="rgba(143,107,255,0.55)" strokeWidth="0.9" />
      <circle cx="20" cy="20" r="4.5" fill="#000000" />
    </svg>
  );
  if (lead) {
    // God-tier pass — THE REALM-EATER: the crop drowns violet-black and a
    // colossal three-mawed void leviathan rises through the board — each of
    // its mouths yawning open as one of the three hungry pits — before the
    // event-horizon flare and twin violet shockwaves.
    return (
      <GodEvent
        wash="rgba(18,8,31,0.34)"
        rays="rgba(143,107,255,0.5)"
        boom="rgba(143,107,255,0.85)"
        flare="rgba(143,107,255,0.5)"
        sparkFill="#8f6bff"
        sparkStroke="#2a1050"
        motion="rise"
        delayMs={delayMs}
        figure={
          <svg viewBox="0 0 44 44" className="h-full w-full" aria-hidden="true">
            {/* the leviathan's mass, barely more than outline against the dark */}
            <path d="M6 44 C2 32 6 18 14 12 C18 8 26 8 30 12 C38 18 42 32 38 44 Z" fill="rgba(18,8,31,0.92)" stroke="#8f6bff" strokeWidth="1.3" strokeLinejoin="round" />
            {/* its three maws — the pits themselves */}
            <circle cx="14" cy="24" r="6.5" fill="rgba(8,3,15,0.97)" stroke="#8f6bff" strokeWidth="1.2" />
            <circle cx="14" cy="24" r="2.4" fill="#000000" />
            <circle cx="30" cy="22" r="5.5" fill="rgba(8,3,15,0.97)" stroke="#8f6bff" strokeWidth="1.1" />
            <circle cx="30" cy="22" r="2" fill="#000000" />
            <circle cx="22" cy="35" r="6" fill="rgba(8,3,15,0.97)" stroke="#8f6bff" strokeWidth="1.2" />
            <circle cx="22" cy="35" r="2.2" fill="#000000" />
            {/* thin hungry teeth around each rim */}
            <path d="M9 20 L10.5 22 M19 20 L17.5 22 M26 18 L27.5 20 M34 18 L32.5 20 M17 32 L18.5 34 M27 32 L25.5 34" stroke="rgba(143,107,255,0.7)" strokeWidth="0.8" strokeLinecap="round" />
            {/* a pale watching eye between the maws */}
            <path d="M18 15 C20 13 24 13 26 15 C24 17 20 17 18 15 Z" fill="rgba(143,107,255,0.3)" stroke="#8f6bff" strokeWidth="0.8" />
            <circle cx="22" cy="15" r="1" fill="#c9b6ff" />
          </svg>
        }
      >
        {[
          { l: "26%", t: "60%", s: "11%", d: 300 },
          { l: "50%", t: "64%", s: "10%", d: 440 },
          { l: "64%", t: "56%", s: "10%", d: 580 },
        ].map((p, i) => (
          <span key={i} className="fx-sig-maw absolute block" style={{ left: p.l, top: p.t, height: p.s, width: p.s, animationDelay: `${delayMs + p.d}ms` }}>
            {pit}
          </span>
        ))}
      </GodEvent>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-maw absolute inset-[14%] block" style={{ animationDelay: `${delayMs}ms` }}>{pit}</span>
      {VORTEX_VEC.map((v, i) => (
        <span
          key={i}
          className="fx-sig-implode absolute left-1/2 top-1/2 ml-[-5%] mt-[-5%] block h-[10%] w-[10%]"
          style={{ "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + v.d}ms` } as React.CSSProperties}
        >
          <SigShard fill="#8f6bff" stroke="#2a1050" variant={i} />
        </span>
      ))}
    </span>
  );
}

/** Full Resurrection (sanctrise): a sanctified return — dawn light breaks and
 * the queen rises flanked by both rooks, every one of them haloed. Gold and
 * holy where Phoenix Rebirth is fire and wings. */
function SanctRiseBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    return (
      <BoardWideStage>
        <BoardWash color="rgba(255,236,178,0.26)" delayMs={delayMs} />
        {/* the break of dawn light */}
        <span
          className="fx-sig-shaft absolute left-[34%] top-[4%] block h-[52%] w-[32%]"
          style={{
            background: "linear-gradient(180deg, rgba(255,244,200,0.8), rgba(255,220,130,0.2) 70%, transparent)",
            animationDelay: `${delayMs}ms`,
          }}
        />
        {/* rook — queen — rook, rising haloed out of the ground */}
        {[
          { l: "31%", d: 320, q: false },
          { l: "45%", d: 140, q: true },
          { l: "59%", d: 400, q: false },
        ].map((s, i) => (
          <span key={i} className="fx-sig-rise absolute block" style={{ left: s.l, bottom: "28%", height: s.q ? "26%" : "19%", width: s.q ? "11%" : "9%", animationDelay: `${delayMs + s.d}ms` }}>
            <svg viewBox="0 0 20 34" className="h-full w-full" aria-hidden="true">
              <circle cx="10" cy="7" r="6.5" fill="none" stroke="rgba(255,233,176,0.8)" strokeWidth="1.1" />
              {s.q ? (
                <>
                  <path d="M5 9 L5 4.5 L7.5 6.5 L10 3 L12.5 6.5 L15 4.5 L15 9 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
                  <path d="M6.5 10 C6 20 5.5 26 5 33 H15 C14.5 26 14 20 13.5 10 Z" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="0.8" strokeLinejoin="round" />
                </>
              ) : (
                <path d="M5 33 V14 L4.4 13.4 V8 H7 V9.8 H9 V8 H11 V9.8 H13 V8 H15.6 V13.4 L15 14 V33 Z" fill="rgba(255,236,178,0.88)" stroke="#b98a2e" strokeWidth="0.8" strokeLinejoin="round" />
              )}
            </svg>
          </span>
        ))}
        <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 480} sizePct={6} />
        {/* God-tier pass: the sanctified return lands twin dawn shockwaves. */}
        <BoardBoom delayMs={delayMs + 540} color="rgba(255,232,150,0.9)" thickness={4} />
        <BoardBoom delayMs={delayMs + 680} color="rgba(255,244,200,0.75)" />
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="fx-sig-shaft absolute left-[36%] top-0 block h-[72%] w-[28%]" style={{ background: "rgba(255,242,192,0.55)", animationDelay: `${delayMs}ms` }} />
      <span className="fx-sig-ring absolute inset-[18%] block rounded-full" style={{ border: "1.5px solid rgba(255,233,176,0.9)", animationDelay: `${delayMs + 90}ms` }} />
      <span className="fx-sig-rise absolute left-[36%] bottom-[10%] block h-[52%] w-[28%]" style={{ animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 20 30" className="h-full w-full" aria-hidden="true">
          <path d="M5 6 L5 2 L7.5 4 L10 1 L12.5 4 L15 2 L15 6 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.7" strokeLinejoin="round" />
          <path d="M6.5 7 C6 16 5.5 22 5 29 H15 C14.5 22 14 16 13.5 7 Z" fill="rgba(255,236,178,0.9)" stroke="#b98a2e" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      </span>
      <ShardBurst vectors={PIN_STARS} fill="#ffd95e" stroke="#8a6414" delayMs={delayMs + 200} sizePct={8} />
    </span>
  );
}

/** One square's slice of a signature sequence. `role` is "lead" for the single
 * origin flourish (nova's pop, atomic's central thump, the siege muzzle) and
 * "target" for every cleared enemy square; `delayMs` is the pre-computed
 * stagger so the sequence rolls across the board. */
export default function SignatureVisual({
  visual,
  role,
  delayMs,
}: {
  visual: SigVisual;
  role: "lead" | "target";
  delayMs: number;
}) {
  const lead = role === "lead";
  switch (visual) {
    case "nova":
      return <NovaBurst lead={lead} delayMs={delayMs} />;
    case "trapdoor":
      return <TrapdoorBurst lead={lead} delayMs={delayMs} />;
    case "stone":
      return <StoneBurst lead={lead} delayMs={delayMs} />;
    case "strike":
      return <StrikeBurst lead={lead} delayMs={delayMs} />;
    case "atomic":
      return <AtomicBurst lead={lead} delayMs={delayMs} />;
    case "pin":
      return <PinBurst lead={lead} delayMs={delayMs} />;
    case "siege":
      return <SiegeBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 2 (effect-data sourced) ---
    case "coronation":
      return <CoronationBurst lead={lead} delayMs={delayMs} />;
    case "crownrain":
      return <CrownRainBurst lead={lead} delayMs={delayMs} />;
    case "colossus":
      return <ColossusBurst lead={lead} delayMs={delayMs} />;
    case "snooze":
      return <SnoozeBurst lead={lead} delayMs={delayMs} />;
    case "clockcage":
      return <ClockCageBurst lead={lead} delayMs={delayMs} />;
    case "clockice":
      return <ClockIceBurst lead={lead} delayMs={delayMs} />;
    case "blitz":
      return <BlitzBurst lead={lead} delayMs={delayMs} />;
    case "frostsweep":
      return <FrostSweepBurst delayMs={delayMs} />;
    case "petrify":
      return <PetrifyBurst lead={lead} delayMs={delayMs} />;
    case "petrifiedforest":
      return <PetrifiedForestBurst lead={lead} delayMs={delayMs} />;
    case "aegis":
      return <AegisBurst lead={lead} delayMs={delayMs} />;
    case "cathedral":
      return <CathedralBurst lead={lead} delayMs={delayMs} />;
    case "shades":
      return <ShadesBurst lead={lead} delayMs={delayMs} />;
    case "wallbuild":
      return <WallBuildBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 3 (distinctness split + fantasy set) ---
    case "snapfrost":
      return <SnapFrostBurst lead={lead} delayMs={delayMs} />;
    case "deepglacier":
      return <DeepGlacierBurst lead={lead} delayMs={delayMs} />;
    case "iceshatter":
      return <IceShatterBurst lead={lead} delayMs={delayMs} />;
    case "chainfreeze":
      return <ChainFreezeBurst lead={lead} delayMs={delayMs} />;
    case "gorgonstare":
      return <GorgonStareBurst lead={lead} delayMs={delayMs} />;
    case "medusagaze":
      return <MedusaGazeBurst lead={lead} delayMs={delayMs} />;
    case "serpentstone":
      return <SerpentStoneBurst delayMs={delayMs} />;
    case "wither":
      return <WitherBurst lead={lead} delayMs={delayMs} />;
    case "stonechain":
      return <StoneChainBurst lead={lead} delayMs={delayMs} />;
    case "greyhex":
      return <GreyHexBurst lead={lead} delayMs={delayMs} />;
    case "greatwall":
      return <GreatWallBurst lead={lead} delayMs={delayMs} />;
    case "summonrift":
      return <SummonRiftBurst lead={lead} delayMs={delayMs} />;
    case "dragonrise":
      return <DragonRiseBurst lead={lead} delayMs={delayMs} />;
    case "meteor":
      return <MeteorBurst lead={lead} delayMs={delayMs} />;
    case "gravehands":
      return <GraveHandsBurst lead={lead} delayMs={delayMs} />;
    case "holylight":
      return <HolyLightBurst lead={lead} delayMs={delayMs} />;
    case "icewall":
      return <IceWallBurst lead={lead} delayMs={delayMs} />;
    case "thornwall":
      return <ThornWallBurst lead={lead} delayMs={delayMs} />;
    case "bladegift":
      return <BladeGiftBurst lead={lead} delayMs={delayMs} />;
    case "wings":
      return <WingsBurst tone="feather" lead={lead} delayMs={delayMs} />;
    case "warhorn":
      return <WarhornBurst lead={lead} delayMs={delayMs} />;
    case "dragonfire":
      return <DragonFireBurst lead={lead} delayMs={delayMs} />;
    case "scythe":
      return <ScytheBurst lead={lead} delayMs={delayMs} />;
    case "arclight":
      return <ArcLightBurst lead={lead} delayMs={delayMs} />;
    case "dive":
      return <DiveBurst delayMs={delayMs} />;
    case "smite":
      return <SmiteBurst lead={lead} delayMs={delayMs} />;
    case "decree":
      return <DecreeBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 4 (WILD set + Computer Virus) ---
    case "inferno":
      return <InfernoBurst lead={lead} delayMs={delayMs} />;
    case "hellfire":
      return <HellfireBurst lead={lead} delayMs={delayMs} />;
    case "rockfall":
      return <RockfallBurst lead={lead} delayMs={delayMs} />;
    case "unmake":
      return <UnmakeBurst lead={lead} delayMs={delayMs} />;
    case "wreckingball":
      return <WreckingBallBurst lead={lead} delayMs={delayMs} />;
    case "pinata":
      return <PinataBurst lead={lead} delayMs={delayMs} />;
    case "artillery":
      return <ArtilleryBurst lead={lead} delayMs={delayMs} />;
    case "spearcharge":
      return <SpearChargeBurst lead={lead} delayMs={delayMs} />;
    case "tankroll":
      return <TankRollBurst lead={lead} delayMs={delayMs} />;
    case "hailstorm":
      return <HailstormBurst delayMs={delayMs} />;
    case "blizzard":
      return <BlizzardBurst lead={lead} delayMs={delayMs} />;
    case "stormcloud":
      return <StormCloudBurst delayMs={delayMs} />;
    case "stonerise":
      return <StoneRiseBurst delayMs={delayMs} />;
    case "mountainwall":
      return <MountainWallBurst lead={lead} delayMs={delayMs} />;
    case "trench":
      return <TrenchBurst lead={lead} delayMs={delayMs} />;
    case "reinforce":
      return <ReinforceBurst lead={lead} delayMs={delayMs} />;
    case "paradrop":
      return <ParadropBurst lead={lead} delayMs={delayMs} />;
    case "geniepoof":
      return <GeniePoofBurst lead={lead} delayMs={delayMs} />;
    case "suppress":
      return <SuppressBurst delayMs={delayMs} />;
    case "timestop":
      return <TimeStopBurst lead={lead} delayMs={delayMs} />;
    case "glitch":
      return <GlitchBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 5 (library core + wild + funny second pass) ---
    case "disintegrate":
      return <DisintegrateBurst lead={lead} delayMs={delayMs} />;
    case "cavalrycharge":
      return <CavalryChargeBurst lead={lead} delayMs={delayMs} />;
    case "stonehide":
      return <StonehideBurst lead={lead} delayMs={delayMs} />;
    case "wardpulse":
      return <WardPulseBurst lead={lead} delayMs={delayMs} />;
    case "canopy":
      return <CanopyBurst delayMs={delayMs} />;
    case "sistergrove":
      return <SisterGroveBurst lead={lead} delayMs={delayMs} />;
    case "chronosteal":
      return <ChronoStealBurst lead={lead} delayMs={delayMs} />;
    case "blink":
      return <BlinkBurst lead={lead} delayMs={delayMs} />;
    case "portal":
      return <PortalBurst lead={lead} delayMs={delayMs} />;
    case "borderward":
      return <BorderWardBurst lead={lead} delayMs={delayMs} />;
    case "banana":
      return <BananaBurst delayMs={delayMs} />;
    case "minefield":
      return <MinefieldBurst lead={lead} delayMs={delayMs} />;
    case "vortex":
      return <VortexBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 6 (marquee dragon + wizard) ---
    case "dragonlord":
      return <DragonLordBurst lead={lead} delayMs={delayMs} />;
    case "archmage":
      return <ArchmageBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 7 (marquee sea / monster + top-tier boardwide) ---
    case "kraken":
      return <KrakenBurst lead={lead} delayMs={delayMs} />;
    case "abyss":
      return <AbyssBurst lead={lead} delayMs={delayMs} />;
    case "whirlpool":
      return <WhirlpoolBurst delayMs={delayMs} />;
    case "flood":
      return <FloodBurst lead={lead} delayMs={delayMs} />;
    case "frozenmoat":
      return <FrozenMoatBurst lead={lead} delayMs={delayMs} />;
    case "meteorstorm":
      return <MeteorStormBurst lead={lead} delayMs={delayMs} />;
    case "phoenixrise":
      return <PhoenixRiseBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 8 (flavor pass) ---
    case "detonate":
      return <DetonateBurst lead={lead} delayMs={delayMs} />;
    case "cinderstrike":
      return <CinderStrikeBurst delayMs={delayMs} />;
    case "purgestorm":
      return <PurgeStormBurst lead={lead} delayMs={delayMs} />;
    case "roulette":
      return <RouletteBurst lead={lead} delayMs={delayMs} />;
    case "purgeline":
      return <PurgeLineBurst lead={lead} delayMs={delayMs} />;
    case "calldown":
      return <CalldownBurst lead={lead} delayMs={delayMs} />;
    case "annihilation":
      return <AnnihilationBurst lead={lead} delayMs={delayMs} />;
    case "meteorcross":
      return <MeteorCrossBurst lead={lead} delayMs={delayMs} />;
    case "purgerealm":
      return <PurgeRealmBurst lead={lead} delayMs={delayMs} />;
    case "ruin":
      return <RuinBurst lead={lead} delayMs={delayMs} />;
    case "bannerwar":
      return <BannerWarBurst lead={lead} delayMs={delayMs} />;
    case "iceage":
      return <IceAgeBurst lead={lead} delayMs={delayMs} />;
    case "worldend":
      return <WorldEndBurst lead={lead} delayMs={delayMs} />;
    case "rustlock":
      return <RustLockBurst lead={lead} delayMs={delayMs} />;
    case "masspetrify":
      return <MassPetrifyBurst lead={lead} delayMs={delayMs} />;
    case "walnutcurse":
      return <WalnutCurseBurst lead={lead} delayMs={delayMs} />;
    case "amazoncrown":
      return <AmazonCrownBurst lead={lead} delayMs={delayMs} />;
    case "titanlegion":
      return <TitanLegionBurst lead={lead} delayMs={delayMs} />;
    case "livinggod":
      return <LivingGodBurst lead={lead} delayMs={delayMs} />;
    case "eternalreign":
      return <EternalReignBurst lead={lead} delayMs={delayMs} />;
    case "godslayer":
      return <GodslayerBurst lead={lead} delayMs={delayMs} />;
    case "onslaught":
      return <OnslaughtBurst lead={lead} delayMs={delayMs} />;
    case "resurrection":
      return <ResurrectionBurst lead={lead} delayMs={delayMs} />;
    case "grandrevive":
      return <GrandReviveBurst lead={lead} delayMs={delayMs} />;
    case "ironlegion":
      return <IronLegionBurst lead={lead} delayMs={delayMs} />;
    case "secondcoming":
      return <SecondComingBurst lead={lead} delayMs={delayMs} />;
    case "lavafloor":
      return <LavaFloorBurst lead={lead} delayMs={delayMs} />;
    case "necromancer":
      return <NecromancerBurst lead={lead} delayMs={delayMs} />;
    case "werewolf":
      return <WerewolfBurst lead={lead} delayMs={delayMs} />;
    case "lastmeal":
      return <LastMealBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 9 (thematic character-matched signatures) ---
    case "crocbomber":
      return <CrocBomberBurst lead={lead} delayMs={delayMs} />;
    case "sharkdash":
      return <SharkDashBurst lead={lead} delayMs={delayMs} />;
    case "goosebomb":
      return <GooseBombBurst lead={lead} delayMs={delayMs} />;
    case "clockelephant":
      return <ClockElephantBurst lead={lead} delayMs={delayMs} />;
    case "coldsnap":
      return <ColdSnapBurst lead={lead} delayMs={delayMs} />;
    case "bananape":
      return <BananApeBurst lead={lead} delayMs={delayMs} />;
    case "tirefrog":
      return <TireFrogBurst lead={lead} delayMs={delayMs} />;
    case "oblivionwipe":
      return <OblivionBurst lead={lead} delayMs={delayMs} />;
    case "bloodpact":
      return <BloodPactBurst lead={lead} delayMs={delayMs} />;
    case "regicideblade":
      return <RegicideBurst lead={lead} delayMs={delayMs} />;
    case "divineright":
      return <DivineRightBurst lead={lead} delayMs={delayMs} />;
    case "ascendancy":
      return <AscendancyBurst lead={lead} delayMs={delayMs} />;
    case "mandate":
      return <MandateBurst lead={lead} delayMs={delayMs} />;
    case "blackout":
      return <BlackoutBurst lead={lead} delayMs={delayMs} />;
    case "griffoncarry":
      return <GriffonCarryBurst lead={lead} delayMs={delayMs} />;
    case "grandarmy":
      return <GrandArmyBurst lead={lead} delayMs={delayMs} />;
    case "mortgagesign":
      return <MortgageBurst lead={lead} delayMs={delayMs} />;
    case "reporook":
      return <RepoRookBurst lead={lead} delayMs={delayMs} />;
    case "musicalchairs":
      return <MusicalChairsBurst lead={lead} delayMs={delayMs} />;
    case "devildeal":
      return <DevilDealBurst lead={lead} delayMs={delayMs} />;
    case "berserkrage":
      return <BerserkBurst lead={lead} delayMs={delayMs} />;
    case "encase":
      return <EncaseBurst delayMs={delayMs} />;
    case "snowballsplat":
      return <SnowballBurst lead={lead} delayMs={delayMs} />;
    case "galephase":
      return <GalePhaseBurst delayMs={delayMs} />;
    case "oppositeday":
      return <OppositeDayBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 10 (board-wide virus + gambling wheels + drum-man + funnies) ---
    case "virusspread":
      return <VirusSpreadBurst lead={lead} delayMs={delayMs} />;
    case "fortunewheel":
      return <FortuneWheelBurst lead={lead} delayMs={delayMs} />;
    case "slotmachine":
      return <SlotMachineBurst lead={lead} delayMs={delayMs} />;
    case "coinflip":
      return <CoinFlipBurst lead={lead} delayMs={delayMs} />;
    case "drumbonk":
      return <DrumBonkBurst lead={lead} delayMs={delayMs} />;
    case "rakebonk":
      return <RakeBonkBurst lead={lead} delayMs={delayMs} />;
    case "flyswat":
      return <FlySwatBurst delayMs={delayMs} />;
    case "sleepcap":
      return <SleepCapBurst delayMs={delayMs} />;
    case "superglue":
      return <SuperGlueBurst lead={lead} delayMs={delayMs} />;
    case "beartrap":
      return <BearTrapBurst delayMs={delayMs} />;
    case "anvildrop":
      return <AnvilDropBurst lead={lead} delayMs={delayMs} />;
    case "boxingglove":
      return <BoxingGloveBurst lead={lead} delayMs={delayMs} />;
    case "bubblewrap":
      return <BubbleWrapBurst lead={lead} delayMs={delayMs} />;
    case "vertigo":
      return <VertigoBurst lead={lead} delayMs={delayMs} />;
    case "origami":
      return <OrigamiBurst delayMs={delayMs} />;
    case "gremlins":
      return <GremlinsBurst delayMs={delayMs} />;
    case "homesick":
      return <HomesickBurst lead={lead} delayMs={delayMs} />;
    case "jetlag":
      return <JetLagBurst lead={lead} delayMs={delayMs} />;
    case "hillflag":
      return <HillFlagBurst lead={lead} delayMs={delayMs} />;
    case "sugarrush":
      return <SugarRushBurst lead={lead} delayMs={delayMs} />;
    case "totalwar":
      return <TotalWarBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 11 (fantasy & meta spectacles) ---
    case "sinkhole":
      return <SinkholeBurst lead={lead} delayMs={delayMs} />;
    case "fissurefield":
      return <FissureFieldBurst lead={lead} delayMs={delayMs} />;
    case "dominionorb":
      return <DominionOrbBurst lead={lead} delayMs={delayMs} />;
    case "phylactery":
      return <PhylacteryBurst lead={lead} delayMs={delayMs} />;
    case "metamorph":
      return <MetamorphosisBurst lead={lead} delayMs={delayMs} />;
    case "godhood":
      return <ApotheosisBurst lead={lead} delayMs={delayMs} />;
    case "transmute":
      return <TransmuteBurst lead={lead} delayMs={delayMs} />;
    case "queenshackle":
      return <ShackleQueenBurst lead={lead} delayMs={delayMs} />;
    case "frailty":
      return <FrailtyBurst lead={lead} delayMs={delayMs} />;
    case "doomtide":
      return <DoomTideBurst lead={lead} delayMs={delayMs} />;
    case "deadlineclock":
      return <DeadlineBurst lead={lead} delayMs={delayMs} />;
    case "whistleblast":
      return <WhistleBurst lead={lead} delayMs={delayMs} flag={false} />;
    case "timeoutflag":
      return <WhistleBurst lead={lead} delayMs={delayMs} flag={true} />;
    case "cashclock":
      return <CashClockBurst lead={lead} delayMs={delayMs} />;
    case "overclock":
      return <OverclockBurst lead={lead} delayMs={delayMs} />;
    case "allin":
      return <AllInBurst lead={lead} delayMs={delayMs} />;
    case "mysterybox":
      return <MysteryBoxBurst lead={lead} delayMs={delayMs} />;
    case "swapmeet":
      return <SwapMeetBurst lead={lead} delayMs={delayMs} />;
    case "goldtouch":
      return <GoldenTouchBurst lead={lead} delayMs={delayMs} />;
    case "outoffice":
      return <OutOfOfficeBurst delayMs={delayMs} />;
    case "sneeze":
      return <SneezeBurst lead={lead} delayMs={delayMs} />;
    case "tornado":
      return <TornadoBurst lead={lead} delayMs={delayMs} />;
    case "glassdome":
      return <GreenhouseBurst lead={lead} delayMs={delayMs} />;
    case "vhsrewind":
      return <GroundhogBurst lead={lead} delayMs={delayMs} />;
    case "hotpotato":
      return <HotPotatoBurst lead={lead} delayMs={delayMs} />;
    case "pinocchionose":
      return <PinocchioBurst lead={lead} delayMs={delayMs} />;
    case "seamonkeys":
      return <SeaMonkeysBurst lead={lead} delayMs={delayMs} />;
    case "snailslow":
      return <SnailBurst lead={lead} delayMs={delayMs} />;
    case "snoozebar":
      return <SnoozeButtonBurst lead={lead} delayMs={delayMs} />;
    case "stinkcloud":
      return <StinkBurst lead={lead} delayMs={delayMs} />;
    case "whoopee":
      return <WhoopeeBurst lead={lead} delayMs={delayMs} />;
    case "springtrap":
      return <SpringTrapBurst delayMs={delayMs} />;
    case "contagion":
      return <ContagionBurst lead={lead} delayMs={delayMs} />;
    case "fanclub":
      return <FanClubBurst lead={lead} delayMs={delayMs} />;
    case "gravitywell":
      return <GravityWellBurst lead={lead} delayMs={delayMs} />;
    case "magnetpull":
      return <MagnetBurst lead={lead} delayMs={delayMs} />;
    case "photosyn":
      return <PhotosynthesisBurst lead={lead} delayMs={delayMs} />;
    case "termitegnaw":
      return <TermitesBurst lead={lead} delayMs={delayMs} />;
    case "picketline":
      return <PicketLineBurst lead={lead} delayMs={delayMs} />;
    case "creampie":
      return <CreamPieBurst lead={lead} delayMs={delayMs} />;
    case "photocopy":
      return <PhotocopyBurst lead={lead} delayMs={delayMs} />;
    case "umbrella":
      return <UmbrellaBurst delayMs={delayMs} />;
    case "spotlight":
      return <SpotlightBurst lead={lead} delayMs={delayMs} />;
    case "internpop":
      return <InternBurst delayMs={delayMs} />;
    case "cratedrop":
      return <CrateDropBurst lead={lead} delayMs={delayMs} />;
    case "rentarook":
      return <RentARookBurst lead={lead} delayMs={delayMs} />;
    case "pizzarun":
      return <PizzaRunBurst lead={lead} delayMs={delayMs} />;
    // --- Batch 14 (tier 7+ distinctness splits) ---
    case "crownlegion":
      return <CrownLegionBurst lead={lead} delayMs={delayMs} />;
    case "agesward":
      return <AgesWardBurst lead={lead} delayMs={delayMs} />;
    case "dugin":
      return <DugInBurst lead={lead} delayMs={delayMs} />;
    case "chalkcircle":
      return <ChalkCircleBurst lead={lead} delayMs={delayMs} />;
    case "kingsmuster":
      return <KingsMusterBurst lead={lead} delayMs={delayMs} />;
    case "totalannihilation":
      return <TotalAnnihilationBurst lead={lead} delayMs={delayMs} />;
    case "voidrealm":
      return <VoidRealmBurst lead={lead} delayMs={delayMs} />;
    case "sanctrise":
      return <SanctRiseBurst lead={lead} delayMs={delayMs} />;
    // --- Gambling wheels (owner add-on) ---
    case "goldwheel":
      return <GoldWheelBurst lead={lead} delayMs={delayMs} />;
    case "gamblewheel":
      return <GambleWheelBurst lead={lead} delayMs={delayMs} />;
    case "zodiacwheel":
      return <ZodiacWheelBurst lead={lead} delayMs={delayMs} />;
    case "dicewheel":
      return <DiceWheelBurst lead={lead} delayMs={delayMs} />;
    case "runewheel":
      return <RuneWheelBurst lead={lead} delayMs={delayMs} />;
    default:
      // Plug-in visuals: `x:<key>` renders from the sigPlugins registry
      // (godPlays / funnyPlays modules). Anything else is a config bug.
      if (visual.startsWith("x:")) return renderPluginVisual(visual.slice(2), role, delayMs);
      return null;
  }
}

// --- Total War (tier-10 mythic): the board goes to war -----------------------
// Lead: THE FIST OF WAR apex set piece (see the branch below). Targets: each
// wiped square takes a battle-standard slash and a star burst, swept across
// the board in sequence.

function TotalWarBurst({ lead, delayMs }: { lead: boolean; delayMs: number }) {
  if (lead) {
    // APEX pass (tier 10) — THE FIST OF WAR (owner: "a big fist slamming down
    // on the chessboard"): the sky bars over like a war film, a COLOSSAL
    // armoured fist winds up above the board and SLAMS into the centre —
    // cracks flare across the ranks, every bystander piece is rattled clean
    // off its feet and tumbles aside, debris lobs out, and THREE concussion
    // rings roll past the edges before the fist grinds free and withdraws.
    return (
      <BoardWideStage>
        <BoardWash color="rgba(194,64,58,0.24)" delayMs={delayMs} />
        <Letterbox delayMs={delayMs} />
        {/* the war-drum tell: two concentric shock rims pulse IN over the
            impact point — the air tightens before the fist ever falls */}
        <span
          className="fx-sig-rimin absolute left-[38%] top-[44%] block h-[20%] w-[24%] rounded-full"
          style={{ border: "3px solid rgba(224,119,107,0.9)", animationDelay: `${delayMs}ms` }}
        />
        <span
          className="fx-sig-rimin absolute left-[32%] top-[39%] block h-[30%] w-[36%] rounded-full"
          style={{ border: "2px solid rgba(194,64,58,0.8)", animationDelay: `${delayMs + 90}ms` }}
        />
        {/* the colossal armoured fist, winding up and coming DOWN */}
        <span className="gp-fist absolute left-[36%] top-[18%] block h-[38%] w-[28%]" style={{ animationDelay: `${delayMs + 160}ms` }}>
          <svg viewBox="0 0 36 44" className="h-full w-full" aria-hidden="true">
            {/* riveted vambrace */}
            <path d="M10 0 H26 L25.2 10 H10.8 Z" fill="#7a2f28" stroke="#3a1512" strokeWidth="1" strokeLinejoin="round" />
            <path d="M11 3.5 H25 M11.3 6.5 H24.7" stroke="rgba(58,21,18,0.7)" strokeWidth="0.8" fill="none" />
            {/* the gauntleted fist */}
            <path d="M9 15 C9 11 12 9.5 18 9.5 C24 9.5 27 11 27 15 L27.5 30 C27.5 36.5 23.5 40.5 18 40.5 C12.5 40.5 8.5 36.5 8.5 30 Z" fill="#c2403a" stroke="#3a1512" strokeWidth="1.2" strokeLinejoin="round" />
            {/* knuckle plates */}
            <path d="M10.6 14.5 V23 M15.4 12.8 V23 M20.6 12.8 V23 M25.4 14.5 V23" stroke="rgba(58,21,18,0.8)" strokeWidth="0.9" fill="none" />
            {/* knuckle spikes */}
            <path d="M10.6 12.5 L9 7.5 L13 11 Z M15.4 11 L15 5.5 L18.2 10.4 Z M20.6 11 L21 5.5 L23.6 10.8 Z M25.4 12.5 L27 8 L23.4 11.4 Z" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.6" strokeLinejoin="round" />
            {/* the clamped thumb */}
            <path d="M27.5 19 C31.5 20 33.5 23 32.5 27 C31 29.5 29 30 27.5 29 Z" fill="#c2403a" stroke="#3a1512" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
        {/* IMPACT: flare + cracks spidering out under the knuckles */}
        <span
          className="gp-flash absolute left-[36%] top-[50%] block h-[16%] w-[28%] rounded-full"
          style={{ background: "rgba(255,181,168,0.85)", animationDelay: `${delayMs + 760}ms` }}
        />
        <span className="gp-crack absolute left-[29%] top-[42%] block h-[26%] w-[42%]" style={{ animationDelay: `${delayMs + 800}ms` }}>
          <svg viewBox="0 0 42 26" className="h-full w-full" aria-hidden="true">
            <path
              d="M21 13 L10 8 L4 10 M21 13 L8 18 L2 16 M21 13 L32 7 L39 9 M21 13 L34 18 L40 15 M21 13 L18 4 M21 13 L24 23"
              fill="none"
              stroke="rgba(58,21,18,0.9)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M21 13 L10 8 M21 13 L32 7 M21 13 L8 18 M21 13 L34 18" fill="none" stroke="rgba(255,181,168,0.8)" strokeWidth="0.6" />
          </svg>
        </span>
        {/* the bystanders, rattled clean off their feet */}
        {[
          { l: 26, t: 47, dx: "-90%", rot: "-24deg", d: 0, k: "pawn" as const },
          { l: 64, t: 45, dx: "110%", rot: "26deg", d: 40, k: "knight" as const },
          { l: 29, t: 57, dx: "-120%", rot: "-30deg", d: 80, k: "rook" as const },
          { l: 63, t: 57, dx: "100%", rot: "22deg", d: 60, k: "pawn" as const },
          { l: 45, t: 61, dx: "36%", rot: "14deg", d: 100, k: "bishop" as const },
        ].map((v, i) => (
          <span
            key={i}
            className="gp-rattle absolute block"
            style={
              {
                left: `${v.l}%`,
                top: `${v.t}%`,
                width: "5%",
                height: "8%",
                "--dx": v.dx,
                "--dy": "-130%",
                "--rot": v.rot,
                animationDelay: `${delayMs + 780 + v.d}ms`,
              } as React.CSSProperties
            }
          >
            <ApexPiece kind={v.k} fill="rgba(232,226,210,0.95)" stroke="#3a1512" />
          </span>
        ))}
        {/* debris + THREE concussion rings */}
        <ShardBurst vectors={BURST_BIG} fill="#e0776b" stroke="#5a1512" delayMs={delayMs + 820} sizePct={6} />
        {[0, 1, 2].map((i) => (
          <BoardBoom key={i} delayMs={delayMs + 840 + i * 170} color="rgba(224,119,107,0.85)" thickness={4 - i} />
        ))}
        {/* the settle: battlefield ash drifts off the crater... */}
        {[
          { l: 40, t: 46, d: 0 },
          { l: 52, t: 42, d: 130 },
          { l: 45, t: 52, d: 260 },
        ].map((a, i) => (
          <span
            key={`ash${i}`}
            className="fx-sig-ash absolute block rounded-full"
            style={{ left: `${a.l}%`, top: `${a.t}%`, width: "9%", height: "7%", background: "rgba(122,96,88,0.5)", animationDelay: `${delayMs + 1480 + a.d}ms` }}
          />
        ))}
        {/* ...and three torn battle-standard scraps flutter down after it */}
        {[
          { l: 37, t: 30, c: "#c2403a", d: 0 },
          { l: 50, t: 26, c: "#f4e9c8", d: 140 },
          { l: 60, t: 32, c: "#7a2f28", d: 260 },
        ].map((s, i) => (
          <span
            key={`scrap${i}`}
            className="fx-sig-scrapfall absolute block"
            style={{ left: `${s.l}%`, top: `${s.t}%`, width: "3.5%", height: "3%", animationDelay: `${delayMs + 1440 + s.d}ms` }}
          >
            <svg viewBox="0 0 12 10" className="h-full w-full" aria-hidden="true">
              <path d="M1 1 H11 L9 5 L11 9 H1 Z" fill={s.c} stroke="#3a1512" strokeWidth="0.8" strokeLinejoin="round" />
            </svg>
          </span>
        ))}
      </BoardWideStage>
    );
  }
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="fx-sig-slash absolute left-[8%] top-[16%] block h-[68%] w-[84%]"
        style={{ animationDelay: `${delayMs}ms` }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
          <path d="M4 36 L36 4" stroke="#f4e9c8" strokeWidth="3" strokeLinecap="round" />
          <path d="M4 36 L36 4" stroke="#c2403a" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="fx-sig-shock absolute inset-[14%] block rounded-full"
        style={{ border: "2px solid rgba(224,119,107,0.9)", animationDelay: `${delayMs + 90}ms` }}
      />
      <ShardBurst vectors={PIN_STARS} fill="#e0776b" stroke="#5a1512" delayMs={delayMs + 90} sizePct={9} />
    </span>
  );
}
