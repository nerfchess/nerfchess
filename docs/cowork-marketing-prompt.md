# The Cowork prompt: NerfChess marketing research

Paste the block below into Claude Cowork (or any Claude session with web access).
It is written to produce **decisions and drafts**, not a summary — the failure
mode of a research prompt is a tidy document nobody acts on.

Everything in the CONTEXT section is fact from this repository as of 2026-07-30,
so the model starts from the real product instead of guessing at it. Update the
numbers when they change; a stale brief produces confidently wrong output.

---

## Why the prompt is shaped this way

Three things make marketing research go wrong, and the prompt is built to block
each:

1. **It restates what you told it.** Blocked by demanding the two named
   deliverables be things you did *not* supply: fresh numbers, and named
   accounts.
2. **It optimises the wrong metric.** Blocked by naming the metric up front
   (three-second watch-through, and land-to-first-finished-game) and forbidding
   follower counts as a ranking.
3. **It invents evidence.** Blocked by requiring a link per claim and an explicit
   "I could not verify this" list.

---

## The prompt

```
You are doing growth research for NerfChess (nerfchess.com), a chess variant.
I want decisions and drafts I can act on this week, not a summary of what I
already know.

CONTEXT — all of this is true as of 2026-07-30, do not re-derive it:

The product. Standard chess with one change: capture the king, there is no
checkmate. Two modes. In NERF mode both players secretly pick a handicap before
move one ("you cannot capture queens", "your king must always move forward") and
it is revealed only when the game ends. In BUFF mode nobody has a handicap and
both players draft power-up cards every 5 moves. 2,443 cards exist, from
"Trivial" to "Mythic". It runs in a browser, free, no signup needed to play, and
has a searchable card codex, TV, tournaments, clubs, leaderboards, and 900
engine-driven house accounts that keep the lobby populated.

The situation. Roughly 30,000 total views across many short-form videos, a few
hundred views each, no breakout. Organic only, no ad budget. The owner is
willing to appear on camera.

The two diagnosed problems, already accepted, do not re-litigate them:
(a) The hook needs a rules explanation. "Chess, but you both have a secret
    handicap" is a good pitch at a dinner table and a terrible one at 1.5
    seconds. Cold viewers leave before they understand it.
(b) The moment a player most wants to share is the one moment the product does
    not offer them anything to share.

The evidence that should anchor your thinking. Chess variants do not go viral
through communities; they go viral when ONE streamer plays ONE absurd rule on
camera and others copy within weeks. Fog of War went viral in 2020 after
Nakamura, Rozman and Rosen each posted videos; Duck Chess went viral in 2022
after Eric Rosen played it on stream, and Nakamura, Cramling and Rozman
followed. Both variants share three properties NerfChess currently lacks in its
pitch: the rule is one sentence, the rule is visible on the board, and the rule
makes strong players look silly.

THE METRICS THAT COUNT. Judge every recommendation against these two and say so
explicitly:
1. Watch-through on the first three seconds. Below ~60% and nothing later in the
   video matters.
2. Land to first FINISHED game.
Do NOT rank anything by follower count or subscriber count.

DELIVERABLES. Produce all five. Be specific enough that I could execute without
asking you a follow-up.

1. TEN HOOKS, as actual scripts. For each: the literal first line spoken or
   shown, what is on screen for the first three seconds, and the single card or
   rule it is built on. At least four must be built on ONE specific NerfChess
   card and lead with that card's effect rather than with the game. Rank them by
   your estimate of three-second watch-through and say why the top one wins.

2. TWENTY NAMED ACCOUNTS to approach, with a link to each. Chess creators AND
   non-chess ones (deliberately-broken-game-mechanics channels, mod showcases,
   roguelike-deckbuilder coverage — NerfChess is a roguelike deckbuilder wearing
   chess as a costume, and that framing may sell better off-chess than on it).
   For each: why THEM specifically, what format they would run, and a one-line
   opener written in their register. Order by likelihood of covering it, not by
   size. Flag anyone who has covered a chess variant before, with the link.

3. A 30-DAY CALENDAR, one post per day, one platform. Pick the platform and
   defend the choice. Say what gets posted each day (which hook, which card) and
   name the three days that are the real tests.

4. WHAT NOT TO DO. Five things that look obviously correct for this product and
   are actually wrong, with reasoning. Include at least one that contradicts
   something in this brief if you believe it is wrong.

5. UNKNOWNS. Everything you could not verify, and the cheapest experiment that
   would resolve each. Be explicit: I would rather have a short list of solid
   claims and a long list of unknowns than the reverse.

RULES.
- Every factual claim about a platform, a creator, or a community gets a link.
  No link, do not make the claim — put it in the unknowns instead.
- No generic advice. "Post consistently" and "engage with your audience" are
  banned. If a recommendation would apply unchanged to a coffee shop, cut it.
- Where communities are concerned, assume the post must BE the artefact or the
  joke, with the link in a comment. Anything that reads as an announcement gets
  removed, and you only get one first impression per community.
- Prefer one specific verified thing over five plausible ones.
```

---

## After it answers

Two follow-ups worth having ready, because the first pass usually needs them:

> For the top three hooks, write the full 20-second script: every line, every
> on-screen text, the exact card and the exact position on the board.

> Take deliverable 2 and cut it to the five accounts you would actually message
> this week. For each, write the whole message, three sentences maximum, no
> attachments, with a link that opens straight into a game.

## Where to file the output

- Hooks and calendar → alongside `docs/marketing-plan.md`.
- Named accounts → merge into `docs/creator-outreach-research-2026-07.md`.
- Community specifics → merge into `docs/community-research-2026-07.md`.
- Anything that needs a code change (an OG image, a share button, a clip format)
  → `docs/improvement-roadmap.md`, which already tracks the Phase 0 blockers.
