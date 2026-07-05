// Expanded nerf-relief boon library: 32 new fully wired boons (category "nerf")
// that soften or remove YOUR OWN nerf. Spread across timed suspensions, capture
// and loss triggers, in-check and material conditions, promotion / castle /
// king-move triggers, delayed breaks, and permanent breaks with a bonus.
// Ids here must not collide with the boons already in library.ts.

import { Buff } from "./shared";
import {
  tierBoons,
  suspend,
  suspendFree,
  breakNerf,
  breakNerfPlus,
  breakNerfAfter,
  suspendOnMyCapture,
  suspendOnMyLoss,
  suspendWhile,
  suspendOnMyMoveWhen,
  onPromotion,
  onCastle,
  onKingMove,
  gaveCheck,
  inCheck,
  behindOnMaterial,
  haveNoQueen,
  addEffect,
} from "./shared";

const T1 = tierBoons(1);
const T2 = tierBoons(2);
const T3 = tierBoons(3);
const T4 = tierBoons(4);
const T5 = tierBoons(5);
const T6 = tierBoons(6);
const T7 = tierBoons(7);
const T8 = tierBoons(8);

export const NEW_BOONS: Buff[] = [
  // --- TIER 1 -------------------------------------------------------------
  T1(
    { id: "catch_your_breath", name: "Catch Your Breath", description: "Suspend your nerf for your next turn.", flavor: "One clean breath." },
    suspend(1),
  ),
  T1(
    { id: "gulp_of_air", name: "Gulp of Air", description: "Your next capture suspends your nerf for your next turn.", flavor: "Room to breathe, bought with blood." },
    suspendOnMyCapture(1, 1),
  ),
  T1(
    { id: "glancing_blow", name: "Glancing Blow", description: "The next time your opponent captures one of your pieces, your nerf is suspended for your next turn." },
    suspendOnMyLoss(1, 1),
  ),
  T1(
    { id: "cold_sweat", name: "Cold Sweat", description: "The next time your king is in check, your nerf is suspended for that turn.", flavor: "Fear sharpens the mind." },
    suspendWhile(inCheck, "arms once while in check", 1),
  ),
  T1(
    { id: "coronation", name: "Coronation", description: "Your next pawn promotion suspends your nerf for your next turn." },
    suspendOnMyMoveWhen(1, 1, onPromotion, "arms on your next promotion"),
  ),

  // --- TIER 2 -------------------------------------------------------------
  T2(
    { id: "breather", name: "Breather", description: "Suspend your nerf for your next 2 turns." },
    suspend(2),
  ),
  T2(
    { id: "shrug_it_off", name: "Shrug It Off", description: "Free action: suspend your nerf for your next turn, used at the moment you choose." },
    suspendFree(1),
  ),
  T2(
    { id: "counterpunch", name: "Counterpunch", description: "Each of your next 2 captures suspends your nerf for your next turn." },
    suspendOnMyCapture(1, 2),
  ),
  T2(
    { id: "no_crown_no_law", name: "No Crown, No Law", description: "While you have no queen, your nerf is suspended.", flavor: "Nothing left to lose, nothing left to obey." },
    suspendWhile(haveNoQueen, "arms while you have no queen"),
  ),
  T2(
    { id: "castle_keep", name: "Castle Keep", description: "Castling suspends your nerf for your next 2 turns." },
    suspendOnMyMoveWhen(2, 1, onCastle, "arms when you castle"),
  ),

  // --- TIER 3 -------------------------------------------------------------
  T3(
    { id: "war_footing", name: "War Footing", description: "Each of your next 2 captures suspends your nerf for your next 2 turns." },
    suspendOnMyCapture(2, 2),
  ),
  T3(
    { id: "reprisal", name: "Reprisal", description: "Each of the next 2 times your opponent captures one of your pieces, your nerf is suspended for your next 2 turns." },
    suspendOnMyLoss(2, 2),
  ),
  T3(
    { id: "take_five", name: "Take Five", description: "Free action: suspend your nerf for your next 4 turns, used at the moment you choose." },
    suspendFree(4),
  ),
  T3(
    { id: "check_and_breathe", name: "Check and Breathe", description: "Each of your next 3 checks suspends your nerf for your next turn." },
    suspendOnMyMoveWhen(1, 3, gaveCheck, "arms when you give check"),
  ),
  T3(
    { id: "last_ditch", name: "Last Ditch", description: "While you have fewer pieces than your opponent, your nerf is suspended, up to 4 of your turns." },
    suspendWhile(behindOnMaterial, "arms while behind on material", 4),
  ),

  // --- TIER 4 -------------------------------------------------------------
  T4(
    { id: "clean_conscience", name: "Clean Conscience", description: "Suspend your nerf for your next 6 turns." },
    suspend(6),
  ),
  T4(
    { id: "bloodlust", name: "Bloodlust", description: "Each of your next 3 captures suspends your nerf for your next 3 turns." },
    suspendOnMyCapture(3, 3),
  ),
  T4(
    { id: "royal_march", name: "Royal March", description: "Each of your next 3 king moves suspends your nerf for your next 2 turns." },
    suspendOnMyMoveWhen(2, 3, onKingMove, "arms when your king moves"),
  ),
  T4(
    { id: "countdown_to_freedom", name: "Countdown to Freedom", description: "After your next 8 turns, your nerf is removed for good." },
    breakNerfAfter(8),
  ),

  // --- TIER 5 -------------------------------------------------------------
  T5(
    { id: "emancipation", name: "Emancipation", description: "After your next 5 turns, your nerf is removed for good." },
    breakNerfAfter(5),
  ),
  T5(
    { id: "relentless", name: "Relentless", description: "Each of your next 4 captures suspends your nerf for your next 3 turns." },
    suspendOnMyCapture(3, 4),
  ),
  T5(
    { id: "martyrs_reward", name: "Martyr's Reward", description: "Each of the next 4 times you lose a piece, your nerf is suspended for your next 3 turns." },
    suspendOnMyLoss(3, 4),
  ),
  T5(
    { id: "long_sabbath", name: "Long Sabbath", description: "Suspend your nerf for your next 8 turns." },
    suspend(8),
  ),

  // --- TIER 6 -------------------------------------------------------------
  T6(
    { id: "warlords_pardon", name: "Warlord's Pardon", description: "After your next 3 turns, your nerf is removed for good." },
    breakNerfAfter(3),
  ),
  T6(
    { id: "berserk", name: "Berserk", description: "Each of your next 5 captures suspends your nerf for your next 4 turns." },
    suspendOnMyCapture(4, 5),
  ),
  T6(
    { id: "iron_resolve", name: "Iron Resolve", description: "Each of the next 5 times you lose a piece, your nerf is suspended for your next 4 turns." },
    suspendOnMyLoss(4, 5),
  ),

  // --- TIER 7 -------------------------------------------------------------
  T7(
    { id: "clemency", name: "Clemency", description: "Remove your nerf for good, and your next draft rolls one tier higher." },
    breakNerfPlus((api) => {
      api.mine.flags.bankBonus = 1;
    }),
  ),
  T7(
    { id: "relentless_assault", name: "Relentless Assault", description: "Each of your next 6 captures suspends your nerf for your next 5 turns." },
    suspendOnMyCapture(5, 6),
  ),
  T7(
    { id: "long_furlough", name: "Long Furlough", description: "Suspend your nerf for your next 12 turns." },
    suspend(12),
  ),

  // --- TIER 8 -------------------------------------------------------------
  T8(
    { id: "apotheosis", name: "Apotheosis", description: "Remove your nerf for good and take two extra moves now." },
    breakNerfPlus((api) => {
      api.bs.extraMoves[api.me] += 2;
    }),
  ),
  T8(
    { id: "unbound", name: "Unbound", description: "Remove your nerf for good and take every card in your next draft." },
    breakNerfPlus((api) => {
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
    }),
  ),
  T8(
    { id: "great_escape", name: "The Great Escape", description: "Remove your nerf for good, take an extra move now, and your opponent skips their next turn." },
    breakNerfPlus((api) => {
      api.bs.extraMoves[api.me] += 1;
      api.bs.skips[api.opp] += 1;
    }),
  ),
];
