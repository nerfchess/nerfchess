// Shared next/og rendering for the site's social preview images (the
// opengraph-image.tsx files under src/app). Two layouts on the house dark
// palette: a generic site card, and a per-card codex card showing name, tier,
// family, and rule text. No external fonts: next/og ships its own default
// face, so these render identically at build time and on demand.

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// House palette: ink background, parchment text, gold accent.
const INK = "#191713";
const PARCHMENT = "#c2bcaf";
const PARCHMENT_BRIGHT = "#eae6dc";
const GOLD = "#f4c430";

/** Collapse whitespace and clamp near `max` characters without cutting a word
 * in half, so long rule texts stay readable inside the image. */
function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 3);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max / 2 ? space : cut.length)}...`;
}

/** Title size steps down as the name gets longer so one line never overflows
 * the frame; two-line wraps stay comfortable at the smallest step. */
function titleSize(title: string): number {
  if (title.length <= 18) return 84;
  if (title.length <= 30) return 66;
  return 52;
}

/** The gilt frame every OG image shares: ink field, thin gold border, content
 * column spread between top and bottom. */
function frame(children: React.ReactNode) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: INK,
        padding: "44px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexGrow: 1,
          border: "2px solid rgba(244, 196, 48, 0.55)",
          padding: "52px 60px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** The default site-wide social image (also the fallback for unknown card
 * ids): brand name, the "chess with power-ups" pitch, and the domain. */
export function siteOgImage(): ImageResponse {
  return new ImageResponse(
    frame(
      <>
        <div
          style={{
            display: "flex",
            color: GOLD,
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Free online chess variant
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: PARCHMENT_BRIGHT,
              fontSize: 112,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            Nerf Chess
          </div>
          <div
            style={{
              display: "flex",
              color: PARCHMENT,
              fontSize: 34,
              lineHeight: 1.4,
              marginTop: 24,
              maxWidth: 940,
            }}
          >
            Chess with power-ups. Draft a card every 5 moves, stack buffs or
            cast hexes, and capture the king to win.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", color: GOLD, fontSize: 28 }}>
            nerfchess.com
          </div>
          <div style={{ display: "flex", color: PARCHMENT, fontSize: 24 }}>
            Buff mode · Nerf mode · 2,400+ cards
          </div>
        </div>
      </>,
    ),
    OG_SIZE,
  );
}

export interface CardOgProps {
  /** Small gold line above the name, e.g. "Nerf Chess codex · Hex". */
  eyebrow: string;
  /** The card's name. */
  title: string;
  /** Tier / family / mode line under the name. */
  meta: string;
  /** The card's rule text; clamped to fit the frame. */
  body: string;
}

/** A codex card's social image: eyebrow, name, tier line, and rule text. */
export function cardOgImage({ eyebrow, title, meta, body }: CardOgProps): ImageResponse {
  const name = clamp(title, 60);
  return new ImageResponse(
    frame(
      <>
        <div
          style={{
            display: "flex",
            color: GOLD,
            fontSize: 24,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          {clamp(eyebrow, 60)}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: PARCHMENT_BRIGHT,
              fontSize: titleSize(name),
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              color: GOLD,
              fontSize: 28,
              marginTop: 18,
            }}
          >
            {clamp(meta, 90)}
          </div>
          <div
            style={{
              display: "flex",
              color: PARCHMENT,
              fontSize: 30,
              lineHeight: 1.5,
              marginTop: 26,
              maxWidth: 1000,
            }}
          >
            {clamp(body, 220)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", color: GOLD, fontSize: 26 }}>
            nerfchess.com
          </div>
          <div style={{ display: "flex", color: PARCHMENT, fontSize: 22 }}>
            Chess with power-ups
          </div>
        </div>
      </>,
    ),
    OG_SIZE,
  );
}
