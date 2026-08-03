// Creator-card plugin signatures (src/engine/buffs/creators.ts). Same registry
// contract as the other plugin modules (see sigPlugins.tsx): self-contained
// render art, own CSS (creatorPlays.css), transform/opacity only, and NO import
// from BoardEffects.tsx (cycle hazard).
//
// Each scene follows the design brief's three-beat structure
// (docs/animation-design-brief.md): a tell of at most 300ms, then the strike,
// then a decaying settle. One-beat "pop and done" reads cheap, and these are the
// cards most likely to be screen-recorded and sent to the person they are named
// after, so they get the full treatment. Three colours per scene, warm whites,
// never pure #fff. Small text captions are allowed and used deliberately here:
// these five cards are catchphrase-shaped, and the caption IS the reference.
//
// ART AND THE DROP-IN SLOT. Every emblem below is drawn INLINE as original SVG:
// abstract marks in the game's own visual language, not portraits and not
// anybody's logo. CREATOR_ART is the drop-in slot the outreach doc promises: put
// a file at public/creators/<slug>.svg and add one line here, and that scene
// stars the image instead of the inline mark. Nothing needs to change in the
// engine, in Board, or in this module's structure. Deliberately EMPTY by default,
// because a channel logo is a third-party trademark and the repository should not
// carry one until a creator has said yes in writing.

import "./creatorPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";

/** Inline animation-delay: every choreography offset flows through this. */
const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/**
 * Optional creator-supplied artwork, card id -> public path.
 *
 * EMPTY ON PURPOSE. Add an entry only once the named creator has agreed in
 * writing to their art being used, then drop the file at that path. The scenes
 * below fall back to their inline original mark whenever an id is absent, so a
 * missing file can never break a play.
 */
export const CREATOR_ART: Record<string, string> = {};

/** The card's star: creator-supplied art when there is any, else the inline
 * original mark the scene passes in. */
function Star({ id, mark }: { id: string; mark: ReactNode }) {
  const src = CREATOR_ART[id];
  if (!src) return <>{mark}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="pointer-events-none h-full w-full select-none object-contain"
    />
  );
}

/* =============================================================================
   Shared staging (module-local, deliberately not imported from other modules)
   ========================================================================== */

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** The scene box: exactly the square (or board crop) the scene is anchored on.
 * Two of the five declare `anchor: "cast"` and play on the square they were
 * cast on; the three that change a rule for the whole game stay `"board"`. */
function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`cpl-stage ${className}`}>{children}</span>;
}

/* The entrance cut: the card arriving in a hand. Same palette and the same
 * central mark as the play, at ~56% of the crop, no board takeover. There is
 * deliberately NO shared Arrival component any more: each of the five scenes
 * carries its own bespoke entrance branch that echoes its play (the bait plays
 * dead, the rook slams in, the lamp blooms, the stopwatch skids, chat argues),
 * because one ring-opens-mark-steps-in template made all five look identical
 * at the exact moment the card is introduced. Only Settle is shared: every
 * entrance still ends on the same sinking afterglow the plays end on. */

/** The tell: a single dim-and-inhale beat under 300ms that every scene opens
 * with, so the strike always lands on something rather than out of nowhere. */
function Tell({ delayMs, hue }: { delayMs: number; hue: string }) {
  return <span className="cpl-tell" style={dv(delayMs, { "--cpl-hue": hue })} />;
}

/** The settle: a slow decaying afterglow that sinks toward the caster's edge
 * (--fx-side), so nothing ends on a hard cut. */
function Settle({ delayMs, hue }: { delayMs: number; hue: string }) {
  return <span className="cpl-settle" style={dv(delayMs, { "--cpl-hue": hue })} />;
}

/* =============================================================================
   Inline original marks. Abstract, in the game's own language, no likenesses.
   ========================================================================== */

/** A knight-shaped bait piece on a snare loop: obviously free, not free. */
const MARK_BAIT = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <circle cx="50" cy="56" r="38" fill="none" stroke="#bfe8c4" strokeWidth="3" opacity="0.7" />
    <path
      d="M38 74V62c-6-4-9-11-7-19 2-9 9-16 19-17l4-8 5 9c8 3 13 10 13 19 0 6-3 11-7 14v14z"
      fill="#fff4d6"
      opacity="0.92"
    />
    <circle cx="57" cy="35" r="2.6" fill="#1d3324" />
    <path d="M30 82h40" stroke="#bfe8c4" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
  </svg>
);

/** A rook tower, drawn big and proud. It is not a queen. It is BETTER. */
const MARK_ROOK = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <path
      d="M30 22h10v8h8v-8h8v8h8v-8h10v16l-6 6v26l6 8v8H30v-8l6-8V44l-6-6z"
      fill="#fff4d6"
      stroke="#4a1410"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M42 50h16M42 60h16" stroke="#ff6a5e" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/** Two open hands around a shared square: the truce. */
const MARK_HANDS = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <rect x="36" y="36" width="28" height="28" rx="2" fill="#fff4d6" opacity="0.9" />
    <path d="M12 50c8-14 14-18 20-18v36c-6 0-12-4-20-18z" fill="#a8d8c0" opacity="0.85" />
    <path d="M88 50c-8-14-14-18-20-18v36c6 0 12-4 20-18z" fill="#a8d8c0" opacity="0.85" />
  </svg>
);

/** A split timer mid-run: the needle sprints, the split arrow points up-green. */
const MARK_TIMER = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <circle cx="50" cy="56" r="32" fill="none" stroke="#fff4d6" strokeWidth="4" opacity="0.85" />
    <path d="M44 16h12M50 16v8" stroke="#fff4d6" strokeWidth="5" strokeLinecap="round" />
    <path d="M50 56L68 42" stroke="#7ef29a" strokeWidth="5" strokeLinecap="round" />
    <path d="M76 74l8-10 4 12" fill="none" stroke="#7ef29a" strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="56" r="5" fill="#7ef29a" />
  </svg>
);

/** A chat bubble, mid-argument. */
const MARK_CHAT = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <path
      d="M16 22h68a6 6 0 0 1 6 6v38a6 6 0 0 1-6 6H46L28 86V72h-12a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z"
      fill="#8fa8e0"
      stroke="#1c2440"
      strokeWidth="3"
    />
    <path d="M34 44h32M34 56h20" stroke="#fff4d6" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

/* =============================================================================
   The five scenes
   ========================================================================== */

/** ROSEN'S STAFFORD TRAP. Tell: the square dims sage-green. Strike: the bait
 * piece tips over in slow motion ("oh no..." drifts up beside it) and lies
 * still just long enough to look dead. Then it SPRINGS upright, the snare ring
 * snaps shut and two rope bands whip across whoever was reaching for it.
 * Settle: the green afterglow sinks home. */
function StaffordTrapScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    // The con in miniature: the bait tips in from the caster's own side
    // looking perfectly innocent and lies still a beat (tell), the snare ring
    // SNAPS shut around it with one rope whip (strike), and it springs
    // upright with a small smug bounce while the green afterglow sinks
    // (settle). All three acts live in the mark's own keyframes.
    return (
      <Stage className="cpl-etrap">
        <span className="cpl-etrap-mark" style={d(delayMs)}>
          <Star id="cr_stalling_bishop" mark={MARK_BAIT} />
        </span>
        <span className="cpl-etrap-ring" style={d(delayMs + 640)} />
        <span className="cpl-etrap-rope" style={d(delayMs + 700)} />
        <Settle delayMs={delayMs + 940} hue="191 232 196" />
      </Stage>
    );
  }
  return (
    <Stage className="cpl-trap">
      <Tell delayMs={delayMs} hue="191 232 196" />
      <span className="cpl-trap-star" style={d(delayMs + 240)}>
        <Star id="cr_stalling_bishop" mark={MARK_BAIT} />
      </span>
      <span className="cpl-trap-caption" style={d(delayMs + 300)}>
        oh no...
      </span>
      <span className="cpl-trap-ring" style={d(delayMs + 900)} />
      <span className="cpl-trap-rope cpl-trap-rope-a" style={d(delayMs + 980)} />
      <span className="cpl-trap-rope cpl-trap-rope-b" style={d(delayMs + 1060)} />
      <Settle delayMs={delayMs + 1400} hue="191 232 196" />
    </Stage>
  );
}

/** GOTHAM'S THE ROOK!! Tell: a red charge-up glow. Strike: the rook grows to
 * about twice its size, then SLAMS forward toward the enemy side (--fx-side
 * keeps "forward" honest for both seats) behind three speed streaks, the whole
 * stage jolting on the impact while "THE ROOK!!!" stamps in over it. Settle:
 * the gold impact flash decays. */
function TheRookScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    // The play's slam, hand-sized: a red charge-up glow (tell), then the rook
    // SLAMS in from the caster's own side behind three speed streaks with a
    // stage jolt on contact (strike), "THE ROOK!!!" stamps in small, and the
    // gold impact flash decays into the settle.
    return (
      <Stage className="cpl-erook">
        <span className="cpl-erook-charge" style={d(delayMs)} />
        <span className="cpl-erook-jolt" style={d(delayMs + 470)}>
          <span className="cpl-erook-mark" style={d(delayMs + 240)}>
            <Star id="cr_oh_no_my_queen" mark={MARK_ROOK} />
          </span>
        </span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="cpl-erook-streak"
            style={dv(delayMs + 280 + i * 50, { "--cpl-x": `${36 + i * 14}%` })}
          />
        ))}
        <span className="cpl-erook-flash" style={d(delayMs + 500)} />
        <span className="cpl-erook-caption" style={d(delayMs + 540)}>
          THE ROOK!!!
        </span>
        <Settle delayMs={delayMs + 860} hue="255 215 106" />
      </Stage>
    );
  }
  return (
    <Stage className="cpl-rook">
      <Tell delayMs={delayMs} hue="255 106 94" />
      <span className="cpl-rook-jolt" style={d(delayMs + 520)}>
        <span className="cpl-rook-star" style={d(delayMs + 260)}>
          <Star id="cr_oh_no_my_queen" mark={MARK_ROOK} />
        </span>
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="cpl-rook-streak"
          style={dv(delayMs + 420 + i * 55, { "--cpl-x": `${38 + i * 12}%` })}
        />
      ))}
      <span className="cpl-rook-flash" style={d(delayMs + 560)} />
      <span className="cpl-rook-caption" style={d(delayMs + 480)}>
        THE ROOK!!!
      </span>
      <Settle delayMs={delayMs + 1050} hue="255 215 106" />
    </Stage>
  );
}

/** CRAMLING FAMILY NIGHT. Tell: the board warms. Strike: a lamp blooms into a
 * cozy vignette, a table strip settles in on the caster's side of the stage
 * (--fx-side), and both card fans flip face UP onto it while two wisps of tea
 * steam curl off the edge. Settle: the lamp light lingers; nobody is hiding
 * anything and nobody is fighting. No aggression colours anywhere. */
function FamilyNightScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    // Cozy and zero aggression, like the play: a lamp glow blooms down from
    // above (tell), the hands warm in while two tiny cards flip face up
    // beside them (strike), one wisp of tea steam curls off and the lamplight
    // lingers into the settle.
    return (
      <Stage className="cpl-efam">
        <span className="cpl-efam-lamp" style={d(delayMs)} />
        <span className="cpl-efam-mark" style={d(delayMs + 280)}>
          <Star id="cr_family_game_night" mark={MARK_HANDS} />
        </span>
        <span className="cpl-efam-card cpl-efam-card-l" style={d(delayMs + 470)} />
        <span className="cpl-efam-card cpl-efam-card-r" style={d(delayMs + 560)} />
        <span className="cpl-efam-steam" style={d(delayMs + 700)} />
        <Settle delayMs={delayMs + 920} hue="255 214 150" />
      </Stage>
    );
  }
  return (
    <Stage className="cpl-fam">
      <Tell delayMs={delayMs} hue="255 214 150" />
      <span className="cpl-fam-lamp" style={d(delayMs + 200)} />
      <span className="cpl-fam-table" style={d(delayMs + 300)} />
      <span className="cpl-fam-star" style={d(delayMs + 340)}>
        <Star id="cr_family_game_night" mark={MARK_HANDS} />
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={`l${i}`}
          className="cpl-fam-card cpl-fam-card-l"
          style={dv(delayMs + 460 + i * 70, { "--cpl-r": `${-14 + i * 14}deg` })}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <span
          key={`r${i}`}
          className="cpl-fam-card cpl-fam-card-r"
          style={dv(delayMs + 500 + i * 70, { "--cpl-r": `${14 - i * 14}deg` })}
        />
      ))}
      <span className="cpl-fam-steam" style={dv(delayMs + 720, { "--cpl-x": "30%" })} />
      <span className="cpl-fam-steam" style={d(delayMs + 760)} />
      <Settle delayMs={delayMs + 1000} hue="255 214 150" />
    </Stage>
  );
}

/** DANYA'S SPEEDRUN. Tell: a short countdown dim. Strike: a split-timer rail
 * slides in along the board edge and four splits tick on one after another,
 * every one of them green (the run is AHEAD), while the stopwatch mark pins in
 * and two speed lines rake forward. Settle: the green pace-glow eases off; the
 * pressure does not. */
function SpeedrunScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    // The run starts NOW: a two-dip countdown dim (tell), the stopwatch
    // sprints in from the side behind two speed lines and pins with an
    // overshoot skid (strike), one green "-0:02" split ticks in beside it,
    // and the pace glow eases off (settle).
    return (
      <Stage className="cpl-erun">
        <span className="cpl-erun-dim" style={d(delayMs)} />
        <span className="cpl-erun-line" style={dv(delayMs + 300, { "--cpl-y": "32%" })} />
        <span className="cpl-erun-line" style={dv(delayMs + 360, { "--cpl-y": "66%" })} />
        <span className="cpl-erun-mark" style={d(delayMs + 260)}>
          <Star id="cr_speedrun_protocol" mark={MARK_TIMER} />
        </span>
        <span className="cpl-erun-split" style={d(delayMs + 640)}>
          -0:02
        </span>
        <Settle delayMs={delayMs + 880} hue="126 242 154" />
      </Stage>
    );
  }
  return (
    <Stage className="cpl-run">
      <Tell delayMs={delayMs} hue="126 242 154" />
      <span className="cpl-run-rail" style={d(delayMs + 220)} />
      {["-0:02", "-0:03", "-0:04", "-0:05"].map((split, i) => (
        <span
          key={split}
          className="cpl-run-split"
          style={dv(delayMs + 340 + i * 110, { "--cpl-y": `${20 + i * 15}%` })}
        >
          {split}
        </span>
      ))}
      <span className="cpl-run-star" style={d(delayMs + 300)}>
        <Star id="cr_speedrun_protocol" mark={MARK_TIMER} />
      </span>
      <span className="cpl-run-line" style={dv(delayMs + 640, { "--cpl-y": "30%" })} />
      <span className="cpl-run-line" style={dv(delayMs + 700, { "--cpl-y": "64%" })} />
      <Settle delayMs={delayMs + 1100} hue="126 242 154" />
    </Stage>
  );
}

/** CHAT PICKS: CREATOR VS CHAT. Tell: the stage cools chat-blue. Strike: chat
 * scrolls past arguing, TWO option cards rise side by side, and the picker ring
 * rattles between them before slamming onto one; the loser dims. "CHAT DECIDES"
 * stamps under the bubble mark. Settle: the blue washes out toward the caster
 * who has only themselves (and chat) to blame. */
function CreatorVsChatScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    // Chat was already arguing before the card arrived: three chat lines
    // scroll up behind (tell), the bubble pops in with an argumentative
    // wobble (strike), the picker ring rattles left-right twice and locks
    // onto the bubble, and the blue washes out (settle).
    return (
      <Stage className="cpl-evs">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="cpl-evs-line"
            style={dv(delayMs + i * 90, { "--cpl-y": `${76 - i * 10}%`, "--cpl-w": `${26 + i * 12}%` })}
          />
        ))}
        <span className="cpl-evs-mark" style={d(delayMs + 300)}>
          <Star id="cr_chat_picks" mark={MARK_CHAT} />
        </span>
        <span className="cpl-evs-ring" style={d(delayMs + 620)} />
        <Settle delayMs={delayMs + 960} hue="143 168 224" />
      </Stage>
    );
  }
  return (
    <Stage className="cpl-vs">
      <Tell delayMs={delayMs} hue="143 168 224" />
      <span className="cpl-vs-star" style={d(delayMs + 240)}>
        <Star id="cr_chat_picks" mark={MARK_CHAT} />
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="cpl-vs-line"
          style={dv(delayMs + 300 + i * 80, { "--cpl-y": `${74 - i * 9}%`, "--cpl-w": `${30 + i * 10}%` })}
        />
      ))}
      <span className="cpl-vs-opt cpl-vs-opt-a" style={d(delayMs + 380)} />
      <span className="cpl-vs-opt cpl-vs-opt-b" style={d(delayMs + 440)} />
      <span className="cpl-vs-pick" style={d(delayMs + 640)} />
      <span className="cpl-vs-caption" style={d(delayMs + 700)}>
        CHAT DECIDES
      </span>
      <Settle delayMs={delayMs + 1150} hue="143 168 224" />
    </Stage>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  cr_stalling_bishop: {
    config: { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "aegis", anchor: "cast" },
    Render: StaffordTrapScene,
  },
  cr_oh_no_my_queen: {
    config: { ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "coronation", anchor: "cast" },
    Render: TheRookScene,
  },
  cr_family_game_night: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" },
    Render: FamilyNightScene,
  },
  cr_speedrun_protocol: {
    config: { ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "blitz", anchor: "board" },
    Render: SpeedrunScene,
  },
  cr_chat_picks: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coinflip", anchor: "board" },
    Render: CreatorVsChatScene,
  },
};
