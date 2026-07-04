import type { QueuedPremove } from "@/components/Board";
import { Nerf } from "@/engine/nerf";
import { buildCustomNerf, CustomNerf } from "@/engine/nerfs/custom";
import { IMPLEMENTED_BY_ID } from "@/engine/nerfs/library";
import { NerfGame, PlayerSlot } from "@/engine/game";
import { RNG } from "@/engine/rng";
import { Color } from "@/engine/types";

export const ACTIVE_AI_GAME_KEY = "dc:active-ai-game";

type SavedNerf =
  | { kind: "implemented"; id: string }
  | { kind: "custom"; spec: CustomNerf };

type SavedPlayerSlot = {
  nerf: SavedNerf;
  state: PlayerSlot["state"];
  color: Color;
  rngState: number;
};

export type SavedAiGame = {
  version: 1;
  query: string;
  myColor: Color;
  whiteMs: number;
  blackMs: number;
  premoves: QueuedPremove[];
  game: {
    board: NerfGame["board"];
    white: SavedPlayerSlot;
    black: SavedPlayerSlot;
    result: NerfGame["result"];
    startedAt: number;
    captured: NerfGame["captured"];
  };
};

function nerfRef(nerf: Nerf, customSpec?: CustomNerf | null): SavedNerf | null {
  if (customSpec && customSpec.id === nerf.id) return { kind: "custom", spec: customSpec };
  if (IMPLEMENTED_BY_ID[nerf.id]) return { kind: "implemented", id: nerf.id };
  return null;
}

function restoreNerf(saved: SavedNerf): Nerf | null {
  if (saved.kind === "custom") return buildCustomNerf(saved.spec);
  return IMPLEMENTED_BY_ID[saved.id] ?? null;
}

function saveSlot(slot: PlayerSlot, customSpec?: CustomNerf | null): SavedPlayerSlot | null {
  const nerf = nerfRef(slot.nerf, customSpec);
  if (!nerf) return null;
  return {
    nerf,
    state: slot.state,
    color: slot.color,
    rngState: slot.rng.getState(),
  };
}

function restoreSlot(saved: SavedPlayerSlot): PlayerSlot | null {
  const nerf = restoreNerf(saved.nerf);
  if (!nerf) return null;
  return {
    nerf,
    state: saved.state ?? {},
    color: saved.color,
    rng: RNG.fromState(saved.rngState),
  };
}

// A structured-clone-safe snapshot of a NerfGame (functions replaced by nerf
// ids / custom specs). Also used to ship positions to the AI web worker.
export type SavedGameSnapshot = SavedAiGame["game"];

export function snapshotGame(
  game: NerfGame,
  whiteCustomSpec?: CustomNerf | null,
  blackCustomSpec?: CustomNerf | null,
): SavedGameSnapshot | null {
  const white = saveSlot(game.white, whiteCustomSpec);
  const black = saveSlot(game.black, blackCustomSpec);
  if (!white || !black) return null;
  return {
    board: game.board,
    white,
    black,
    result: game.result,
    startedAt: game.startedAt,
    captured: game.captured,
  };
}

export function restoreGameSnapshot(saved: SavedGameSnapshot): NerfGame | null {
  const white = restoreSlot(saved.white);
  const black = restoreSlot(saved.black);
  if (!white || !black) return null;
  return {
    board: saved.board,
    white,
    black,
    result: saved.result,
    startedAt: saved.startedAt,
    captured: saved.captured,
  };
}

export function loadSavedAiGame(query: string): SavedAiGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_AI_GAME_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedAiGame;
    if (saved.version !== 1 || saved.query !== query) return null;
    if (saved.myColor !== "w" && saved.myColor !== "b") return null;
    return saved;
  } catch {
    return null;
  }
}

export function restoreSavedAiGame(saved: SavedAiGame): NerfGame | null {
  return restoreGameSnapshot(saved.game);
}

export function saveAiGame(input: {
  query: string;
  myColor: Color;
  game: NerfGame;
  whiteMs: number;
  blackMs: number;
  premoves: QueuedPremove[];
  whiteCustomSpec?: CustomNerf | null;
  blackCustomSpec?: CustomNerf | null;
}) {
  if (typeof window === "undefined") return;
  const white = saveSlot(input.game.white, input.whiteCustomSpec);
  const black = saveSlot(input.game.black, input.blackCustomSpec);
  if (!white || !black) return;
  const saved: SavedAiGame = {
    version: 1,
    query: input.query,
    myColor: input.myColor,
    whiteMs: input.whiteMs,
    blackMs: input.blackMs,
    premoves: [],
    game: {
      board: input.game.board,
      white,
      black,
      result: input.game.result,
      startedAt: input.game.startedAt,
      captured: input.game.captured,
    },
  };
  window.localStorage.setItem(ACTIVE_AI_GAME_KEY, JSON.stringify(saved));
}

export function clearSavedAiGame() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_AI_GAME_KEY);
}
