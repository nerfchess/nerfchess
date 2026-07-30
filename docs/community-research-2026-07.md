# Where to post NerfChess, and how not to get removed

Written 2026-07-30. Companion to `docs/marketing-plan.md`, which names
r/AnarchyChess as the best-fit audience on the internet. This document is the
practical layer: the communities, what each one actually rewards, and the failure
mode for each.

Everything here assumes the same constraint as the plan: organic only, no budget,
and a hook that currently needs a paragraph.

---

## The one rule that decides everything

**On every community below, the post is the joke or the artefact. The game is
incidental, and the link goes in a comment.**

This is not politeness. It is the mechanic of these places: a post that reads as
an announcement gets removed or downvoted by people who will remember the name,
and you cannot re-launch to the same audience twice. The plan already says
"post as a player, not as a founder" — treat it as the hard constraint it is.

---

## Reddit

### r/AnarchyChess — the single best fit, and the easiest to burn

Roughly a million people whose entire shared identity is cursed chess. This is
the community that produced "Google en passant" and the "holy hell" copypasta,
both of which are now the general internet's chess vocabulary. NerfChess is,
mechanically, their premise shipped as a real product.

**What works:** the artefact alone. A card's name and text with no context
("*I Hate My Ex: destroys every piece on the board*") is a complete post there. A
clip captioned only with the absurd thing that happened, no link, no pitch. Then
answer in the comments when somebody asks what it is.

**What fails:** anything that looks like marketing, and anything that *explains*.
Expect several attempts before one lands, and treat a removal as information, not
a setback.

**A concrete lever nobody has used:** the game's own vocabulary already overlaps
theirs — there is a card literally called *Holy Hell* and another called *Google
En Passant*. Those cards are AnarchyChess posts that happen to exist inside a
product. Post the card, not the product.

### r/playmygame and r/WebGames — built for this

`r/playmygame` exists for self-promotion, and `r/WebGames` is one of the two
highest-density browser-game communities. Both are far smaller than
r/AnarchyChess and far more forgiving. Read each sidebar first — the rules differ
and both enforce them.

**Note on sorting:** on discovery subreddits, sort by *new* rather than *hot* to
see what actually gets traction there; the algorithm buries small developers, so
the "hot" page is not representative of what a post like yours will do.

### r/chess — save it

Stricter, larger, and unforgiving of a first impression. The plan is right that
this is worth holding until there is a polished demo video and real numbers. One
shot.

### r/chessvariants, r/chessbeginners, r/tabletopgamedesign

Small, high-intent, and the best place to get *mechanical* feedback rather than
reach. r/chessbeginners deserves specific attention now that the bot roster is
weighted toward genuine beginners — it is the one community where "there are
opponents at your level" is the pitch, not the absurdity.

---

## Discord, and why it matters more than Reddit

Lichess variant channels, Fairy-Stockfish, chess960 regulars, and the variant
corners of the larger chess servers. Small, high-intent, and they give real
mechanical feedback rather than upvotes. Per the plan, this is where early
*retained* players come from — a Reddit hit gives you a traffic spike, a Discord
gives you ten people who play tomorrow.

The asset to bring is not a pitch, it is a **question**: "does the tier ladder
feel fair to you", "which of these three cards is broken". Variant people answer
that at length, and they stay for the answer.

---

## Hacker News — one shot, spend it late

The engineering is the story, not the game: deterministic replay across client
and server, 2,443 cards with a no-silent-failure harness, Durable Objects, a
client-side clip recorder, and now a 900-persona bot roster with a rating curve
that is asserted in CI. A "Show HN" or a technical write-up converts developers
into players, and developers share things.

This is a single-use card. Per the plan, spend it once the share loop from Phase 0
is live, because the traffic arrives all at once and never comes back.

---

## What the successful variants actually did, and what it means here

The evidence is in `docs/creator-outreach-research-2026-07.md`: Fog of War (2020)
and Duck Chess (2022) both went viral through **streamers**, not communities. In
both cases the community activity came *after* the videos.

The honest reading is uncomfortable and worth stating plainly: **Reddit is not
the growth channel; it is the credibility channel.** A well-received
r/AnarchyChess post gets you a spike and a handful of players. What actually
moved both of those variants was one creator playing one absurd rule on camera.
So the sequencing should be:

1. **Community first, for material.** Post cards to r/AnarchyChess. Whichever
   card gets the biggest reaction is the card you lead the creator pitch with —
   the community is a free A/B test on which absurdity travels.
2. **Then creators**, leading with that card.
3. **Then r/chess and Hacker News**, once there is a clip with numbers on it.

---

## Sources

- [Google En Passant — Know Your Meme](https://knowyourmeme.com/memes/en-passant-google-en-passant) (r/AnarchyChess as the origin of the modern chess-meme vocabulary, incl. the "holy hell" copypasta)
- [Duck Chess — Chess.com](https://www.chess.com/terms/duck-chess) (2022, went viral through Eric Rosen's stream)
- [Fog of War — Chess.com](https://www.chess.com/variants/fog-of-war) (2020, went viral through streamer videos)
- [Best browser-game subreddits](https://dinogame.gg/blog/best-browser-game-subreddits/) (r/playmygame and r/WebGames density, and the sort-by-new advice)
- [AnarchyChess community games on itch.io](https://n1k4.itch.io/anarchychess) (precedent: the community builds and plays its own cursed-chess software)
