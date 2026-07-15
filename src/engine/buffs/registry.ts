import type { Buff } from "../buff";

// A late-bound handle to the full card map (library.ts's BUFF_BY_ID), populated
// once when library.ts finishes building it. This lives in its own tiny module
// with NO card imports, so a card-definition module can look a card up by id
// WITHOUT importing library.ts directly — importing library would form a
// library <-> card-module import cycle that TDZ-crashes ("Cannot access X before
// initialization") under some module-evaluation orders (e.g. the /codex
// prerender graph). Any effect that reads this runs long after module load, by
// which point library.ts has populated it.
export const buffRegistry: { byId: Record<string, Buff> } = { byId: {} };
