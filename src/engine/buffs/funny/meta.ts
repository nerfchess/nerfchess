// Funny set: TERMINALLY ONLINE. Meta gags about games, drafts, clocks, and
// internet brainrot: crash their draft client (blockedDrafts), buy both cards
// (takeBoth), ship them a day-one nerf (nullifyIncoming), read their stream
// (info flags), lag their clock (adjustClock), send them outside
// (skipOpponent), Ctrl+Z a capture (reviveOne), bonk with a rubber chicken
// (walnut), cover the board in a pop-up ad (summonTemp), mute their heavy
// hitters (curse), hand out a skill issue (curse), promote one piece to main
// character (shield), spin up a smurf (placePieces), pocket an emotional
// support pawn (grantInventory), and swing the ban hammer (removeEnemies).
// Every card reuses an existing primitive; every opponent filter is partial so
// nothing can soft-lock, and kings are never targeted.

import { Buff } from "./shared";
import {
  card,
  curse,
  dist,
  activated,
  addEffect,
  anyEmptyZone,
  grantInventory,
  instant,
  mySquares,
  myHalfZone,
  petrifyTarget,
  placePieces,
  removeEnemies,
  reviveOne,
  skipOpponent,
  summonTemp,
} from "./shared";

export const FUNNY_META: Buff[] = [
  card(
    {
      id: "emotional_support_pawn",
      name: "Emotional Support Pawn",
      description:
        "A small round friend joins your pocket: add a pawn to your pocket, then spend a later turn to drop it onto any empty square.",
      tier: 2,
      category: "pieces",
      flavor: "It cannot play chess. It believes in you SO much.",
    },
    instant((_inst, api) => grantInventory(api, "p", 1)),
  ),
  card(
    {
      id: "stream_sniper",
      name: "Stream Sniper",
      description:
        "You found their stream on a two second delay: see your opponent's next card options and the tier of their next draft.",
      tier: 3,
      category: "info",
      boon: true,
      flavor: "Thanks for the content, streamer.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
      api.mine.flags.seeOppTier = true;
    }),
  ),
  card(
    {
      id: "lag_spike",
      name: "Lag Spike",
      description:
        "Their connection chooses violence: your opponent's clock loses 25 seconds.",
      tier: 3,
      category: "tempo",
      flavor: "It is not the wifi. It is never the wifi. It is the wifi.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 25 });
    }),
  ),
  card(
    {
      id: "ctrl_z",
      name: "Ctrl+Z",
      description:
        "Undo. One of your captured pawns, knights, or bishops returns to an empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "History is written by whoever holds the keyboard.",
    },
    reviveOne(["p", "n", "b"], myHalfZone),
  ),
  card(
    {
      id: "rubber_chicken",
      name: "Rubber Chicken",
      description:
        "Bonk one enemy piece with a rubber chicken. It is too embarrassed to move for 2 of their turns. Kings cannot be bonked.",
      tier: 3,
      category: "hex",
      flavor: "Squeak. Squeak. Checkmate energy.",
      fx: { motif: "jail", pieces: "all" },
    },
    petrifyTarget(2, "Choose the enemy piece to bonk"),
  ),
  card(
    {
      id: "day_one_patch",
      name: "Day One Patch",
      description:
        "Ship your opponent the launch build: their next drafted card arrives nullified and does nothing.",
      tier: 4,
      category: "draft",
      flavor: "Known issues: everything. Fix ETA: soon (tm).",
    },
    instant((_inst, api) => {
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "battle_pass",
      name: "Battle Pass",
      description:
        "Season rewards unlocked: add 45 seconds to your own clock.",
      tier: 4,
      category: "tempo",
      flavor: "Only 99 more tiers of grinding to go.",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 45 });
    }),
  ),
  card(
    {
      id: "pop_up_ad",
      name: "Pop-up Ad",
      description:
        "An ad nobody can close appears on the board: place a knight on any empty square. It is finally dismissed after 4 of your turns.",
      tier: 4,
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
        "You mute the loudest voices in their army: for their next 3 turns your opponent's queen and rooks cannot capture.",
      tier: 4,
      category: "hex",
      flavor: "You are now watching their attack on read.",
      fx: { motif: "muzzle", pieces: ["q", "r"] },
    },
    curse(3, (moves) =>
      moves.filter((m) => !(m.captured && (m.piece === "q" || m.piece === "r"))),
    ),
  ),
  card(
    {
      id: "skill_issue",
      name: "Skill Issue",
      description:
        "Diagnosis delivered: for their next 3 turns none of your opponent's pieces may move more than two squares.",
      tier: 4,
      category: "hex",
      flavor: "Have you tried simply being better?",
      fx: { motif: "slow", pieces: "all" },
    },
    curse(3, (moves) => moves.filter((m) => dist(m.from, m.to) <= 2)),
  ),
  card(
    {
      id: "alt_f4",
      name: "Alt+F4",
      description:
        "Their draft client crashes to desktop: your opponent's next card draft is skipped entirely.",
      tier: 5,
      category: "draft",
      flavor: "Press Alt+F4 for free rating points, they said.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "touch_grass",
      name: "Touch Grass",
      description:
        "You send your opponent outside for their own good: they skip their next turn.",
      tier: 5,
      category: "tempo",
      flavor: "The sun. The big lamp in the sky. Go look at it.",
    },
    skipOpponent(1),
  ),
  card(
    {
      id: "main_character",
      name: "Main Character",
      description:
        "One of your pieces gets plot armor: it cannot be captured for your opponent's next 4 turns.",
      tier: 5,
      category: "protection",
      flavor: "The sequel is already greenlit. It cannot die here.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose this season's main character",
              squares: mySquares(api.board, api.me).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        if (picks[0]?.square != null) {
          addEffect(api, { kind: "shield", owner: api.me, squares: [picks[0].square], turns: 4 });
        }
      },
    ),
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
        "Swipe the card and skip the choice: at your next draft you take both offered cards instead of picking one.",
      tier: 6,
      category: "draft",
      flavor: "It is not gambling if you always win.",
    },
    instant((_inst, api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "ban_hammer",
      name: "Ban Hammer",
      description:
        "Moderator privileges activated: name two enemy knights, bishops, or rooks and they are permanently banned from the board.",
      tier: 8,
      category: "attack",
      flavor: "Reason: no reason given. Appeals: closed.",
    },
    removeEnemies(2, ["n", "b", "r"]),
  ),
];
