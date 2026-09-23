// The link-preview family (brief section 19): every card the site hands to
// Instagram DMs, iMessage, WhatsApp, Discord, Slack, X and LinkedIn when a
// Nerf Chess link is pasted. 1200x630, rendered with next/og.
//
// One frame for all of them, built from the design system and nothing else:
// the flat page colour, boxes on the panel rung with one hairline, the logo
// and the wordmark top left, the domain top right, and a real board drawn with
// the default Midnight board and cburnett pieces. Mode hues appear only as
// labels and borders of Buff or Nerf content, tier inks only on a card's tier,
// the accent only on the one "act here" element (the invite's accept button).
//
// Legibility is judged at 400px wide (a phone chat bubble), a third of the
// real size: the smallest text on a card is 28px (about 9px there, domain and
// labels only) and anything a reader needs is 34px or more.
//
// Every layout is a pure function of its props; data loading lives in
// src/lib/server/ogData.ts and rendering, fallback and caching in
// src/lib/og/render.ts.

import type { ReactNode } from "react";
import type { Piece } from "@/engine/types";
import { OgBoard, fenPieces, sq } from "./og/board";
import { OG_LOGO_PNG } from "./og/logo";
import { OG_PIECES } from "./og/pieces";
import { OG_CACHE, OG_CONTENT_TYPE, OG_SIZE, ogResponse } from "./og/render";
import { clamp, fitSize, formatCount, ogText } from "./og/text";
import * as T from "./og/theme";

export { OG_CACHE, OG_CONTENT_TYPE, OG_SIZE, ogResponse };

const LOGO = `data:image/png;base64,${OG_LOGO_PNG}`;
const PAD_X = 60;
const PAD_Y = 44;
const HEADER = 64;
const GAP = 28;
/** Height left for a card's body under the header. */
const BODY_H = OG_SIZE.height - PAD_Y * 2 - HEADER - GAP;
/** The board beside a text column fills the body height (squares are whole
 *  pixels, plus the 1px hairline on each side). */
const BOARD = BODY_H;
const BOARD_OUTER = Math.floor(BOARD / 8) * 8 + 2;
const TEXT_W_WITH_BOARD = OG_SIZE.width - PAD_X * 2 - BOARD_OUTER - 56;
const TEXT_W_FULL = OG_SIZE.width - PAD_X * 2;

// The motif every generic card shares: Scholar's mate, the queen has just
// taken f7, and in Nerf Chess the king still has to be captured next move.
const MOTIF = fenPieces("r1bqk2r/pppp1Qpp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR");
const MOTIF_LIT = [sq("h5"), sq("f7")];
const START = fenPieces("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");

// ---------------------------------------------------------------------------
// Frame and small parts
// ---------------------------------------------------------------------------

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: T.PAGE,
        padding: `${PAD_Y}px ${PAD_X}px`,
        fontFamily: "Noto Sans",
        color: T.TEXT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: HEADER }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} width={64} height={64} alt="" />
          <div style={{ display: "flex", marginLeft: 16, fontSize: 36, fontWeight: 700, color: T.HEADING }}>Nerf Chess</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: T.SECONDARY }}>nerfchess.com</div>
      </div>
      <div style={{ display: "flex", flexDirection: "row", marginTop: GAP, height: BODY_H }}>{children}</div>
    </div>
  );
}

/** A label box: hairline in `color`, text in `color`, on the panel rung. */
function Chip({ children, color = T.TEXT, border }: { children: ReactNode; color?: string; border?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: 30,
        color,
        backgroundColor: T.PANEL,
        border: `2px solid ${border ?? color}`,
        padding: "6px 16px",
        marginRight: 14,
        marginTop: 14,
      }}
    >
      {children}
    </div>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>{children}</div>;
}

function Kicker({ children, color = T.SECONDARY }: { children: ReactNode; color?: string }) {
  return <div style={{ display: "flex", fontSize: 32, color, marginBottom: 10 }}>{children}</div>;
}

function Title({ text, width, maxLines, sizes }: { text: string; width: number; maxLines: number; sizes: number[] }) {
  const size = fitSize(text, width, maxLines, sizes);
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.1, color: T.HEADING, maxWidth: width }}>
      {text}
    </div>
  );
}

function Body({ text, width, size = 36, color = T.TEXT }: { text: string; width: number; size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", fontSize: size, lineHeight: 1.35, color, maxWidth: width, marginTop: 18 }}>{text}</div>
  );
}

function modeLabel(mode: "buff" | "nerf" | null | undefined): string | null {
  return mode === "buff" ? "Buff mode" : mode === "nerf" ? "Nerf mode" : null;
}

function ModeChip({ mode }: { mode: "buff" | "nerf" | null | undefined }) {
  const label = modeLabel(mode);
  return label ? <Chip color={T.modeInk(mode)}>{label}</Chip> : null;
}

// ---------------------------------------------------------------------------
// Brand card: the home page, and the fallback for every other card
// ---------------------------------------------------------------------------

export function brandCard() {
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: TEXT_W_WITH_BOARD, marginRight: 56, flexShrink: 0 }}>
        <Title text="Chess with power-ups" width={TEXT_W_WITH_BOARD} maxLines={2} sizes={[80]} />
        <Body
          width={TEXT_W_WITH_BOARD}
          text="Draft a power-up every 5 moves, or play with a secret handicap. Capture the king to win."
        />
        <Chips>
          <ModeChip mode="buff" />
          <ModeChip mode="nerf" />
        </Chips>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 32, color: T.SECONDARY }}>Free, in your browser</div>
      </div>
      <OgBoard pieces={MOTIF} size={BOARD} highlight={MOTIF_LIT} />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Page card: guides, info pages, section indexes
// ---------------------------------------------------------------------------

export type PageCardProps = {
  /** Section label above the title, e.g. "Guide". */
  kicker: string;
  title: string;
  /** One or two plain sentences under the title. */
  subtitle?: string;
  /** The one number that makes someone tap, e.g. { value: "1,665", label: "cards" }. */
  stat?: { value: string; label: string };
  /** A board to show instead of the house motif. */
  board?: { pieces: (Piece | null)[]; highlight?: number[]; flip?: boolean };
  /** Mode colour for the kicker when the page belongs to one mode. */
  mode?: "buff" | "nerf";
};

export function pageCard({ kicker, title, subtitle, stat, board, mode }: PageCardProps) {
  const t = clamp(ogText(title) || "Nerf Chess", 70);
  const sub = subtitle ? clamp(ogText(subtitle), stat ? 90 : 130) : "";
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: TEXT_W_WITH_BOARD, marginRight: 56, flexShrink: 0 }}>
        <Kicker color={mode ? T.modeInk(mode) : T.SECONDARY}>{ogText(kicker)}</Kicker>
        <Title text={t} width={TEXT_W_WITH_BOARD} maxLines={3} sizes={[76, 68, 60, 52]} />
        {sub && <Body width={TEXT_W_WITH_BOARD} text={sub} size={34} color={T.SECONDARY} />}
        {stat && (
          <div style={{ display: "flex", alignItems: "baseline", marginTop: "auto" }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: T.HEADING }}>{ogText(stat.value)}</div>
            <div style={{ display: "flex", fontSize: 34, color: T.SECONDARY, marginLeft: 16 }}>{ogText(stat.label)}</div>
          </div>
        )}
      </div>
      <OgBoard
        pieces={board?.pieces ?? MOTIF}
        size={BOARD}
        highlight={board ? board.highlight ?? [] : MOTIF_LIT}
        flip={board?.flip}
      />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Codex card
// ---------------------------------------------------------------------------

export type CodexCardProps = {
  /** "Buff", "Nerf", "Hex", "Boon", "Item". */
  family: string;
  name: string;
  tier: number;
  /** "Tier V, Brutal". */
  tierLabel: string;
  mode: "buff" | "nerf" | null;
  /** Mode line when the card is in both or neither mode. */
  modeText?: string;
  rule: string;
  /** The card's face icon (a lucide component), drawn in the tier ink. */
  Icon?: (props: { size?: number; color?: string; strokeWidth?: number }) => ReactNode;
};

export function codexCard({ family, name, tier, tierLabel, mode, modeText, rule, Icon }: CodexCardProps) {
  const ink = T.tierInk(tier);
  const textW = TEXT_W_FULL - 260 - 48;
  const title = clamp(ogText(name) || "Nerf Chess card", 60);
  const ruleText = clamp(ogText(rule), 150);
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: 260, marginRight: 48 }}>
        <div
          style={{
            display: "flex",
            width: 260,
            height: 260,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: T.PANEL,
            border: `3px solid ${ink}`,
          }}
        >
          {Icon ? <Icon size={168} color={ink} strokeWidth={1.6} /> : <div style={{ display: "flex", fontSize: 150, fontWeight: 700, color: ink }}>{title.slice(0, 1)}</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 34, fontWeight: 700, color: ink, marginTop: 18 }}>{tierLabel}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: textW }}>
        <Kicker color={mode ? T.modeInk(mode) : T.SECONDARY}>{`Codex, ${family.toLowerCase()}`}</Kicker>
        <Title text={title} width={textW} maxLines={2} sizes={[80, 68, 58, 50]} />
        <Body width={textW} text={ruleText} size={34} />
        <div style={{ display: "flex", marginTop: "auto" }}>
          {mode ? <ModeChip mode={mode} /> : modeText ? <Chip color={T.SECONDARY}>{modeText}</Chip> : null}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Game card: /game/[id] and /history/[id]
// ---------------------------------------------------------------------------

export type GameSide = { name: string; rating?: number | null };
export type GameCardProps = {
  white: GameSide;
  black: GameSide;
  mode: "buff" | "nerf" | null;
  clock: string;
  rated: boolean;
  /** "White won by capturing the king", "Draw by agreement"; null while live. */
  result: string | null;
  winner?: "w" | "b" | "draw" | null;
  pieces: (Piece | null)[];
  lastMove?: number[];
  live?: boolean;
};

function PlayerRow({ side, color, won }: { side: GameSide; color: "w" | "b"; won: boolean }) {
  const name = clamp(ogText(side.name) || (color === "w" ? "White" : "Black"), 20);
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          width: 34,
          height: 34,
          backgroundColor: color === "w" ? T.HEADING : T.PAGE,
          border: `2px solid ${color === "w" ? T.HEADING : T.SECONDARY}`,
          marginRight: 18,
        }}
      />
      <div style={{ display: "flex", fontSize: fitSize(name, 360, 1, [48, 42, 36]), fontWeight: 700, color: T.HEADING }}>{name}</div>
      {typeof side.rating === "number" && (
        <div style={{ display: "flex", fontSize: 36, color: T.SECONDARY, marginLeft: 16 }}>{Math.round(side.rating)}</div>
      )}
      {won && <div style={{ display: "flex", fontSize: 32, color: T.POSITIVE, marginLeft: 16 }}>won</div>}
    </div>
  );
}

export function gameCard({ white, black, mode, clock, rated, result, winner, pieces, lastMove, live }: GameCardProps) {
  return (
    <Frame>
      <div style={{ display: "flex", marginRight: 56 }}>
        <OgBoard pieces={pieces} size={BOARD} highlight={lastMove ?? []} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: TEXT_W_WITH_BOARD }}>
        <Kicker color={live ? T.POSITIVE : T.SECONDARY}>{live ? "Live game" : "Finished game"}</Kicker>
        <PlayerRow side={white} color="w" won={winner === "w"} />
        <div style={{ display: "flex", fontSize: 30, color: T.SECONDARY, marginTop: 8, marginLeft: 52 }}>vs</div>
        <PlayerRow side={black} color="b" won={winner === "b"} />
        {result && <Body width={TEXT_W_WITH_BOARD} text={clamp(ogText(result), 60)} size={34} />}
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: "auto" }}>
          <ModeChip mode={mode} />
          <Chip>{clock}</Chip>
          <Chip color={T.SECONDARY}>{rated ? "Rated" : "Casual"}</Chip>
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Profile card: /u/[username]
// ---------------------------------------------------------------------------

export type ProfileCardProps = {
  username: string;
  /** A preset avatar: a white piece on a coloured plate (src/lib/avatars.ts). */
  avatar?: { piece: Piece["type"]; bg: string } | null;
  ratings: { mode: "buff" | "nerf"; rating: number; games: number; provisional?: boolean }[];
  games: number;
  topCards: { name: string; tier: number }[];
};

export function profileCard({ username, avatar, ratings, games, topCards }: ProfileCardProps) {
  const name = clamp(ogText(username) || "Player", 20);
  const piece = avatar ? OG_PIECES[`w${avatar.piece.toUpperCase()}`] : undefined;
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: 560, marginRight: 56 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 132,
              height: 132,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: avatar?.bg ?? T.RAISED,
              border: `1px solid ${T.BORDER}`,
              borderRadius: 66,
              marginRight: 28,
            }}
          >
            {piece ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={piece} width={104} height={104} alt="" />
            ) : (
              <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: T.HEADING }}>{name.slice(0, 1).toUpperCase()}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: fitSize(name, 390, 1, [64, 56, 48, 42]), fontWeight: 700, color: T.HEADING }}>{name}</div>
            <div style={{ display: "flex", fontSize: 32, color: T.SECONDARY, marginTop: 4 }}>
              {games === 1 ? "1 game played" : `${formatCount(games)} games played`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {ratings.length ? (
            ratings.map((r) => (
              <div key={r.mode} style={{ display: "flex", alignItems: "baseline", marginTop: 10 }}>
                <div style={{ display: "flex", width: 230, fontSize: 36, color: T.modeInk(r.mode) }}>{modeLabel(r.mode)}</div>
                <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: T.HEADING }}>
                  {`${Math.round(r.rating)}${r.provisional ? "?" : ""}`}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", fontSize: 36, color: T.SECONDARY }}>No rated games yet</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Kicker>{topCards.length ? "Favourite cards" : "Nerf Chess player"}</Kicker>
        {topCards.length ? (
          topCards.slice(0, 3).map((c) => (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: T.PANEL,
                border: `1px solid ${T.BORDER}`,
                borderLeft: `6px solid ${T.tierInk(c.tier)}`,
                padding: "14px 20px",
                marginTop: 14,
                fontSize: 36,
                color: T.HEADING,
              }}
            >
              {clamp(ogText(c.name), 22)}
            </div>
          ))
        ) : (
          <OgBoard pieces={START} size={BODY_H - 52} />
        )}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Invite card: /c/[code], the most shared card on the site
// ---------------------------------------------------------------------------

export type InviteCardProps = {
  /** The challenger's name, or null for an open invite with no known host. */
  from: string | null;
  rating?: number | null;
  clock: string | null;
  mode: "buff" | "nerf" | null;
  rated: boolean | null;
  code: string;
};

export function inviteCard({ from, rating, clock, mode, rated, code }: InviteCardProps) {
  const name = from ? clamp(ogText(from), 20) : "";
  const head = name ? `${name} challenged you` : "You are invited";
  const line = clock && clock !== "No clock" ? `to Nerf Chess, ${clock}` : "to a game of Nerf Chess";
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", width: TEXT_W_WITH_BOARD, marginRight: 56, flexShrink: 0 }}>
        <Title text={head} width={TEXT_W_WITH_BOARD} maxLines={2} sizes={[76, 66, 58, 50]} />
        <div style={{ display: "flex", fontSize: 48, color: T.TEXT, marginTop: 10 }}>{line}</div>
        <Chips>
          <ModeChip mode={mode} />
          {rated !== null && <Chip color={T.SECONDARY}>{rated ? "Rated" : "Casual"}</Chip>}
          {typeof rating === "number" && <Chip color={T.SECONDARY}>{`Rated ${Math.round(rating)}`}</Chip>}
        </Chips>
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: T.ACCENT,
              color: T.ON_ACCENT,
              fontSize: 36,
              fontWeight: 700,
              padding: "14px 30px",
              borderRadius: 3,
            }}
          >
            {name ? "Accept" : "Join the game"}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: T.SECONDARY, marginLeft: 24 }}>{`Code ${ogText(code)}`}</div>
        </div>
      </div>
      {/* The host always sits White, so the invitee sees their own side, Black, at the bottom. */}
      <OgBoard pieces={START} size={BOARD} flip />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Compatibility for callers that only need the two original images.
// ---------------------------------------------------------------------------

/** The brand card as a finished response (home page, unknown ids). */
export function siteOgImage(): Promise<Response> {
  return ogResponse({ build: brandCard, fallback: brandCard, maxAge: OG_CACHE.static });
}

/** A standard image response for a route: build, fall back to the brand card. */
export function ogImage(build: () => ReturnType<typeof brandCard> | Promise<ReturnType<typeof brandCard>>, maxAge: number, key?: string) {
  return ogResponse({ build, fallback: brandCard, maxAge, key });
}
