// Funny set: SENT TO YOUR OPPONENT. Meta gags shaped like the junk your
// machine throws at you: a fake antivirus quarantine sweep (freeze random
// pieces), a Blue Screen crash (clock drain), a forced "update 1 of 3"
// (per-turn clock drain), a phishing snoop (reveal their nerf + peek their
// offer), a pop-up storm (void traps on their half), a captcha lock (their
// most-spammed piece type freezes up), a chain letter that keeps forwarding
// itself to a new random piece each turn (hopping freeze), a donation/raid
// alert (you gain clock, they lose some), and a ratio (their last capturing
// piece gets bonked back toward home). Every card reuses an existing engine
// primitive or a small self-contained rider modeled on one; all randomness is
// the seeded api.rng, all clock work goes through api.adjustClock, kings are
// never frozen or trapped, and no opponent move list is ever emptied.

import {
  Buff,
  BuffApi,
  BuffInstance,
  BuffTarget,
  BuffPick,
  Move,
  Square,
  card,
  activated,
  addEffect,
  curse,
  emptySquares,
  inHalf,
  instant,
  mySquares,
  pawnRankOk,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

// ---------------------------------------------------------------------------
// Local rider: freeze ONE random enemy non-king piece (deterministic api.rng),
// skipping the square it last landed on so a hopping curse always moves. Kings
// are never eligible. Drawn only inside init / onMovePlayed (replayed paths).
// ---------------------------------------------------------------------------
function freezeRandomEnemy(
  api: BuffApi,
  inst: BuffInstance,
  turns: number,
  skin: "bubble" | "petal" | "web",
) {
  const cands = mySquares(api.board, api.opp).filter(
    (sq) => api.board.pieces[sq]!.type !== "k" && sq !== inst.state.lastSq,
  );
  if (cands.length === 0) return;
  const sq = cands[api.rng.int(cands.length)];
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns, skin });
  inst.state.lastSq = sq;
}

// ---------------------------------------------------------------------------
// Local rider: place `count` void squares on the OPPONENT'S half. Mirrors the
// voidSquares helper (activated, spendOnUse false, ticks its own timer, and
// swallows any enemy non-king piece that moves onto one) but restricts the
// candidate squares to the opponent's side of the board. A void only fires if
// the opponent voluntarily steps a piece onto it, so it can never strand them.
// ---------------------------------------------------------------------------
function popupVoids(count: number, turns: number) {
  return {
    kind: "activated" as const,
    spendOnUse: false,
    targets: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]): BuffTarget | null =>
      picks.length >= count || inst.state.squares != null
        ? null
        : {
            kind: "square" as const,
            label:
              count > 1
                ? `Choose where a pop-up blocks their half (${picks.length + 1}/${count})`
                : "Choose where the pop-up blocks their half",
            squares: emptySquares(api.board, (sq) => inHalf(api.opp, sq)).filter(
              (sq) => !picks.some((k) => k.square === sq),
            ),
          },
    effect: (inst: BuffInstance, _api: BuffApi, picks: BuffPick[]) => {
      if (inst.state.squares != null) return;
      inst.state.squares = picks.map((k) => k.square).filter((s): s is Square => s != null);
      inst.state.turns = turns;
    },
    onMovePlayed: (inst: BuffInstance, move: Move, api: BuffApi) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return;
      if (move.color === api.opp && squares.includes(move.to) && move.piece !== "k") {
        api.removePiece(move.to);
      }
      tickTurns(inst, move, api.me);
    },
    status: (inst: BuffInstance) => {
      const squares = inst.state.squares as Square[] | undefined;
      if (!squares?.length) return "activate to launch the pop-ups";
      const names = squares.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
      return `pop-ups blocking ${names}, ${turnsLeft(inst)} of your turns left`;
    },
  };
}

export const FUNNY_PRANKS: Buff[] = [
  card(
    {
      id: "pr_phishing",
      name: "Phishing Email",
      description:
        "You are the prince now: a spoofed email talks your opponent out of their secrets. Reveal their hidden nerf for the rest of the game, and peek at the cards in their next draft offer.",
      tier: 3,
      category: "info",
      boon: true,
      flavor: "Dear valued user, kindly confirm your entire hand. Warm regards.",
    },
    instant((_inst, api) => {
      api.mine.oppNerfRevealed = true;
      api.mine.flags.seeOppCards = true;
    }),
  ),
  card(
    {
      id: "pr_donation_alert",
      name: "Subscriber Raid",
      description:
        "A fake donation alert blasts across the board and the raid pours in: add 25 seconds to your clock while your opponent loses 10 to the chaos. You also gain a draft reroll and see the tier of their next offer. In untimed games only the reroll and the reveal apply.",
      tier: 3,
      category: "tempo",
      flavor: "ChessLord420 donated 5 dollars: get good lmao",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 25, subOppSec: 10 });
      // The clock swing is a no-op in an untimed game, so always land two draft
      // effects: a reroll and a peek at the tier of their next offer.
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  card(
    {
      id: "pr_bsod",
      name: "Blue Screen of Death",
      description:
        "Their whole board bluescreens and reboots: collecting error info, then a slow restart. Your opponent's clock loses 35 seconds.",
      tier: 2,
      category: "tempo",
      flavor: "A problem has been detected and NerfChess has been shut down. :(",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 35 });
    }),
  ),
  card(
    {
      id: "pr_forced_update",
      name: "Forced Update",
      description:
        "Installing update 1 of 3, do not turn off your opponent. A progress bar crawls: at the end of each of their next 3 turns their clock loses 8 seconds.",
      tier: 2,
      category: "tempo",
      flavor: "This will only take a moment. (It will not only take a moment.)",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.ticks = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const left = (inst.state.ticks as number) ?? 0;
        if (left <= 0) return;
        api.adjustClock({ subOppSec: 8 });
        inst.state.ticks = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `installing update ${4 - ((inst.state.ticks as number) ?? 3)} of 3`,
    },
  ),
  card(
    {
      id: "pr_defender_scan",
      name: "NerfChess Defender",
      description:
        "Threat detected. A fake antivirus sweeps their board and quarantines up to 2 random enemy pieces: they cannot move for 2 of your opponent's turns. Kings are too big to quarantine.",
      tier: 3,
      category: "tempo",
      flavor: "Real-time protection is protecting nothing in real time.",
      fx: { motif: "jail", pieces: "all" },
    },
    instant((_inst, api) => {
      const pool = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      const take = Math.min(2, pool.length);
      for (let i = 0; i < take; i++) {
        const idx = api.rng.int(pool.length);
        const sq = pool.splice(idx, 1)[0];
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "bubble" });
      }
    }),
  ),
  card(
    {
      id: "pr_captcha",
      name: "Captcha Check",
      description:
        "Select all squares with a bicycle to continue. Verification fails: whichever piece type your opponent has moved the most is locked and cannot move for their next turn.",
      tier: 4,
      category: "tempo",
      flavor: "I am not a robot. [ ] I am not a robot. [x] Access denied.",
      fx: { motif: "jail" },
    },
    curse(1, (moves, api) => {
      // Deterministic read of the synced move history: count the opponent's
      // moves by piece type (kings excluded, they can never be locked) and
      // lock the most-moved type. The curse wrapper restores the full list if
      // this would leave zero moves, so it can never soft-lock a turn.
      const counts: Partial<Record<string, number>> = {};
      for (const m of api.board.history) {
        if (m.color !== api.opp || m.piece === "k") continue;
        counts[m.piece] = (counts[m.piece] ?? 0) + 1;
      }
      let locked: string | null = null;
      let best = 0;
      for (const t of ["p", "n", "b", "r", "q"]) {
        const c = counts[t] ?? 0;
        if (c > best) {
          best = c;
          locked = t;
        }
      }
      if (locked == null) return moves;
      return moves.filter((m) => m.piece !== locked);
    }),
  ),
  card(
    {
      id: "pr_popup_storm",
      name: "Pop-up Storm",
      description:
        "HOT DEALS raining on their side: plant 1 pop-up window on an empty square in your opponent's half. For your next 5 turns, any enemy piece that clicks onto it (a king is too careful to) is closed out of the game.",
      tier: 4,
      category: "protection",
      flavor: "You are the 1,000,000th visitor. Your knight has been selected.",
    },
    popupVoids(1, 5),
  ),
  card(
    {
      id: "pr_chain_letter",
      name: "Chain Letter",
      description:
        "Forward to 10 friends or else: a cursed email hops around their army. One random enemy piece freezes each of your opponent's next 3 turns, jumping to a different piece every time. Never a king.",
      tier: 4,
      category: "tempo",
      flavor: "Grandma forwarded this. Now it is legally your problem.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.remaining = 2;
        freezeRandomEnemy(api, inst, 1, "petal");
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const rem = (inst.state.remaining as number) ?? 0;
        if (rem <= 0) {
          inst.spent = true;
          return;
        }
        freezeRandomEnemy(api, inst, 2, "petal");
        inst.state.remaining = rem - 1;
      },
      status: (inst) => `forwarding: ${(inst.state.remaining as number) ?? 0} more hops`,
    },
  ),
  card(
    {
      id: "pr_ratiod",
      name: "Ratio'd",
      description:
        "Nobody asked, plus you fell off: if your opponent captured a piece on their last turn, that piece gets bonked straight back toward its own side by up to 2 squares.",
      tier: 4,
      category: "attack",
      flavor: "L + ratio + skill issue + it is your move now.",
    },
    instant((_inst, api) => {
      const hist = api.board.history;
      const last = hist[hist.length - 1];
      if (!last || last.color !== api.opp || !last.captured) return;
      const sq = last.to;
      const p = api.board.pieces[sq];
      if (!p || p.color !== api.opp || p.type === "k") return;
      // "Home" is the opponent's own back rank: rank 0 for white, rank 7 for
      // black. Walk straight back along the file to the farthest empty square
      // within 2 squares, stopping at the first blocker; never park a pawn on a
      // back rank (illegal), and never move if fully boxed in.
      const dir = api.opp === "w" ? -1 : 1;
      const f = FILE(sq);
      let best: Square | null = null;
      for (let step = 1; step <= 2; step++) {
        const r = RANK(sq) + dir * step;
        if (!inBoard(f, r)) break;
        const to = SQ(f, r);
        if (api.board.pieces[to]) break;
        if (p.type === "p" && !pawnRankOk(to)) break;
        best = to;
      }
      if (best != null) api.relocate(sq, best);
    }),
  ),
];
