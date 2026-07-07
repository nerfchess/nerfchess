// Funny set: CLOCK MANIPULATION. Each card reaches the match clock through the
// engine's clock-adjustment channel (BuffApi.adjustClock -> BuffMatchState.
// clockFx), which the game server drains authoritatively and applies to the
// real clocks, clamped so no clock is ever driven below a small floor: a card
// squeezes the opponent's time but can never instantly flag them. The clock
// change then reaches both clients through the existing clock frames, so
// nothing on the client changes. These are all instant cards: the swing lands
// the moment you draft them, and in an untimed game they simply do nothing.

import { Buff } from "./shared";
import { card, instant } from "./shared";

export const FUNNY_CLOCK: Buff[] = [
  card(
    {
      id: "time_thief",
      name: "Time Thief",
      description:
        "Pick your opponent's pocket: steal half of the time left on their clock (up to 60 seconds) and add it to your own.",
      tier: 6,
      category: "tempo",
      flavor: "Tick tock, that's mine now.",
    },
    instant((_inst, api) => {
      api.adjustClock({ stealFractionOfOpp: 0.5, stealCapSec: 60 });
    }),
  ),
  card(
    {
      id: "deadline",
      name: "Deadline",
      description: "Move the deadline up: your opponent's clock loses 30 seconds.",
      tier: 5,
      category: "tempo",
      flavor: "The report was due yesterday.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 30 });
    }),
  ),
  card(
    {
      id: "jet_lag",
      name: "Jet Lag",
      description: "Book your opponent a red-eye: their clock loses 20 seconds.",
      tier: 4,
      category: "tempo",
      flavor: "What time zone is it even.",
    },
    instant((_inst, api) => {
      api.adjustClock({ subOppSec: 20 });
    }),
  ),
  card(
    {
      id: "overtime_whistle",
      name: "Overtime Whistle",
      description: "Blow the whistle for overtime: add 20 seconds to your own clock.",
      tier: 3,
      category: "tempo",
      flavor: "We are not done yet.",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 20 });
    }),
  ),
  card(
    {
      id: "buzzer_beater",
      name: "Buzzer Beater",
      description:
        "Steal a buzzer-beating 15 seconds off your opponent's clock and put it on yours.",
      tier: 4,
      category: "tempo",
      flavor: "Off the glass at the buzzer.",
    },
    instant((_inst, api) => {
      api.adjustClock({ stealFlatSec: 15 });
    }),
  ),
];
