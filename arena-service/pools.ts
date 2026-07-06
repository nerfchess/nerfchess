import { randomBytes } from "node:crypto";

// Blitz time controls the arena spawns from — kept identical to QUEUE_POOLS in
// worker.ts. Each is (timeSec base + incrementSec). All are timed, so every
// game flags eventually (no untimed = no runaway).
export const QUEUE_POOLS: Record<string, { timeSec: number; incrementSec: number }> = {
  "1+0": { timeSec: 60, incrementSec: 0 },
  "2+1": { timeSec: 120, incrementSec: 1 },
  "3+0": { timeSec: 180, incrementSec: 0 },
  "3+2": { timeSec: 180, incrementSec: 2 },
  "5+0": { timeSec: 300, incrementSec: 0 },
  "5+3": { timeSec: 300, incrementSec: 3 },
  "10+0": { timeSec: 600, incrementSec: 0 },
  "10+5": { timeSec: 600, incrementSec: 5 },
  "15+10": { timeSec: 900, incrementSec: 10 },
};

// First move of each side gets 10 free seconds (mirror firstMoveGraceMs in worker.ts).
export const firstMoveGraceMs = 10 * 1000;

// Hard safety cap so no bot-vs-bot game can loop forever if the clock model ever
// under-deducts. Well above any realistic blitz game length.
export const MAX_PLIES = 800;

export const randomInt = (max: number): number => Math.floor(Math.random() * max);
export const makeSeed = (): number => randomInt(2 ** 31);
export const newId = (n = 8): string => randomBytes(n).toString("hex").slice(0, n);
