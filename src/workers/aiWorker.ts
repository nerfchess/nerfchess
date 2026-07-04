// Web worker that runs the bot's move search off the main thread, so the UI
// (board, clocks, input) never freezes while the bot thinks. The game arrives
// as a structured-clone-safe snapshot and is rebuilt here; only the chosen
// move's UCI string travels back.
import { pickAIMove, type AILevel } from "@/engine/ai";
import { moveToUCI } from "@/engine/board";
import { restoreGameSnapshot, type SavedGameSnapshot } from "@/lib/gamePersistence";

export type AIWorkerRequest = {
  id: number;
  snapshot: SavedGameSnapshot;
  level: AILevel;
  budgetMs?: number;
};

export type AIWorkerResponse = {
  id: number;
  uci: string | null;
  error?: string;
};

const reply = (message: AIWorkerResponse) => {
  (self as unknown as { postMessage: (m: AIWorkerResponse) => void }).postMessage(message);
};

self.onmessage = (event: MessageEvent<AIWorkerRequest>) => {
  const { id, snapshot, level, budgetMs } = event.data;
  try {
    const game = restoreGameSnapshot(snapshot);
    const move = game && !game.result ? pickAIMove(game, level, budgetMs) : null;
    reply({ id, uci: move ? moveToUCI(move) : null });
  } catch (err) {
    reply({ id, uci: null, error: String(err) });
  }
};
