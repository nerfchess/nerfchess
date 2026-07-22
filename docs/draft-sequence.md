# Draft lifecycle sequencing

How a Buff draft flows from the move that triggers it to the moment play
resumes, and the guarantee the whole system enforces:

**The decision countdown never starts while anything is still animating.
Once it starts, the player receives the complete decision window.**

## The state machine

`src/lib/draftSequence.ts` owns the lifecycle as an explicit, event-driven
state machine. Phases, in order:

| Phase | Meaning |
|---|---|
| `MOVE_RESOLVING` | The triggering move and its captures are landing |
| `ANIMATIONS_PLAYING` | Triggered card, passive, and opponent spectacles play |
| `CARDS_PREPARING` | Chest opening and card dealing inside the overlay |
| `CARDS_READY` | Both cards rendered, readable, and interactive |
| `DRAFT_DECIDING` | The countdown runs; the player owns the full window |
| `DRAFT_CONFIRMING` | A pick or bank is locked in and being processed |
| `SELECTION_ANIMATING` | The chosen card's flight or bank slide plays |
| `RETURNING_TO_GAME` | The overlay closes; play resumes |
| `DRAFT_COMPLETE` | Terminal |

Transitions are forward only. Every gated wait is a real completion signal (a
promise) registered with `track(label, promise, capMs)`. There are no
choreography timeouts in the machine; the only timers are per-signal watchdog
caps so a lost completion event (an unmounted component, a failed animation, a
stalled requestAnimationFrame in a background tab) delays the sequence by at
most its cap instead of blocking the draft forever. A cap firing is fault
recovery and is surfaced through `onStall`.

A reroll calls `restartPreparation()`: back to `CARDS_PREPARING`, deadline
dropped, and a complete fresh window once the new cards are ready. An epoch
counter invalidates any gated advance that was in flight when the restart
landed.

## The two real signals

`src/lib/useDraftSequence.ts` binds the machine to a game surface. It waits on
exactly two events:

1. **Board spectacles finished.** `useSignatureQueue` now exposes a live
   `busy` flag (a spectacle is playing or queued). The draft overlay is not
   allowed to mount until it drops; a small "Resolving effects" chip
   (`DraftResolvingChip`) shows meanwhile. Cap: 7 seconds.
2. **Cards ready.** `DraftOverlay` fires `onCardsReady(offerKey)` exactly once
   per offer version, after the chest is open, the deal has settled, and two
   further animation frames have painted the card faces. Only then is the
   decision window armed. Cap: 12 seconds.

Reduced motion and performance mode collapse the animations but resolve the
same signals immediately, so the machine advances through the same phases and
can never deadlock there.

## What the player sees

While preparing, the timer slot shows a contextual label instead of a
countdown: "Resolving effects", "Opening your draft", "Dealing the cards",
plus the line "Your timer starts when the cards are ready". When the cards
become interactive the countdown appears as "Choose within Ns" with a single
soft two-note cue (`playDecisionStart`) and one restrained pulse, both stood
down by the usual sound and motion settings.

When the countdown expires the draft is NOT discarded: it moves to the
compact side panel labeled "Draft pending", preserving the offered cards, any
selection, rerolls, and the bank option. In timed games the panel says "Your
game clock is running"; untimed bot games instead say "No clock in this game;
resolve it whenever you are ready" and nothing is charged.

## Clock authority

- **Local bot games** (`src/app/game/page.tsx`): the game clock pauses the
  instant an offer opens; the 20 second deadline is armed only by the
  machine's `onDecisionStart`, after cards are ready. The expired-window state
  (`offerOnClockIndex`) persists into the local save
  (`draftOnClockIndex` in `SavedAiGame`) so a refresh cannot convert an
  expired draft back into a fresh paused one; an unexpired draft restarts
  preparation on restore and receives a complete fresh window.
- **Online games** (`worker.ts` + `OnlineMatch.tsx`): the server remains the
  clock authority. When an offer rolls (mid game, at the buff-mode game start,
  or on a reroll inside the window) the shared deadline is
  `now + draftPrepMs + draftLockInMs`: a presentation budget on top of the
  full decision window, with both clocks paused throughout. The client hides
  the countdown until its own cards-ready signal, so the full window remains
  when it appears; a faster client simply sees a few extra seconds. The live
  deadline also rides every `dtState` frame, which is how a reroll's
  restarted window reaches both clients.

## Interruption control

`src/lib/uiInterrupts.ts` is the single gate for nonessential interruptions.
An active draft (and any playing spectacle) takes a hold; interrupters request
a presentation slot with a priority and show one at a time, highest priority
first, only when nothing holds the gate. Wired consumers:

- the performance recommendation popup (`LagWatch` in `SettingsBootstrap`):
  jank detection keeps running silently during play, but the prompt itself
  queues until the draft is resolved and no animation is active;
- achievement unlock toasts (`AchievementToast`).

Urgent connection failures intentionally bypass the queue and must preserve
draft state.

## Tests

- `npm run test:draft-sequence`: deterministic unit tests (fake clock, no
  sleeps) for the machine and the interrupt queue: countdown cannot start
  before cards are ready, the full window is granted regardless of prep time,
  failed and lost animations cannot deadlock, rerolls restart cleanly,
  double confirmation is impossible at the machine level, priority queueing
  and holds behave.
- `e2e/draft-timing.spec.ts`: real browser flows on the bot game: the
  countdown stays hidden through chest and deal (full motion), appears with
  at least 18 of 20 seconds, reduced motion arms it immediately, and an
  expired window lands in the pending panel from which the draft still
  resolves.
