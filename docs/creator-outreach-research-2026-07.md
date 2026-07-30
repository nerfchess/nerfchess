# Creator outreach: who would cover NerfChess, and why

Written 2026-07-30, alongside `docs/marketing-plan.md`. That plan already says
"aim at the mid-size chess creators, not the largest ones". This document works
out *which* ones, on evidence rather than follower counts, and designs the
signature card each one gets.

---

## The finding that should drive everything

**Chess variants do not go viral on Reddit or TikTok. They go viral when one
streamer plays one absurd rule on camera, and the others copy them within weeks.**

Two documented cases, both on Chess.com:

- **Fog of War** went viral in **2020**, after Hikaru Nakamura, Levy Rozman
  (GothamChess) and Eric Rosen each published multiple videos of it. It is now
  Chess.com's most-played variant, with an official championship (2024, again in
  2025).
- **Duck Chess** went viral in **2022** after **Eric Rosen played it on
  stream** — and only then did Hikaru, Anna Cramling and Levy follow. It also got
  a championship and a qualifier series.

Two identical shapes, two years apart. Both variants share three properties
NerfChess should be pitched on:

1. **One rule, stated in a sentence.** "You can only see where your pieces can
   move." "There is a duck." No paragraph required.
2. **The rule is visible on the board.** A viewer who muted the video still
   knows something is wrong.
3. **It makes strong players look silly.** That is the content. A 2700 losing to
   a duck is the video; the variant is the excuse.

NerfChess's problem, exactly as `marketing-plan.md` diagnosed, is that its pitch
("you both have a secret handicap") is a *paragraph* and its rule is *invisible*.
The fix for creator outreach is not a better email. It is to lead with **one
card**, not with the game:

> "Your opponent's queen can only move to squares your king could move to. You
> don't know that. Find out."

That is a Fog of War-shaped pitch for a NerfChess card, and it is what should be
in the first line of every message.

## Ranked targets

Ranked by likelihood of covering it, which is close to inverse to size.

### 1. Eric Rosen — the proven first mover

He is the single highest-value target on this list and it is not close. He is the
documented origin of the Duck Chess wave, he plays oddities enthusiastically
rather than competitively, and his audience expects him to. Everyone else on this
list is more likely to cover NerfChess *after* he does than because you asked.

**The pitch:** one absurd card, a link to a private lobby, nothing else. Do not
explain the game.

### 2. Mid-size variant and puzzle channels

The plan's "creators who need formats" tier. A 2,443-card library is a content
engine for someone publishing three times a week, and "chat picks my nerf" is a
format they can run forever without you. These creators answer their own
messages, which the top tier does not.

**The pitch:** the format, not the game. Offer to build the lobby and to name a
card after them.

### 3. GothamChess (Levy Rozman) — high ceiling, low probability

He covered both Fog of War and Duck Chess, so the interest is real, but he covers
what is already big. Realistically he is a *second-wave* target: worth one
message after there is a clip with numbers on it, not before.

### 4. Anna Cramling, and the family/vlog end

Followed the Duck Chess wave rather than starting it. Her format (relaxed,
reaction-led) is the best possible fit for the "wait, what?" beat this game
needs, and she plays with her parents on camera — a NerfChess game where the
other side's handicap is secret is unusually good television for that setup.

### 5. Hikaru Nakamura — do not target

He arrives when a thing is already a phenomenon. Nothing you send changes that.

### 6. Non-chess: the "cursed game mechanic" channels

Chess is not the only audience. Channels covering deliberately-broken game
mechanics, mod showcases and roguelike deckbuilders are a genuinely good match:
NerfChess is a **roguelike deckbuilder wearing chess as a costume**, and that
framing is much easier to sell to them than to a chess channel.

## What to send

One message, three sentences, no attachments:

1. The absurd card, quoted.
2. What happens because of it, in one clause.
3. A link that opens straight into a game — no signup, no explanation.

Do not describe the draft, the tier ladder, the two modes, or the card count. All
of it is true and all of it is fatal at first contact. The plan's diagnosis
applies to creator outreach as much as to short-form: **the hook must not need a
paragraph.**

---

## Signature creator cards

The user's ask: a strong rule per creator, with a special animation.

**Cards are named after the creator; the art is original.** Original portrait or
emblem SVGs, drawn in the game's own visual language, at
`public/creators/<slug>.svg`. Nobody's logo or likeness is copied into the
repository — a channel logo is a third-party trademark and shipping one exposes
the site, not just the creator. That path is a **drop-in slot**: when a creator
says yes and sends artwork (or grants use of their logo), replacing that one file
is the entire change, no code edit. This is exactly how the existing named-person
set works (`src/engine/buffs/personal.ts` with `public/newjeans/*.svg`), so there
is a precedent to follow rather than a pattern to invent.

Each card's mechanic is chosen to be *recognisably that creator*, because a card
named after someone that plays like a generic freeze is worth nothing to them:

| Creator | Card | Mechanic sketch | Why it is them |
| --- | --- | --- | --- |
| Eric Rosen | **The Stalling Bishop** | Your bishop cannot be captured for 3 of your opponent's turns, but it may not capture either. It is simply *there*, and it is a problem. | The bishop-sac-then-stall-into-a-win identity, and the honest joy of a position that should not work |
| GothamChess | **Oh No My Queen** | Your queen is instantly returned to her starting square. Every enemy piece that was attacking her is frozen for 2 turns, and you gain 30 seconds. | The catchphrase-shaped disaster that turns out fine, out loud |
| Anna Cramling | **Family Game Night** | Name one enemy piece. For 4 turns neither player may capture it, and both players see every card the other holds. | Playing on camera with people who are not trying to beat you, plus total openness |
| Daniel Naroditsky | **Speedrun Protocol** | For your next 6 turns every move you make must be a capture, a check, or a pawn push — and each one adds 3 seconds to your clock. | The speedrun identity: constant forward pressure, narrated |
| Chat / viewers | **Chat Picks** | The card does nothing on its own. Your opponent chooses which of two nerfs YOU carry for the rest of the game. | The format the plan actually recommends selling: creator versus chat |

Implementation notes, so this is buildable rather than aspirational:

- One new module, `src/engine/buffs/creators.ts`, exporting `CREATOR_CARDS`,
  spread into `ALL_BUFFS` by `library.ts` and badged as its own codex collection
  in `src/lib/cardCollections.ts` — the same shape `PERSONAL_CARDS` uses.
- Animations as a self-contained plugin pair,
  `src/components/effects/creatorPlays.tsx` + `.css`, following the rules at the
  top of `personalPlays.tsx`: own SVG, own CSS, transform/opacity only, and **no
  import from `BoardEffects.tsx`** (cycle hazard).
- Tiers 7-9, so a creator card is a genuine event when it lands, and every
  mechanic reuses primitives that already ship (shield, freeze, clock adjust,
  forced-move filters) so none of them can soft-lock a game.
- **Each card must be removable in one commit.** If a creator objects, deleting
  its entry from `CREATOR_CARDS` and its plugin key is the whole retraction.

---

## Sources

- [Duck Chess — Chess.com](https://www.chess.com/terms/duck-chess) (the 2022 Eric Rosen origin, and the streamers who followed)
- [Fog of War — Chess.com](https://www.chess.com/variants/fog-of-war) and [Fog of War: Chess.com's most popular variant](https://www.chess.com/blog/EnergeticHay/fog-of-war-chess-coms-most-popular-variant) (the 2020 wave)
- [Announcing the Chess.com Fog of War Championship 2024](https://www.chess.com/news/view/announcing-chesscom-fog-of-war-chess-championship-2024) and the [2025 championship thread](https://www.chess.com/forum/view/community/2025-chess-com-fog-of-war-championship-official-discussion-thread) (what "variant made it" looks like)
- [Eric Rosen on Lichess](https://lichess.org/streamer/ericrosen) and [his YouTube](https://www.youtube.com/@eric-rosen) (format: simuls, live games with commentary, viewer questions)
- [Top chess YouTubers 2026 — Favikon](https://www.favikon.com/blog/top-chess-youtubers) (landscape overview)
