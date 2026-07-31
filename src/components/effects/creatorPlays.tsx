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
// never pure #fff.
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

/** The scene box: exactly the square the scene is anchored on.
 *
 * Every scene here is composed inside ONE cell (`inset: 0`), so it carries no
 * board-scale layer at all and nothing has to move into a `BoardFrame` when a
 * card stops being board-centred. Four of the five now declare `anchor:
 * "cast"` and play on the square they were cast on; only the one that changes
 * a rule for the whole board stays `"board"`. */
function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`cpl-stage ${className}`}>{children}</span>;
}

/** The entrance cut: the card arriving in a hand. Same palette and the same
 * central mark as the play, at ~56% of the crop, no board takeover — the mark
 * steps in from the caster's own side (--fx-side, in @keyframes cpl-arrive)
 * and one ring opens behind it. */
function Arrival({
  delayMs,
  hue,
  children,
}: {
  delayMs: number;
  hue: string;
  children: ReactNode;
}) {
  return (
    <Stage className="cpl-arrival">
      <span className="cpl-arrive-ring" style={dv(delayMs + 40, { "--cpl-hue": hue })} />
      <span className="cpl-arrive-mark" style={d(delayMs + 160)}>
        {children}
      </span>
      <Settle delayMs={delayMs + 520} hue={hue} />
    </Stage>
  );
}

/** The tell: a single dim-and-inhale beat under 300ms that every scene opens
 * with, so the strike always lands on something rather than out of nowhere. */
function Tell({ delayMs, hue }: { delayMs: number; hue: string }) {
  return <span className="cpl-tell" style={dv(delayMs, { "--cpl-hue": hue })} />;
}

/** The settle: a slow decaying afterglow, so nothing ends on a hard cut. */
function Settle({ delayMs, hue }: { delayMs: number; hue: string }) {
  return <span className="cpl-settle" style={dv(delayMs, { "--cpl-hue": hue })} />;
}

/* =============================================================================
   Inline original marks. Abstract, in the game's own language, no likenesses.
   ========================================================================== */

/** A bishop mitre inside a closed ring: the piece that will not die and will
 * not kill. */
const MARK_BISHOP = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <circle cx="50" cy="50" r="42" fill="none" stroke="#fff4d6" strokeWidth="3" opacity="0.85" />
    <path
      d="M50 22c8 9 14 16 14 24 0 8-6 13-14 13s-14-5-14-13c0-8 6-15 14-24z"
      fill="#fff4d6"
      opacity="0.92"
    />
    <path d="M42 62h16l4 14H38z" fill="#fff4d6" opacity="0.7" />
    <path d="M44 30h12" stroke="#2b2118" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** A crown knocked off its axis, caught before it falls. */
const MARK_CROWN = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <path
      d="M18 66l6-34 14 16 12-22 12 22 14-16 6 34z"
      fill="#ffd76a"
      stroke="#4a3410"
      strokeWidth="3"
    />
    <rect x="18" y="66" width="64" height="10" rx="1" fill="#ffe9b0" stroke="#4a3410" strokeWidth="3" />
    <circle cx="50" cy="20" r="5" fill="#fff4d6" />
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

/** A speed gauge pinned past its limit. */
const MARK_GAUGE = (
  <svg viewBox="0 0 100 100" className="cpl-mark" aria-hidden="true">
    <path d="M14 66a36 36 0 0 1 72 0" fill="none" stroke="#fff4d6" strokeWidth="5" opacity="0.5" />
    <path d="M62 66a36 36 0 0 1 24 0" fill="none" stroke="#ff8a34" strokeWidth="6" />
    <path d="M50 66L74 40" stroke="#ff8a34" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="66" r="6" fill="#fff4d6" />
  </svg>
);

/** A chat bubble with a hand reaching out of it. */
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

/** THE STALLING BISHOP. Tell: the board dims and a ring inhales. Strike: the
 * ring SLAMS shut around the mitre and two crossed bars snap over it (cannot be
 * taken, cannot take). Settle: the ring breathes once, and stays. */
function StallingBishopScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} hue="200 220 255">
        <Star id="cr_stalling_bishop" mark={MARK_BISHOP} />
      </Arrival>
    );
  }
  return (
    <Stage className="cpl-bishop">
      <Tell delayMs={delayMs} hue="200 220 255" />
      <span className="cpl-bishop-ring" style={d(delayMs + 240)} />
      <span className="cpl-bishop-star" style={d(delayMs + 300)}>
        <Star id="cr_stalling_bishop" mark={MARK_BISHOP} />
      </span>
      <span className="cpl-bishop-bar cpl-bishop-bar-a" style={d(delayMs + 380)} />
      <span className="cpl-bishop-bar cpl-bishop-bar-b" style={d(delayMs + 440)} />
      <Settle delayMs={delayMs + 900} hue="200 220 255" />
    </Stage>
  );
}

/** OH NO MY QUEEN. Tell: a red panic flash and a downward shadow. Strike: the
 * crown is YANKED across the stage on an arc while four shock-pips fire out at
 * the frozen attackers. Settle: gold dust drifts, and a clock pip ticks up. */
function OhNoMyQueenScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} hue="255 215 106">
        <Star id="cr_oh_no_my_queen" mark={MARK_CROWN} />
      </Arrival>
    );
  }
  return (
    <Stage className="cpl-queen">
      <Tell delayMs={delayMs} hue="255 120 96" />
      <span className="cpl-queen-panic" style={d(delayMs + 60)} />
      <span className="cpl-queen-star" style={d(delayMs + 260)}>
        <Star id="cr_oh_no_my_queen" mark={MARK_CROWN} />
      </span>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="cpl-queen-pip"
          style={dv(delayMs + 420 + i * 55, { "--cpl-a": `${i * 90 + 45}deg` })}
        />
      ))}
      <span className="cpl-queen-tick" style={d(delayMs + 700)} />
      <Settle delayMs={delayMs + 760} hue="255 215 106" />
    </Stage>
  );
}

/** FAMILY GAME NIGHT. Tell: the stage warms. Strike: two hands close in from the
 * edges and a lamp blooms over the shared square, then both card fans flip face
 * up. Settle: the warm glow lingers, nobody is hiding anything. */
function FamilyGameNightScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} hue="255 214 150">
        <Star id="cr_family_game_night" mark={MARK_HANDS} />
      </Arrival>
    );
  }
  return (
    <Stage className="cpl-family">
      <Tell delayMs={delayMs} hue="255 214 150" />
      <span className="cpl-family-lamp" style={d(delayMs + 220)} />
      <span className="cpl-family-star" style={d(delayMs + 280)}>
        <Star id="cr_family_game_night" mark={MARK_HANDS} />
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={`l${i}`}
          className="cpl-family-card cpl-family-card-l"
          style={dv(delayMs + 420 + i * 70, { "--cpl-r": `${-14 + i * 14}deg` })}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <span
          key={`r${i}`}
          className="cpl-family-card cpl-family-card-r"
          style={dv(delayMs + 460 + i * 70, { "--cpl-r": `${14 - i * 14}deg` })}
        />
      ))}
      <Settle delayMs={delayMs + 820} hue="255 214 150" />
    </Stage>
  );
}

/** SPEEDRUN PROTOCOL. Tell: a single countdown pip. Strike: six speed lines rake
 * across the board in a tight stagger while the gauge needle pins over. Settle:
 * the lines thin out to a steady pulse, the pressure is still on. */
function SpeedrunProtocolScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} hue="255 138 52">
        <Star id="cr_speedrun_protocol" mark={MARK_GAUGE} />
      </Arrival>
    );
  }
  return (
    <Stage className="cpl-speed">
      <Tell delayMs={delayMs} hue="255 138 52" />
      {/* the countdown pip: the one beat of anticipation before the rake */}
      <span className="cpl-speed-pip" style={d(delayMs + 140)} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="cpl-speed-line"
          style={dv(delayMs + 200 + i * 45, { "--cpl-y": `${12 + i * 14}%` })}
        />
      ))}
      <span className="cpl-speed-star" style={d(delayMs + 300)}>
        <Star id="cr_speedrun_protocol" mark={MARK_GAUGE} />
      </span>
      <span className="cpl-speed-pulse" style={d(delayMs + 640)} />
      <Settle delayMs={delayMs + 880} hue="255 138 52" />
    </Stage>
  );
}

/** CHAT PICKS. Tell: the stage cools and a cursor blinks. Strike: three chat
 * lines scroll up fast, then ONE of them is seized and stamped over the board.
 * Settle: the stamp's ink bleeds out and fades. */
function ChatPicksScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Arrival delayMs={delayMs} hue="143 168 224">
        <Star id="cr_chat_picks" mark={MARK_CHAT} />
      </Arrival>
    );
  }
  return (
    <Stage className="cpl-chat">
      <Tell delayMs={delayMs} hue="143 168 224" />
      {/* the cursor blinks first: chat is about to say something */}
      <span className="cpl-chat-cursor" style={d(delayMs + 150)} />
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="cpl-chat-line"
          style={dv(delayMs + 180 + i * 80, { "--cpl-y": `${58 - i * 12}%`, "--cpl-w": `${34 + i * 12}%` })}
        />
      ))}
      <span className="cpl-chat-star" style={d(delayMs + 420)}>
        <Star id="cr_chat_picks" mark={MARK_CHAT} />
      </span>
      <span className="cpl-chat-stamp" style={d(delayMs + 520)} />
      <Settle delayMs={delayMs + 880} hue="143 168 224" />
    </Stage>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  cr_stalling_bishop: {
    config: { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "aegis", anchor: "cast" },
    Render: StallingBishopScene,
  },
  cr_oh_no_my_queen: {
    config: { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "coronation", anchor: "board" },
    Render: OhNoMyQueenScene,
  },
  cr_family_game_night: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" },
    Render: FamilyGameNightScene,
  },
  cr_speedrun_protocol: {
    config: { ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "blitz", anchor: "board" },
    Render: SpeedrunProtocolScene,
  },
  cr_chat_picks: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coinflip", anchor: "board" },
    Render: ChatPicksScene,
  },
};
