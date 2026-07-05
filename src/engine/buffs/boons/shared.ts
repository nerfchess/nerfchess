// Shared surface for the expanded nerf-relief boon library. A boon is a buff
// with category "nerf": it softens or removes YOUR OWN nerf. Relief works two
// ways, both already understood by the engine:
//   - add a { kind:"nerf_suspended", owner:api.me, turns } effect (nerfDisabled
//     returns true while it is active), or
//   - call api.removeMyNerf() for a permanent break.
// Conditional boons re-arm a 1-turn suspension from a passive onMovePlayed hook
// that fires on the opponent's move (which immediately precedes your turn).

import { isInCheck } from "../../board";
import { Buff, BuffApi, BuffInstance } from "../../buff";
import { Tier } from "../../nerf";
import { Color, FILE, Move, RANK, Square } from "../../types";
import {
  activatedSimple,
  addEffect,
  extraMovesNow,
  instant,
  mySquares,
  skipOpponent,
} from "../helpers";

export { isInCheck, addEffect, mySquares, instant, FILE, RANK };
export type { Buff, BuffApi, BuffInstance, Color, Move, Square, Tier };

export type Mech = Partial<Buff> & Pick<Buff, "kind">;

export type BoonMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  flavor?: string;
};

export function boon(meta: BoonMeta, mech: Mech): Buff {
  return { ...meta, category: "nerf", implemented: true, ...mech };
}

export function tierBoons(tier: Tier) {
  return (meta: Omit<BoonMeta, "tier">, mech: Mech): Buff =>
    boon({ ...meta, tier }, mech);
}

// --- Relief builders ---------------------------------------------------------

/** Instant: suspend my nerf for my next `turns` turns. */
export function suspend(turns: number): Mech {
  return instant((_inst, api) =>
    addEffect(api, { kind: "nerf_suspended", owner: api.me, turns }),
  );
}

/** Free action: suspend my nerf for my next `turns` turns, used when I choose
 * (does not cost my turn). */
export function suspendFree(turns: number): Mech {
  return {
    ...activatedSimple((_inst, api) =>
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns }),
    ),
    freeAction: true,
  };
}

/** Instant: remove my nerf permanently. */
export function breakNerf(): Mech {
  return instant((_inst, api) => api.removeMyNerf());
}

/** Instant: remove my nerf permanently, plus a bonus side effect. */
export function breakNerfPlus(extra: (api: BuffApi) => void): Mech {
  return instant((_inst, api) => {
    api.removeMyNerf();
    extra(api);
  });
}

/** Passive: after my next `turns` completed turns, my nerf is removed for good. */
export function breakNerfAfter(turns: number): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.me) return;
      const left = ((inst.state.turns as number) ?? 0) - 1;
      inst.state.turns = left;
      if (left <= 0) {
        api.removeMyNerf();
        inst.spent = true;
      }
    },
    status: (inst) => `${(inst.state.turns as number) ?? 0} turns to freedom`,
  };
}

/** Passive: each of my next `charges` captures suspends my nerf for `turns`. */
export function suspendOnMyCapture(turns: number, charges: number): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.me || !move.captured) return;
      const left = (inst.state.charges as number) ?? 0;
      if (left <= 0) return;
      inst.state.charges = left - 1;
      if (left - 1 <= 0) inst.spent = true;
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns });
    },
    status: (inst) => `${(inst.state.charges as number) ?? charges} captures banked`,
  };
}

/** Passive: each of the next `charges` times the opponent captures one of my
 * pieces, my nerf is suspended for `turns`. */
export function suspendOnMyLoss(turns: number, charges: number): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.opp || !move.captured) return;
      const left = (inst.state.charges as number) ?? 0;
      if (left <= 0) return;
      inst.state.charges = left - 1;
      if (left - 1 <= 0) inst.spent = true;
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns });
    },
    status: (inst) => `${(inst.state.charges as number) ?? charges} reprisals left`,
  };
}

/** Passive: my nerf is suspended for a turn whenever `pred` holds at the start
 * of that turn (checked on the opponent's preceding move). Permanent while held
 * unless a `charges` cap is given. */
export function suspendWhile(
  pred: (api: BuffApi) => boolean,
  label: string,
  charges?: number,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      if (charges != null) inst.state.charges = charges;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.opp) return;
      if (!pred(api)) return;
      if (charges != null) {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      }
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 1 });
    },
    status: () => label,
  };
}

/** Passive: each of my next `charges` moves that satisfy `pred` (checked after
 * the move resolves) suspends my nerf for `turns`. Use for "on promotion", "on
 * castling", "when you give check", "when you move your king", etc. */
export function suspendOnMyMoveWhen(
  turns: number,
  charges: number,
  pred: (move: Move, api: BuffApi) => boolean,
  label: string,
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.charges = charges;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.me || !pred(move, api)) return;
      const left = (inst.state.charges as number) ?? 0;
      if (left <= 0) return;
      inst.state.charges = left - 1;
      if (left - 1 <= 0) inst.spent = true;
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns });
    },
    status: () => label,
  };
}

/** Move predicates for suspendOnMyMoveWhen. `gaveCheck` reads the board AFTER
 * the move resolved, so isInCheck on the opponent means I just checked them. */
export const onPromotion = (m: Move) => m.promotion != null;
export const onCastle = (m: Move) => m.castle != null;
export const onKingMove = (m: Move) => m.piece === "k";
export const gaveCheck = (_m: Move, api: BuffApi) => isInCheck(api.board, api.opp);

// --- Condition predicates for suspendWhile -----------------------------------

export const inCheck = (api: BuffApi) => isInCheck(api.board, api.me);
export const behindOnMaterial = (api: BuffApi) =>
  mySquares(api.board, api.me).length < mySquares(api.board, api.opp).length;
export const haveNoQueen = (api: BuffApi) => mySquares(api.board, api.me, "q").length === 0;

export { extraMovesNow, skipOpponent };
