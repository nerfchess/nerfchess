// Funny set: TERMINALLY ONLINE. Meta gags about games, drafts, clocks, and
// internet brainrot: crash their draft client (blockedDrafts), buy both cards
// (takeBoth), ship them a day-one nerf (nullifyIncoming), snipe their stream
// (nerf reveal + prepThree), lag their clock (adjustClock), send them outside
// (skipOpponent), Ctrl+Z a capture (reviveOne), bonk with a rubber chicken
// (walnut), cover the board in a pop-up ad (summonTemp), mute their heavy
// hitters (curse), hand out a skill issue (curse), promote one piece to main
// character (shield), spin up a smurf (placePieces), pocket an emotional
// support pawn (grantInventory), and swing the ban hammer (removeEnemies).
// Every card reuses an existing primitive; every opponent filter is partial so
// nothing can soft-lock, and kings are never targeted.

import { Buff, Move, Square } from "./shared";
import {
  card,
  curse,
  dist,
  activated,
  addEffect,
  anyEmptyZone,
  emptySquares,
  instant,
  mySquares,
  myHalfZone,
  placePieces,
  relRank,
  removeEnemies,
  reviveOne,
  tickTurns,
  turnsLeft,
  timedAugment,
  summonTemp,
} from "./shared";

export const FUNNY_META: Buff[] = [
  card(
    {
      id: "emotional_support_pawn",
      name: "Emotional Support Pawn",
      description:
        "A small round friend refuses to leave your side: place a new pawn on an empty square right beside your king.",
      tier: 3,
      category: "pieces",
      flavor: "It cannot play chess. It believes in you SO much.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const k = mySquares(api.board, api.me, "k")[0];
        const squares: number[] = [];
        if (k != null) {
          for (const df of [-1, 0, 1]) {
            for (const dr of [-1, 0, 1]) {
              if (df === 0 && dr === 0) continue;
              const f = (k % 8) + df, r = Math.floor(k / 8) + dr;
              if (f < 0 || f > 7 || r < 1 || r > 6) continue;
              const sq = f + r * 8;
              if (!api.board.pieces[sq]) squares.push(sq);
            }
          }
        }
        return { kind: "square", label: "Choose where your friend stands", squares };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        if (Math.floor(sq / 8) < 1 || Math.floor(sq / 8) > 6) return;
        api.place(sq, "p", api.me);
      },
    ),
  ),
  card(
    {
      id: "stream_sniper",
      name: "Stream Sniper",
      description:
        "You found their stream: see your opponent's nerf for the rest of the game, and your own next draft shows three cards to pick from.",
      tier: 1,
      category: "info",
      boon: true,
      flavor: "Thanks for the content, streamer.",
    },
    // Reworked for the full-transparency era (offer tiers are public): sniping
    // the stream now reads the one secret left (their nerf) and preps your
    // counters. Unique combo: Extra Glance is the reveal alone, Prep the
    // three-card offer alone. Tier 2 = the sum of those two tier-1 pieces.
    instant((_inst, api) => {
      api.mine.oppNerfRevealed = true;
      api.mine.flags.prepThree = true;
    }),
  ),
  card(
    {
      id: "lag_spike",
      name: "Lag Spike",
      description:
        "Their connection chooses violence: your opponent's clock loses 30 seconds. You also gain a draft reroll and see the tier of their next offer. In untimed games only the reroll and the reveal apply.",
      tier: 3,
      category: "tempo",
      flavor: "It is not the wifi. It is never the wifi. It is the wifi.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 30 });
      // The clock hit is a no-op in an untimed game, so pair it with two draft
      // effects that always land: a reroll and a peek at their next offer tier.
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  card(
    {
      id: "ctrl_z",
      name: "Ctrl+Z",
      description:
        "Undo, but the tape rewinds a beat late: only after your opponent's next move may you return one of your captured pawns, knights, or bishops to an empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "History is written by whoever holds the keyboard.",
    },
    // Preserve the revive payoff, but delay its first use: the card stays
    // unusable until the opponent has played one move after it is drafted.
    (() => {
      const base = reviveOne(["p", "n", "b"], myHalfZone);
      return {
        ...base,
        init: (inst) => {
          inst.state.ready = false;
        },
        targets: (inst, api, picks) =>
          inst.state.ready ? base.targets!(inst, api, picks) : null,
        onMovePlayed: (inst, move, api) => {
          if (!inst.state.ready && move.color === api.opp) inst.state.ready = true;
        },
        status: (inst) =>
          inst.state.ready ? "undo ready" : "buffering: waiting for their reply",
      };
    })(),
  ),
  card(
    {
      id: "rubber_chicken",
      name: "Rubber Chicken",
      description:
        "Bonk one enemy piece with a rubber chicken. It gets one escape move; wherever it lands it is then dazed and can only shuffle one square at a time for 2 of their turns. Kings cannot be bonked.",
      tier: 3,
      category: "hex",
      flavor: "Squeak. Squeak. Checkmate energy.",
      fx: { motif: "jail", pieces: "all" },
    },
    // The bonk still lands, but the target gets one legal escape move first: the
    // daze (a walnut, one-square shuffles) is applied only after that piece next
    // moves, landing on wherever it ends up. Added inside the opponent's move
    // hook, so the immediate same-color tick eats one turn: ask for 3 to leave 2.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to bonk",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.from === sq && move.color === api.opp) {
          addEffect(api, { kind: "walnut", sq: move.to, owner: api.opp, turns: 3 });
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to bonk" : "the daze lands after its escape move",
    },
  ),
  card(
    {
      id: "day_one_patch",
      name: "Day One Patch",
      description:
        "The devs buffed pawns, but only in YOUR build: for your next 2 turns your pawns may also step one square diagonally forward onto empty squares (never onto the last rank).",
      tier: 4,
      category: "movement",
      requires: ["p"],
      flavor: "Known issues: everything. Fix ETA: soon (tm).",
      fx: { motif: "empower", pieces: ["p"], self: true },
    },
    timedAugment(2, (_m, inst, api) => {
      const out: Move[] = [];
      const fwd = api.me === "w" ? 1 : -1;
      for (const sq of mySquares(api.board, api.me, "p")) {
        for (const df of [-1, 1]) {
          const f = (sq % 8) + df, r = Math.floor(sq / 8) + fwd;
          if (f < 0 || f > 7 || r < 1 || r > 6) continue;
          const to = f + r * 8;
          if (!api.board.pieces[to]) {
            out.push({ from: sq, to, piece: "p", color: api.me, via: inst.id });
          }
        }
      }
      return out;
    }),
  ),
  card(
    {
      id: "battle_pass",
      name: "Battle Pass",
      description:
        "Season rewards trickle in: at the end of each of your next 6 turns, your clock gains 10 seconds.",
      tier: 2,
      category: "tempo",
      flavor: "Only 99 more tiers of grinding to go.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.ticks = 6;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        const left = (inst.state.ticks as number) ?? 0;
        if (left <= 0) return;
        api.adjustClock({ addSelfSec: 10 });
        inst.state.ticks = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) => `rewards: ${(inst.state.ticks as number) ?? 0} daily logins left`,
    },
  ),
  card(
    {
      id: "pop_up_ad",
      name: "Pop-up Ad",
      description:
        "An ad nobody can close appears on the board: place a knight on any empty square. It is finally dismissed after 4 of your turns.",
      tier: 5,
      category: "pieces",
      flavor: "HOT SINGLES IN YOUR HALF OF THE BOARD.",
    },
    summonTemp("n", 4, anyEmptyZone),
  ),
  card(
    {
      id: "mute_button",
      name: "Mute Button",
      description:
        "You mute the loudest voices in their army: for their next 3 turns your opponent's queen and rooks cannot capture. The first of those pieces they move gets one free move before the mute takes hold.",
      tier: 4,
      category: "hex",
      flavor: "You are now watching their attack on read.",
      fx: { motif: "muzzle", pieces: ["q", "r"] },
    },
    // Preserve the 3-turn duration, but the first queen or rook the opponent
    // moves is an unrestricted escape; the no-capture mute bites from the move
    // after that, ticking across the same 3 of their turns.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.escaped = false;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || !inst.state.escaped || moves.length === 0) return moves;
        const kept = moves.filter(
          (m) => !(m.captured && (m.piece === "q" || m.piece === "r")),
        );
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (turnsLeft(inst) <= 0) return;
        if (
          !inst.state.escaped &&
          move.color === api.opp &&
          (move.piece === "q" || move.piece === "r")
        ) {
          inst.state.escaped = true;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.escaped
          ? `${turnsLeft(inst)} of their turns left`
          : "one free move, then muted",
    },
  ),
  card(
    {
      id: "skill_issue",
      name: "Skill Issue",
      description:
        "Diagnosis delivered: their minor pieces whiff every attack: enemy knights and bishops cannot capture for their next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "Have you tried simply being better?",
      fx: { motif: "muzzle", pieces: ["n", "b"] },
    },
    curse(3, (moves) =>
      moves.filter((m) => !(m.captured && (m.piece === "n" || m.piece === "b"))),
    ),
  ),
  card(
    {
      id: "alt_f4",
      name: "Alt+F4",
      description:
        "Their whole client crashes to desktop and takes a minute to reboot: your opponent's clock loses 60 seconds.",
      tier: 3,
      category: "tempo",
      flavor: "Press Alt+F4 for free rating points, they said.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 60 });
    }),
  ),
  card(
    {
      id: "touch_grass",
      name: "Touch Grass",
      description:
        "You step outside for your own good: add 30 seconds to your clock, and your nerf is suspended for your next 2 turns.",
      tier: 2,
      category: "nerf",
      flavor: "The sun. The big lamp in the sky. Go look at it.",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 30 });
      addEffect(api, { kind: "nerf_suspended", owner: api.me, turns: 2 });
    }),
  ),
  card(
    {
      id: "main_character",
      name: "Main Character",
      description:
        "One of your pieces gets plot armor: it cannot be captured for your opponent's next 4 turns, but the armor drops the instant it makes a capture.",
      tier: 5,
      category: "protection",
      flavor: "The sequel is already greenlit. It cannot die here.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    // Full 4-turn shield, but the plot armor ends the moment the protected
    // piece captures: on that capture we strip its shield square before the
    // shield-follow can carry the ward onto the piece's new home.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose this season's main character",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 4 });
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.from === sq && move.color === api.me) {
          if (move.captured) {
            for (const e of api.bs.effects) {
              if (e.kind === "shield" && e.owner === api.me && e.squares) {
                e.squares = e.squares.filter((s) => s !== sq);
              }
            }
            inst.spent = true;
            inst.state.sq = undefined;
            return;
          }
          inst.state.sq = move.to;
        } else if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to crown a lead" : "plot armor holds until it captures",
    },
  ),
  card(
    {
      id: "smurf_account",
      name: "Smurf Account",
      description:
        "A suspiciously strong new player joins your side mid-game: place a fresh rook on an empty square in your half.",
      tier: 6,
      category: "pieces",
      flavor: "Total games played: 3. Accuracy: 99 percent.",
    },
    placePieces(["r"], myHalfZone),
  ),
  card(
    {
      id: "pay_to_win",
      name: "Pay to Win",
      description:
        "Money buys more of whatever is working: choose one of your knights, bishops, or rooks, and a store-bought copy of it joins your pocket, ready to drop onto an empty square on a later turn.",
      tier: 6,
      category: "pieces",
      requires: ["n", "b", "r"],
      flavor: "It is not gambling if you always win.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to buy another of",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const t = api.board.pieces[sq]?.type;
        if (t === "n" || t === "b" || t === "r") {
          const pocket = (api.mine.inventory ??= {});
          pocket[t] = (pocket[t] ?? 0) + 1;
        }
      },
    ),
  ),
  card(
    {
      id: "ban_hammer",
      name: "Ban Hammer",
      description:
        "Moderator privileges activated: point at one enemy knight, bishop, or rook, and EVERY enemy piece of that type is permanently banned from the board.",
      tier: 8,
      category: "attack",
      flavor: "Reason: no reason given. Appeals: closed.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Point the hammer at the piece type to ban",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp) return;
        const banned = p.type;
        if (banned === "k" || banned === "q" || banned === "p") return;
        for (const s of mySquares(api.board, api.opp, banned)) api.removePiece(s);
      },
    ),
  ),
];
