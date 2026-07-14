// Inline SVG chess pieces (derived from public-domain Wikimedia Cburnett set, simplified).
import React from "react";
import type { CSSProperties } from "react";
import { Color, PieceType } from "@/engine/types";
import { motionOff, SETTINGS_CHANGED_EVENT } from "@/lib/settings";

interface Props {
  type: PieceType;
  color: Color;
  size?: number | string;
  className?: string;
  /** Render the merged queen+knight Amazon sprite instead of a plain queen.
   * Only honoured for queens (the Amazon card crowns a queen so she also moves
   * like a knight); ignored for every other piece. */
  amazon?: boolean;
  /** The piece type whose MOVEMENT this piece has been granted (CardFx.moveAs):
   * the piece renders as a fused HYBRID — its own body with the granted
   * piece's silhouette rising behind its shoulder — so an empowered piece
   * reads as a genuinely new piece, not a plain one with a badge (owner
   * request). A queen granted knight moves (or a knight granted queen moves)
   * renders the bespoke Amazon sprite; every other combination composes the
   * two Cburnett silhouettes. Ignored when equal to `type`. */
  moveAs?: PieceType;
}

// Memoized so identical (type, color, size, className) props skip re-rendering.
// Without this, every premove update reflows every piece's SVG via
// dangerouslySetInnerHTML and the textures visibly flicker.
export const Piece = React.memo(function Piece({ type, color, size = 60, className = "", amazon = false, moveAs }: Props) {
  const grant = moveAs && moveAs !== type ? moveAs : undefined;
  // Queen+knight in either direction is the classic amazon: use the bespoke
  // fused sprite rather than the generic hybrid composition.
  const isAmazon =
    (amazon && type === "q") ||
    (grant === "n" && type === "q") ||
    (grant === "q" && type === "n");
  const isHybrid = !isAmazon && !!grant;
  const key = `${color}${type}`;
  const path = isAmazon
    ? AMAZON_PATHS[color]
    : isHybrid
      ? hybridPath(type, grant!, color)
      : PATHS[key];
  const style: CSSProperties = { width: size, height: size };
  const fancy = isAmazon || isHybrid;
  return (
    <span
      className={"piece-shell inline-grid place-items-center select-none " + className}
      style={style}
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${
        isAmazon ? "amazon" : isHybrid ? `${type} empowered with ${grant} movement` : type
      }`}
    >
      <svg
        viewBox="0 0 45 45"
        width="100%"
        height="100%"
        className="piece-inline"
        aria-hidden="true"
        // Image piece skins (data-piece-source="lichess") hide .piece-inline and
        // show the asset span instead. The Amazon and the fused hybrids have no
        // themed assets, so force their inline sprites visible under skins too.
        style={fancy ? { display: "block" } : undefined}
        dangerouslySetInnerHTML={{ __html: path }}
      />
      {/* Piece-theme image skins map to the base piece art; the Amazon and the
          hybrids are bespoke fairy sprites with no themed asset, so they render
          the inline SVG alone (a base-piece skin must not paint over them). */}
      {!fancy && (
        <span
          className="piece-asset"
          aria-hidden="true"
          style={{ backgroundImage: `var(--piece-${key}-image)` }}
        />
      )}
    </span>
  );
});

/** Fused hybrid sprite for a piece granted another piece's movement: the base
 * piece stands lower-left and the GRANTED piece rides the upper-right shoulder
 * as a prominent, fully-opaque second head — so a bishop that gained knight
 * movement reads unmistakably as an archbishop, a rook+knight as a chancellor,
 * and so on, instead of a faint crest peeking out behind. The granted head is
 * drawn on top and given a dark outline halo (a scaled dark underlay of the
 * same silhouette) so it separates cleanly on any square color. Both halves
 * draw from the same themed PATHS, so hybrids recolor with every piece theme. */
function hybridPath(type: PieceType, grant: PieceType, color: Color): string {
  const base = PATHS[`${color}${type}`];
  const crest = PATHS[`${color}${grant}`];
  return (
    // Base piece: a touch smaller, seated lower-left to make room.
    `<g transform="translate(-2,6) scale(0.78)">${base}</g>` +
    // Granted head: upper-right, drawn ON TOP, bigger than before (0.5 -> 0.62)
    // and fully opaque, so the fusion reads as a genuinely new piece. Both
    // halves carry the set's own 1.5 stroke, which keeps them separated where
    // they meet without an extra (paint-costly) halo.
    `<g transform="translate(19,-2) scale(0.62)">${crest}</g>`
  );
}

// A piece hexed into a walnut: entombed in a dark polished burl-wood shell
// veined with molten-gold kintsugi cracks that breathe light, the trapped
// piece glowing through a gold-lit hollow so you can still tell what got
// petrified. The shell wobbles like it is trying to crack itself open (see
// .walnut-piece in globals.css); the seams pulse via SMIL, gated on the
// animations-off setting like the trap markers below. Gradient ids are
// per-instance (useId) so many walnuts on one board never collide.
export const WalnutPiece = React.memo(function WalnutPiece({
  type,
  color,
  size = "100%",
}: {
  type: PieceType;
  color: Color;
  size?: number | string;
}) {
  const uid = React.useId().replace(/[:]/g, "");
  const body = `wn-body-${uid}`;
  const cav = `wn-cav-${uid}`;
  const vein = `wn-vein-${uid}`;
  const still = useReducedMotion();
  return (
    <span
      className="walnut-piece relative inline-grid place-items-center select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${color === "w" ? "White" : "Black"} ${type} hexed into a walnut`}
      title="Hexed into a walnut"
    >
      <svg viewBox="0 0 45 45" width="100%" height="100%" className="walnut-inline" aria-hidden="true">
        <defs>
          <radialGradient id={body} cx="38%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#6b4a28" />
            <stop offset="45%" stopColor="#3a2415" />
            <stop offset="100%" stopColor="#1c1008" />
          </radialGradient>
          <radialGradient id={cav} cx="50%" cy="38%" r="72%">
            <stop offset="0%" stopColor="#c98f2e" />
            <stop offset="55%" stopColor="#6e4a14" />
            <stop offset="100%" stopColor="#241304" />
          </radialGradient>
          <linearGradient id={vein} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="55%" stopColor="#ffd76a" />
            <stop offset="100%" stopColor="#c98f2e" />
          </linearGradient>
        </defs>
        {/* burl shell */}
        <path
          d="M22.5 4.5C31.3 4.5 38.5 11.8 38.5 23C38.5 34.4 31.2 41.5 22.5 41.5C13.8 41.5 6.5 34.4 6.5 23C6.5 11.8 13.7 4.5 22.5 4.5Z"
          fill={`url(#${body})`}
          stroke="#120a04"
          strokeWidth="1.3"
        />
        {/* burl figure: faint swirling grain in the dark wood */}
        <g fill="none" stroke="#7a5228" strokeWidth="0.9" strokeLinecap="round" opacity="0.45">
          <path d="M13 12.5C10.5 16 10 20.5 11.5 24.5" />
          <path d="M32 12.5C34.5 16 35 20.5 33.5 24.5" />
          <path d="M14 31C16 34.5 19 36.5 22.5 37" />
          <ellipse cx="14.5" cy="18.5" rx="2.4" ry="3.4" transform="rotate(-18 14.5 18.5)" />
          <ellipse cx="30.5" cy="18.5" rx="2.4" ry="3.4" transform="rotate(18 30.5 18.5)" />
        </g>
        {/* kintsugi: molten-gold cracks branching off the central seam */}
        <g
          fill="none"
          stroke={`url(#${vein})`}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 1.6px #ffd76a)" }}
        >
          <path d="M22.5 6C20.8 12 24 18 22.5 23.5C21 29 24.2 35 22.5 40" strokeWidth="1.5">
            {!still && (
              <animate attributeName="opacity" values="0.65;1;0.65" dur="2.6s" repeatCount="indefinite" />
            )}
          </path>
          <path d="M21.5 11.5C18 13.5 15.5 17 15 21.5M23.5 15C27 16.5 30 19.5 30.8 23.5M21.8 27.5C18.5 29 16.2 31.5 15.6 34.5" strokeWidth="1">
            {!still && (
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.6s" begin="0.7s" repeatCount="indefinite" />
            )}
          </path>
        </g>
        {/* polish highlight */}
        <ellipse cx="16" cy="12.5" rx="5.6" ry="3.4" fill="#ffffff" opacity="0.13" />
        {/* the gold-lit hollow the piece is sealed in */}
        <ellipse cx="22.5" cy="25.5" rx="8.2" ry="9" fill={`url(#${cav})`} stroke="#120a04" strokeWidth="0.8" opacity="0.96" />
      </svg>
      {/* the entombed original piece, lit from the gold below */}
      <span
        className="pointer-events-none absolute"
        style={{
          left: "50%",
          top: "56%",
          width: "40%",
          height: "40%",
          transform: "translate(-50%, -50%)",
          filter: "drop-shadow(0 0 3px rgba(255,215,106,0.55))",
        }}
      >
        <Piece type={type} color={color} size="100%" />
      </span>
    </span>
  );
});

// --- On-board placement markers (owner directive: every placed trap should
// have "a super realistic animation and icon" on its square) -------------------
// All markers below follow the WalnutPiece pattern: per-instance gradient ids,
// plump pseudo-3D shading, a soft ground shadow, and idle motion that is
// TRANSFORM/OPACITY ONLY. Idle loops are SMIL (<animate*> inside the SVG) so
// the markers stay self-contained; they are gated on the animations-off setting
// by the hook below, exactly like their CSS-animated neighbours (whose loops are
// cut by the global animations-off block in globals.css).

/** True when animations are turned off in Settings. SSR-safe (false on the
 * server, resolved on mount) and live (tracks the in-app setting). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const update = () => setReduced(motionOff());
    update();
    window.addEventListener(SETTINGS_CHANGED_EVENT, update);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, update);
  }, []);
  return reduced;
}

// A tossed banana peel, sitting on its square as a slip trap (see the Banana
// Peel item). Splayed three-frond peel with a warm yellow gradient, gloss and a
// ground shadow for a plump pseudo-3D look; it does a jaunty little shimmy (see
// .banana-peel in globals.css). Gradient ids are per-instance so several peels
// on one board never collide. Fidelity pass: stem nub, ripeness speckles,
// frond mid-ribs and a second gloss so it reads as a REAL peel, not an icon.
export const BananaPeel = React.memo(function BananaPeel() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `bp-${uid}`;
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe86b" />
          <stop offset="55%" stopColor="#f6c518" />
          <stop offset="100%" stopColor="#c07f0d" />
        </linearGradient>
        <linearGradient id={`${g}-in`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7da" />
          <stop offset="100%" stopColor="#efdfa0" />
        </linearGradient>
      </defs>
      {/* soft double ground shadow (contact + ambient) */}
      <ellipse cx="22.5" cy="37.5" rx="13" ry="3.1" fill="#000000" opacity="0.18" />
      <ellipse cx="22.5" cy="36.8" rx="8" ry="2" fill="#000000" opacity="0.14" />
      <g stroke="#8a5c0c" strokeWidth="1" strokeLinejoin="round">
        {/* left + right outer fronds */}
        <path d="M22.5 33C14 31 8 24 7 15C10.5 13.8 13.5 15.2 15.3 19C17.2 23.8 20 28.8 24 31.8Z" fill={`url(#${g})`} />
        <path d="M22.5 33C31 31 37 24 38 15C34.5 13.8 31.5 15.2 29.7 19C27.8 23.8 25 28.8 21 31.8Z" fill={`url(#${g})`} />
        {/* center frond, pale inner skin */}
        <path d="M22.5 33C20 24 21 15 22.5 7C24 15 25 24 22.5 33Z" fill={`url(#${g}-in)`} />
        {/* squashed base pulp */}
        <ellipse cx="22.5" cy="33" rx="4.6" ry="3" fill="#a06a12" />
      </g>
      {/* stem nub where it tore off the bunch */}
      <path d="M21.4 7.6 L22 4.6 C22.2 3.9 22.8 3.9 23 4.6 L23.6 7.6 Z" fill="#8a6a1a" stroke="#5c440e" strokeWidth="0.7" strokeLinejoin="round" />
      {/* frond mid-ribs */}
      <g fill="none" stroke="#b8912a" strokeWidth="0.7" strokeLinecap="round" opacity="0.8">
        <path d="M10.5 16.5C12.5 20.5 16 26 20.5 29.8" />
        <path d="M34.5 16.5C32.5 20.5 29 26 24.5 29.8" />
      </g>
      {/* inner-skin strands on the pale frond */}
      <g fill="none" stroke="#d8c078" strokeWidth="0.55" strokeLinecap="round" opacity="0.9">
        <path d="M21.7 12C21.2 18 21.6 25 22.2 30" />
        <path d="M23.3 12C23.8 18 23.4 25 22.8 30" />
      </g>
      {/* ripeness speckles */}
      <g fill="#7a5208" opacity="0.55">
        <ellipse cx="11.5" cy="18.5" rx="1" ry="0.6" transform="rotate(40 11.5 18.5)" />
        <ellipse cx="14.5" cy="23.5" rx="0.8" ry="0.5" transform="rotate(50 14.5 23.5)" />
        <ellipse cx="33" cy="19" rx="1" ry="0.6" transform="rotate(-40 33 19)" />
        <ellipse cx="30.5" cy="24.5" rx="0.7" ry="0.45" transform="rotate(-50 30.5 24.5)" />
        <ellipse cx="22.5" cy="10.5" rx="0.6" ry="0.4" />
      </g>
      {/* gloss streaks */}
      <path d="M12 17C13 21 16 26 19 29" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.42" />
      <path d="M33.5 17.5C32.5 21 30 25.5 27.5 28.2" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
});

/** A hidden whoopee cushion (Whoopee Cushion trap): a plump rose-pink rubber
 * bladder with a pleated nozzle, seam stitching and a rubbery sheen. It
 * subtly re-inflates and settles on a slow loop — biding its time. */
export const WhoopeeCushionMark = React.memo(function WhoopeeCushionMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `wc-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <radialGradient id={g} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff9db8" />
          <stop offset="55%" stopColor="#e8607f" />
          <stop offset="100%" stopColor="#9c2c46" />
        </radialGradient>
      </defs>
      <ellipse cx="22.5" cy="38" rx="14" ry="3" fill="#000000" opacity="0.18" />
      <g>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1; 1.035 1.05; 1 1; 1 0.985; 1 1"
            keyTimes="0; 0.18; 0.4; 0.55; 1"
            dur="3.4s"
            repeatCount="indefinite"
            additive="sum"
          />
        )}
        {/* body puddle (breathes around its base) */}
        <g transform="translate(0 0)" style={{ transformOrigin: "22.5px 34px" }}>
          <path
            d="M22.5 9 C33 9 40 17 40 25.5 C40 33 33 37.5 22.5 37.5 C12 37.5 5 33 5 25.5 C5 17 12 9 22.5 9 Z"
            fill={`url(#${g})`}
            stroke="#6e1c30"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* seam stitching around the rim */}
          <path
            d="M22.5 11.5 C31.5 11.5 37.5 18 37.5 25.5 C37.5 31.4 31.5 35 22.5 35 C13.5 35 7.5 31.4 7.5 25.5 C7.5 18 13.5 11.5 22.5 11.5 Z"
            fill="none"
            stroke="#ffc2d2"
            strokeWidth="0.7"
            strokeDasharray="1.6 1.8"
            opacity="0.85"
          />
          {/* the pleated nozzle flap */}
          <path d="M17 8.5 L28 8.5 L26.5 2.5 L18.5 2.5 Z" fill="#e8607f" stroke="#6e1c30" strokeWidth="1" strokeLinejoin="round" />
          <g stroke="#9c2c46" strokeWidth="0.8" strokeLinecap="round">
            <path d="M19.6 3 L19.2 8 M22.5 3 L22.5 8 M25.4 3 L25.8 8" />
          </g>
          <path d="M18.5 2.5 H26.5" stroke="#ffc2d2" strokeWidth="0.8" strokeLinecap="round" />
          {/* rubbery sheen */}
          <ellipse cx="16" cy="18" rx="5.5" ry="3.2" fill="#ffffff" opacity="0.28" transform="rotate(-18 16 18)" />
        </g>
      </g>
    </svg>
  );
});

/** A buried mine (Minefield / Claymore Line): a squat spiked naval mine, steel
 * plates, rivet band and Hertz horns, half-settled into the square with a
 * heartbeat-blink red arming light. */
export const MineMark = React.memo(function MineMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `mn-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <radialGradient id={g} cx="36%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#7a8494" />
          <stop offset="50%" stopColor="#454c58" />
          <stop offset="100%" stopColor="#1c2028" />
        </radialGradient>
      </defs>
      {/* disturbed-earth ring + shadow */}
      <ellipse cx="22.5" cy="37" rx="14" ry="3.4" fill="#000000" opacity="0.2" />
      <ellipse cx="22.5" cy="36.4" rx="15.5" ry="3.6" fill="none" stroke="#5c5138" strokeWidth="1" opacity="0.5" />
      {/* Hertz horns */}
      <g fill="#2e343e" stroke="#12151a" strokeWidth="0.9" strokeLinejoin="round">
        <path d="M21 8.5 L22.5 3 L24 8.5 Z" />
        <path d="M10.5 14.5 L6 11 L11.5 17.5 Z" />
        <path d="M34.5 14.5 L39 11 L33.5 17.5 Z" />
        <path d="M8.5 27 L3.5 28 L9 30.5 Z" />
        <path d="M36.5 27 L41.5 28 L36 30.5 Z" />
      </g>
      <g fill="#5c6470">
        <circle cx="22.5" cy="4.4" r="1.1" />
        <circle cx="7" cy="11.8" r="1" />
        <circle cx="38" cy="11.8" r="1" />
        <circle cx="4.6" cy="27.9" r="0.9" />
        <circle cx="40.4" cy="27.9" r="0.9" />
      </g>
      {/* the steel body, sunk to its waterline in the square */}
      <circle cx="22.5" cy="24" r="14" fill={`url(#${g})`} stroke="#12151a" strokeWidth="1.2" />
      {/* rivet band */}
      <path d="M9 21.5 C13 19 32 19 36 21.5" fill="none" stroke="#12151a" strokeWidth="1" opacity="0.8" />
      <path d="M9 26.5 C13 29 32 29 36 26.5" fill="none" stroke="#12151a" strokeWidth="1" opacity="0.8" />
      <g fill="#7a8494">
        <circle cx="12" cy="23.9" r="0.7" />
        <circle cx="17" cy="24.7" r="0.7" />
        <circle cx="22.5" cy="25" r="0.7" />
        <circle cx="28" cy="24.7" r="0.7" />
        <circle cx="33" cy="23.9" r="0.7" />
      </g>
      {/* top plate + arming light */}
      <circle cx="22.5" cy="13.5" r="3.6" fill="#2e343e" stroke="#12151a" strokeWidth="0.9" />
      <circle cx="22.5" cy="13.5" r="1.7" fill="#ff3b30">
        {!reduced && (
          <animate attributeName="opacity" values="0.25;1;1;0.25;0.25" keyTimes="0;0.06;0.14;0.24;1" dur="1.8s" repeatCount="indefinite" />
        )}
      </circle>
      {/* glass glint over the light */}
      <circle cx="21.8" cy="12.8" r="0.5" fill="#ffffff" opacity="0.85" />
      {/* steel sheen */}
      <ellipse cx="16.5" cy="17.5" rx="4.6" ry="2.6" fill="#ffffff" opacity="0.18" transform="rotate(-24 16.5 17.5)" />
    </svg>
  );
});

/** A rigged trapdoor (Trapdoor / Cataclysm placements): weathered oak planks
 * on a dark frame with strap hinges and an iron ring, creaking slightly ajar
 * every few seconds — the drop is armed. */
export const TrapdoorMark = React.memo(function TrapdoorMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `td-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a8804e" />
          <stop offset="55%" stopColor="#8a6438" />
          <stop offset="100%" stopColor="#5e401e" />
        </linearGradient>
      </defs>
      {/* the dark drop beneath (revealed as the hatch creaks) */}
      <rect x="7" y="7" width="31" height="31" rx="1.5" fill="#120c06" />
      {/* stone frame */}
      <rect x="5.5" y="5.5" width="34" height="34" rx="2" fill="none" stroke="#3a2c18" strokeWidth="3" />
      {/* the hatch: pivots on its top (hinge) edge — a slow creak-open loop */}
      <g style={{ transformOrigin: "22.5px 8px" }}>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1; 1 1; 1 0.93; 1 0.965; 1 0.93; 1 1; 1 1"
            keyTimes="0; 0.55; 0.63; 0.68; 0.74; 0.82; 1"
            dur="5.2s"
            repeatCount="indefinite"
            additive="sum"
          />
        )}
        {/* planks */}
        <rect x="7" y="7" width="31" height="31" rx="1" fill={`url(#${g})`} stroke="#3a2c18" strokeWidth="1" />
        <g stroke="#4e3418" strokeWidth="1" opacity="0.9">
          <path d="M14.8 7.5 V37.5 M22.5 7.5 V37.5 M30.2 7.5 V37.5" />
        </g>
        {/* wood grain */}
        <g stroke="#6e4c24" strokeWidth="0.55" fill="none" opacity="0.8">
          <path d="M9.5 13 C11 15 11 19 9.8 22 M17 26 C18.5 28 18.5 31 17.4 34 M24.6 11 C26 13.5 26 17 24.9 20 M32.4 24 C33.8 26.5 33.8 30 32.7 33" />
        </g>
        {/* strap hinges along the top edge */}
        <g fill="#2a2d33" stroke="#101216" strokeWidth="0.8" strokeLinejoin="round">
          <path d="M10 7.5 H16 L14.5 13.5 H11.5 Z" />
          <path d="M29 7.5 H35 L33.5 13.5 H30.5 Z" />
        </g>
        <g fill="#6a707c">
          <circle cx="13" cy="9.5" r="0.8" />
          <circle cx="32" cy="9.5" r="0.8" />
          <circle cx="13" cy="12" r="0.7" />
          <circle cx="32" cy="12" r="0.7" />
        </g>
        {/* iron pull ring on its mount */}
        <circle cx="22.5" cy="28.5" r="1.6" fill="#2a2d33" stroke="#101216" strokeWidth="0.7" />
        <circle cx="22.5" cy="31.6" r="3" fill="none" stroke="#2a2d33" strokeWidth="1.7" />
        <circle cx="22.5" cy="31.6" r="3" fill="none" stroke="#6a707c" strokeWidth="0.5" opacity="0.7" />
      </g>
    </svg>
  );
});

/** A sinkhole (Sinkhole placements): the square's ground has given way — a
 * cracked earthen rim around a dark vortex that slowly, permanently turns. */
export const SinkholeMark = React.memo(function SinkholeMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `sh-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <radialGradient id={g} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="55%" stopColor="#171310" />
          <stop offset="100%" stopColor="#3a3026" />
        </radialGradient>
      </defs>
      {/* cracked earth radiating from the rim */}
      <g stroke="#4a3c2c" strokeWidth="1.1" strokeLinecap="round" fill="none">
        <path d="M6 10 L11.5 14.5 L10 17.5" />
        <path d="M38 8.5 L33 14 L35.5 16.5" />
        <path d="M4.5 28 L10.5 27.5 L12 31" />
        <path d="M41 30 L34.5 28.5 L33.5 32.5" />
        <path d="M14 40.5 L17 35.5 M30 41 L28 35.5" />
      </g>
      {/* crumbling rim */}
      <ellipse cx="22.5" cy="23.5" rx="16.5" ry="14.5" fill="#3a3026" stroke="#241c12" strokeWidth="1.2" />
      <path d="M8 19 L11 21 M35 16.5 L32.5 19 M9.5 30 L13 28.5 M36.5 28 L33 26.5" stroke="#241c12" strokeWidth="0.9" strokeLinecap="round" />
      {/* the pit itself */}
      <ellipse cx="22.5" cy="23.5" rx="13" ry="11" fill={`url(#${g})`} />
      {/* the slow spiral, turning forever */}
      <g style={{ transformOrigin: "22.5px 23.5px" }}>
        {!reduced && (
          <animateTransform attributeName="transform" type="rotate" from="0 22.5 23.5" to="360 22.5 23.5" dur="9s" repeatCount="indefinite" additive="sum" />
        )}
        <path
          d="M22.5 13.5 C30 13.5 33.5 18 33.5 23.5 C33.5 29.5 28.5 32.5 23.5 32.5 C19 32.5 16 29.5 16 25.5 C16 22 18.5 19.5 22 19.5 C25 19.5 27 21.5 27 24 C27 26 25.5 27.4 23.6 27.4"
          fill="none"
          stroke="#5c4a34"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M22.5 17 C27.5 17 30 20 30 23.5 C30 27.5 26.5 29.5 23 29.5"
          fill="none"
          stroke="#867050"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* debris caught in the spin */}
        <g fill="#6e5c44">
          <circle cx="29.5" cy="19" r="0.9" />
          <circle cx="17.5" cy="27.5" r="0.8" />
          <circle cx="26.5" cy="28.5" r="0.6" />
        </g>
      </g>
    </svg>
  );
});

/** A set bear trap (Bear Trap placements): sprung steel jaws wide open, saw
 * teeth up, pressure plate in the middle, anchor chain trailing — with a cold
 * glint that runs along the jaws so nobody can say they weren't warned. */
export const BearTrapMark = React.memo(function BearTrapMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `bt-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa4b2" />
          <stop offset="55%" stopColor="#5c6470" />
          <stop offset="100%" stopColor="#2e343e" />
        </linearGradient>
      </defs>
      <ellipse cx="22.5" cy="37.5" rx="15" ry="3" fill="#000000" opacity="0.2" />
      {/* anchor chain to its stake */}
      <g fill="none" stroke="#3a3f48" strokeWidth="1.4">
        <ellipse cx="34.5" cy="35" rx="1.8" ry="1.2" />
        <ellipse cx="38" cy="36.5" rx="1.8" ry="1.2" />
        <ellipse cx="41" cy="38.5" rx="1.6" ry="1.1" />
      </g>
      {/* base plate + leaf springs */}
      <ellipse cx="22.5" cy="32.5" rx="13.5" ry="4.2" fill="#2e343e" stroke="#12151a" strokeWidth="1" />
      <path d="M9.5 32 C7 30.5 6.5 28.5 8 27.5 M35.5 32 C38 30.5 38.5 28.5 37 27.5" stroke="#3a3f48" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* open jaws: two toothed steel arcs */}
      <g style={{ transformOrigin: "22.5px 31px" }}>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 22.5 31; 0 22.5 31; -1.6 22.5 31; 1.2 22.5 31; 0 22.5 31"
            keyTimes="0; 0.7; 0.76; 0.83; 0.9"
            dur="4.6s"
            repeatCount="indefinite"
            additive="sum"
          />
        )}
        {/* left jaw */}
        <path
          d="M9 31 C6.5 22 10 12 17 8 L18.6 10.8 L16.2 11.6 L18.4 13.6 L15.8 14.6 L17.8 16.8 L15.4 17.9 L17.2 20.2 L14.9 21.4 L16.4 24 L14.4 25.4 L15.3 28 L13.5 29.8 L13.8 31.5 Z"
          fill={`url(#${g})`}
          stroke="#12151a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* right jaw (mirrored) */}
        <path
          d="M36 31 C38.5 22 35 12 28 8 L26.4 10.8 L28.8 11.6 L26.6 13.6 L29.2 14.6 L27.2 16.8 L29.6 17.9 L27.8 20.2 L30.1 21.4 L28.6 24 L30.6 25.4 L29.7 28 L31.5 29.8 L31.2 31.5 Z"
          fill={`url(#${g})`}
          stroke="#12151a"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* the travelling glint along the left jaw */}
        <path d="M10.5 27 C9.2 21 11 14.5 15.5 10.5" fill="none" stroke="#e8eef6" strokeWidth="1.1" strokeLinecap="round" opacity="0.35">
          {!reduced && <animate attributeName="opacity" values="0.2;0.85;0.2" keyTimes="0;0.5;1" dur="2.8s" repeatCount="indefinite" />}
        </path>
        <path d="M34.5 27 C35.8 21 34 14.5 29.5 10.5" fill="none" stroke="#e8eef6" strokeWidth="0.9" strokeLinecap="round" opacity="0.25">
          {!reduced && <animate attributeName="opacity" values="0.15;0.6;0.15" keyTimes="0;0.5;1" dur="2.8s" begin="1.4s" repeatCount="indefinite" />}
        </path>
      </g>
      {/* pressure plate + trigger */}
      <ellipse cx="22.5" cy="30.5" rx="5.2" ry="2.6" fill="#454c58" stroke="#12151a" strokeWidth="0.9" />
      <ellipse cx="22.5" cy="30.2" rx="2.4" ry="1.2" fill="#7a8494" />
      <path d="M22.5 27.5 V24.5" stroke="#3a3f48" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
});

/** A landlord's claim (Landlord placements): the square is under contract — a
 * little wooden post with a gilt-sealed deed placard, swaying just enough to
 * prove it was hammered in this morning. */
export const LandlordClaimMark = React.memo(function LandlordClaimMark() {
  const uid = React.useId().replace(/[:]/g, "");
  const g = `lc-${uid}`;
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 45 45" width="100%" height="100%" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5ead0" />
          <stop offset="100%" stopColor="#d8c49a" />
        </linearGradient>
      </defs>
      <ellipse cx="22.5" cy="39" rx="10" ry="2.4" fill="#000000" opacity="0.18" />
      <g style={{ transformOrigin: "22.5px 39px" }}>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 22.5 39; 0 22.5 39; -2 22.5 39; 1.4 22.5 39; 0 22.5 39"
            keyTimes="0; 0.62; 0.72; 0.84; 0.94"
            dur="4.4s"
            repeatCount="indefinite"
            additive="sum"
          />
        )}
        {/* the post, freshly driven */}
        <path d="M21.4 39.5 L21.6 16 H23.4 L23.6 39.5 Z" fill="#8a6438" stroke="#4e3418" strokeWidth="0.9" strokeLinejoin="round" />
        <path d="M20.2 39.8 L24.8 39.8" stroke="#4e3418" strokeWidth="1.2" strokeLinecap="round" />
        {/* the deed placard */}
        <rect x="8.5" y="6.5" width="28" height="14.5" rx="1.2" fill={`url(#${g})`} stroke="#7a5b23" strokeWidth="1.1" />
        <rect x="10" y="8" width="25" height="11.5" rx="0.8" fill="none" stroke="#b89a5c" strokeWidth="0.6" />
        {/* deed script lines */}
        <g stroke="#8a6a3a" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
          <path d="M13 11 H27 M13 14 H24 M13 17 H21" />
        </g>
        {/* the gilt wax seal, stamped with the landlord's mark */}
        <circle cx="30.5" cy="15.2" r="3.4" fill="#e6bf6a" stroke="#7a5b23" strokeWidth="0.9" />
        <circle cx="30.5" cy="15.2" r="2.2" fill="none" stroke="#7a5b23" strokeWidth="0.5" opacity="0.8" />
        <path d="M30.5 13.6 V16.8 M29.4 14.3 C29.4 13.9 31.6 13.9 31.6 14.6 C31.6 15.2 29.4 15.2 29.4 15.8 C29.4 16.5 31.6 16.5 31.6 16.1" fill="none" stroke="#7a5b23" strokeWidth="0.7" strokeLinecap="round" />
        {/* corner nails */}
        <g fill="#7a5b23">
          <circle cx="10.6" cy="8.6" r="0.6" />
          <circle cx="34.4" cy="8.6" r="0.6" />
          <circle cx="10.6" cy="19.4" r="0.6" />
          <circle cx="34.4" cy="19.4" r="0.6" />
        </g>
      </g>
    </svg>
  );
});

// Simplified silhouettes; high-contrast white/black with outline for both.
// Colors resolve through CSS variables so piece themes can recolor the whole
// set at runtime (see PIECE_THEMES / applyPieceTheme in lib/settings).
// Each entry is innerHTML for the SVG (viewBox 0 0 45 45)
const fill = (c: Color) => (c === "w" ? "var(--piece-w-fill)" : "var(--piece-b-fill)");
const stroke = (c: Color) => (c === "w" ? "var(--piece-w-stroke)" : "var(--piece-b-stroke)");

function make(svg: string) { return svg; }

const PATHS: Record<string, string> = {
  // King
  wk: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 11.6V6M20 8h5" stroke-linecap="round" />
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="${fill("w")}" />
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="${fill("w")}" />
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" />
    </g>`),
  bk: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 11.6V6M20 8h5" stroke-linecap="round" stroke="${stroke("b")}" />
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
      <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke="${stroke("b")}" />
    </g>`),
  // Queen (Cburnett — 5 symmetric spikes with jewels, layered base ridges)
  wq: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75"/>
      <circle cx="14" cy="9" r="2.75"/>
      <circle cx="22.5" cy="8" r="2.75"/>
      <circle cx="31" cy="9" r="2.75"/>
      <circle cx="39" cy="12" r="2.75"/>
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" stroke-linecap="butt"/>
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" stroke-linecap="butt"/>
      <path d="M 11,38.5 A 35,35 1 0 0 34,38.5" fill="none" stroke-linecap="butt"/>
      <path d="M 11,29 A 35,35 1 0 1 34,29" fill="none"/>
      <path d="M 12.5,31.5 L 32.5,31.5" fill="none"/>
      <path d="M 11.5,34.5 A 35,35 1 0 0 33.5,34.5" fill="none"/>
      <path d="M 10.5,37.5 A 35,35 1 0 0 34.5,37.5" fill="none"/>
    </g>`),
  bq: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <circle cx="6" cy="12" r="2.75"/>
      <circle cx="14" cy="9" r="2.75"/>
      <circle cx="22.5" cy="8" r="2.75"/>
      <circle cx="31" cy="9" r="2.75"/>
      <circle cx="39" cy="12" r="2.75"/>
      <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" stroke-linecap="butt"/>
      <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" stroke-linecap="butt"/>
      <path d="M 11,38.5 A 35,35 1 0 0 34,38.5" fill="none" stroke="${stroke("b")}" stroke-linecap="butt"/>
      <path d="M 11,29 A 35,35 1 0 1 34,29" fill="none" stroke="${stroke("b")}"/>
      <path d="M 12.5,31.5 L 32.5,31.5" fill="none" stroke="${stroke("b")}"/>
      <path d="M 11.5,34.5 A 35,35 1 0 0 33.5,34.5" fill="none" stroke="${stroke("b")}"/>
      <path d="M 10.5,37.5 A 35,35 1 0 0 34.5,37.5" fill="none" stroke="${stroke("b")}"/>
    </g>`),
  // Rook
  wr: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M9 39h27v-3H9zM12 36v-4h21v4zM11 14V9h4v2h5V9h5v2h5V9h4v5"/>
      <path d="M34 14l-3 3H14l-3-3"/>
      <path d="M31 17v12.5H14V17"/>
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
      <path d="M11 14h23" fill="none"/>
    </g>`),
  br: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M9 39h27v-3H9zM12.5 32l1.5-2.5h17l1.5 2.5M12 36v-4h21v4z"/>
      <path d="M14 29.5v-13h17v13"/>
      <path d="M14 16.5l-3-2.5h23l-3 2.5M11 14V9h4v2h5V9h5v2h5V9h4v5"/>
    </g>`),
  // Bishop
  wb: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <g stroke-linecap="butt">
        <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.7.5 3 2-1.4 1-3 .5-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1 0 0-1.6.5-3-.5 1.3-1.5 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <circle cx="22.5" cy="8" r="2.5"/>
      </g>
      <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke-linejoin="miter"/>
    </g>`),
  bb: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <g stroke-linecap="butt">
        <path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.7.5 3 2-1.4 1-3 .5-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1 0 0-1.6.5-3-.5 1.3-1.5 3-2 3-2z"/>
        <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
        <circle cx="22.5" cy="8" r="2.5"/>
      </g>
      <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke="${stroke("b")}" stroke-linejoin="miter"/>
    </g>`),
  // Knight (Cburnett — full head silhouette: ear at y=2, snout, mane)
  wn: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" stroke-linecap="butt"/>
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13.5,29 10.5,30.5 8,30 C 6,29.5 5,27 6,24 C 7,21 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,5.5 16.5,4.5 16.5,4.5 L 18,5 L 16,2 L 19,2 L 18,4 L 20,3.5 L 19.5,5.5 C 19.5,5.5 21.5,5 21.5,6 z" stroke-linecap="butt"/>
      <path d="M 9.5,25.5 A 0.5,0.5 0 1,1 8.5,25.5 A 0.5,0.5 0 1,1 9.5,25.5 z" fill="${stroke("w")}"/>
      <path d="M 15,15.5 A 0.5,1.5 0 1,1 14,15.5 A 0.5,1.5 0 1,1 15,15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="${stroke("w")}"/>
    </g>`),
  bn: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" stroke-linecap="butt"/>
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13.5,29 10.5,30.5 8,30 C 6,29.5 5,27 6,24 C 7,21 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,5.5 16.5,4.5 16.5,4.5 L 18,5 L 16,2 L 19,2 L 18,4 L 20,3.5 L 19.5,5.5 C 19.5,5.5 21.5,5 21.5,6 z" stroke-linecap="butt"/>
      <path d="M 9.5,25.5 A 0.5,0.5 0 1,1 8.5,25.5 A 0.5,0.5 0 1,1 9.5,25.5 z" fill="${stroke("b")}" stroke="${stroke("b")}"/>
      <path d="M 15,15.5 A 0.5,1.5 0 1,1 14,15.5 A 0.5,1.5 0 1,1 15,15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill="${stroke("b")}" stroke="${stroke("b")}"/>
    </g>`),
  // Pawn
  wp: make(`
    <g fill="${fill("w")}" stroke="${stroke("w")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </g>`),
  bp: make(`
    <g fill="${fill("b")}" stroke="${stroke("b")}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </g>`),
};

// Amazon: the queen + knight fairy piece. A single fused silhouette so it reads
// as its OWN piece, not a queen: a left-facing horse-head (the knight) rising
// from a queen's base collar and wearing a queen's jeweled coronet. Same weight
// as the rest of the set (1.5 stroke, round joins, fill/stroke through the same
// CSS variables) so it themes and recolours with every other piece. The eye
// uses the stroke colour so it stays visible on both the light and dark bodies.
const amazon = (c: Color) => make(`
    <g fill="${fill(c)}" stroke="${stroke(c)}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M 11,30.5 C 11,32.5 9.5,32.5 9.5,34.5 C 9.5,36 11,36.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,36.5 35.5,36 35.5,34.5 C 35.5,32.5 34,32.5 34,30.5 C 27,28.8 18,28.8 11,30.5 z" stroke-linecap="butt"/>
      <path d="M 22,15 C 29.5,15.2 32,20 31.5,31 L 15,31 C 15,25.5 20.5,26 20,20.5 C 19.4,24 15.5,27 12.2,28.2 C 10,29 7.8,28.6 7.2,26.8 C 6.6,25 8.2,22 10.6,19.8 C 12.4,18.2 14,16.8 15.6,16 C 17.4,15.2 19.8,15 22,15 z" stroke-linecap="butt"/>
      <path d="M 11,16 L 12.5,9.5 L 17,13.5 L 22.5,7.5 L 28,13.5 L 32.5,9.5 L 34,16 C 27,14.3 18,14.3 11,16 z" stroke-linecap="butt"/>
      <circle cx="12.5" cy="9.5" r="1.9"/>
      <circle cx="22.5" cy="7.5" r="2.1"/>
      <circle cx="32.5" cy="9.5" r="1.9"/>
      <path d="M 11,24 A 0.65,0.65 0 1,1 9.7,24 A 0.65,0.65 0 1,1 11,24 z" fill="${stroke(c)}"/>
      <path d="M 12,33.5 A 28,28 1 0 0 33,33.5" fill="none"/>
      <path d="M 11.5,36.2 A 28,28 1 0 0 33.5,36.2" fill="none"/>
    </g>`);

const AMAZON_PATHS: Record<Color, string> = {
  w: amazon("w"),
  b: amazon("b"),
};
