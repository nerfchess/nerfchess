// PGN export for finished (or in-progress) games. Nerf chess is a variant —
// games can end by king capture or by a nerf's loss condition — so the export
// carries a Variant tag plus the rule cards and termination reason as custom
// tags, while the movetext itself stays standard SAN readable by any viewer.

import { movesToSAN } from "@/engine/board";
import type { GameResult } from "@/engine/game";
import type { Move } from "@/engine/types";

export function pgnResult(result: GameResult | null): "1-0" | "0-1" | "1/2-1/2" | "*" {
  if (!result || !result.winner) return "*";
  if (result.winner === "draw") return "1/2-1/2";
  return result.winner === "w" ? "1-0" : "0-1";
}

function tag(name: string, value: string): string {
  return `[${name} "${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

function pgnDate(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export interface PgnOptions {
  moves: Move[];
  result: GameResult | null;
  white?: string;
  black?: string;
  whiteNerf?: string | null;
  blackNerf?: string | null;
  startedAt?: number;
}

export function gameToPGN({ moves, result, white, black, whiteNerf, blackNerf, startedAt }: PgnOptions): string {
  const resultToken = pgnResult(result);
  const tags = [
    tag("Event", "Nerf Chess"),
    tag("Site", "https://nerfchess.com"),
    tag("Date", pgnDate(startedAt)),
    tag("White", white ?? "White"),
    tag("Black", black ?? "Black"),
    tag("Result", resultToken),
    tag("Variant", "Nerf Chess"),
  ];
  if (whiteNerf) tags.push(tag("WhiteNerf", whiteNerf));
  if (blackNerf) tags.push(tag("BlackNerf", blackNerf));
  if (result?.reason) tags.push(tag("Termination", result.reason));

  // Disambiguated by replaying the line, so "Nbd2"/"Nfd2" come out distinct and
  // the movetext is replayable by any PGN reader.
  const sans = movesToSAN(moves);
  const parts: string[] = [];
  let moveNo = 1;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    if (m.color === "w") {
      parts.push(`${moveNo}. ${sans[i]}`);
    } else {
      // A game (or a continuation after a skipped ply) can open with Black.
      const needsNumber = i === 0 || moves[i - 1].color === "b";
      parts.push(needsNumber ? `${moveNo}... ${sans[i]}` : sans[i]);
      moveNo++;
    }
  }
  parts.push(resultToken);

  // Wrap the movetext at ~80 columns per PGN convention.
  const lines: string[] = [];
  let line = "";
  for (const part of parts) {
    if (line && line.length + 1 + part.length > 80) {
      lines.push(line);
      line = part;
    } else {
      line = line ? `${line} ${part}` : part;
    }
  }
  if (line) lines.push(line);

  return `${tags.join("\n")}\n\n${lines.join("\n")}\n`;
}
