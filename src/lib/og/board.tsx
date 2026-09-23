// A real chess board for link previews: the default Midnight board with the
// default cburnett pieces, drawn square by square so next/og can lay it out.

import type { Piece } from "@/engine/types";
import { OG_PIECES } from "./pieces";
import { BOARD_DARK, BOARD_HIGHLIGHT, BOARD_LIGHT, BORDER } from "./theme";

/** A FEN piece placement ("rnbqkbnr/pppppppp/8/...") as 64 squares, index
 *  = rank * 8 + file with rank 0 = White's first rank (src/engine/types.ts). */
export function fenPieces(placement: string): (Piece | null)[] {
  const out: (Piece | null)[] = new Array(64).fill(null);
  const ranks = placement.split(" ")[0].split("/");
  ranks.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      if ("pnbrqk".includes(lower) && file < 8 && rank >= 0) {
        out[rank * 8 + file] = { type: lower as Piece["type"], color: ch === lower ? "b" : "w" };
      }
      file += 1;
    }
  });
  return out;
}

/** "e4" -> square index. */
export function sq(name: string): number {
  return (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
}

export function OgBoard({
  pieces,
  size,
  highlight = [],
  flip = false,
}: {
  pieces: (Piece | null)[];
  size: number;
  /** Squares tinted with the last-move highlight. */
  highlight?: number[];
  /** Black at the bottom. */
  flip?: boolean;
}) {
  const cell = Math.floor(size / 8);
  const board = cell * 8;
  const lit = new Set(highlight);
  const rows = [];
  for (let r = 0; r < 8; r++) {
    const rank = flip ? r : 7 - r;
    const cells = [];
    for (let c = 0; c < 8; c++) {
      const file = flip ? 7 - c : c;
      const index = rank * 8 + file;
      const light = (rank + file) % 2 === 1;
      const piece = pieces[index];
      const src = piece ? OG_PIECES[`${piece.color}${piece.type.toUpperCase()}`] : undefined;
      cells.push(
        <div
          key={index}
          style={{
            display: "flex",
            width: cell,
            height: cell,
            backgroundColor: light ? BOARD_LIGHT : BOARD_DARK,
            position: "relative",
          }}
        >
          {lit.has(index) && (
            <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: cell, height: cell, backgroundColor: BOARD_HIGHLIGHT }} />
          )}
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} width={cell} height={cell} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
          )}
        </div>,
      );
    }
    rows.push(
      <div key={r} style={{ display: "flex", flexDirection: "row" }}>
        {cells}
      </div>,
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: board + 2,
        height: board + 2,
        border: `1px solid ${BORDER}`,
      }}
    >
      {rows}
    </div>
  );
}
