# NerfChess: how to actually get players

Written 2026-07-28. Assumes organic only, no ad budget, and that the owner is
willing to appear on camera.

## The honest diagnosis

Roughly 30,000 views across many short-form videos, a few hundred each, no
breakout. That pattern is specific and it is not a volume problem. A few hundred
views means the platform showed the video to its smallest test audience and the
watch-through did not earn a second push. Posting more of the same gets more
few-hundreds.

Two causes, and the second is the one nobody wants to hear.

**The hook needs a rules explanation.** "Chess, but you both have a secret
handicap" is a genuinely good pitch at a dinner table and a terrible one at
1.5 seconds. Cold viewers have no reason to care about a chess variant before
they understand it, and they leave before they understand it. Chess content that
travels is a famous player, a visually obvious blunder or brilliancy, or drama.
Novel rules are none of those.

**The product cannot currently be shared.** This is the part that compounds, and
it is why the plan starts with code rather than content. Every link posted to
Discord, X, or Reddit today previews as a 512 pixel icon. Every clip is in a
format the platforms do not want. And the moment a player most wants to share is
the one moment the product does not offer them anything to share.

---

## Phase 0: unblock sharing (do this before making more content)

These are cheap, and until they are done every piece of content leaks.

### Links preview as a tiny logo

`src/app/layout.tsx` sets a site-wide `openGraph` with `images:
["/icon-512.png"]` and `twitter: { card: "summary" }`, which is the small square
variant. Worse, `/game/[id]`, `/u/[username]` and `/tv` are all `"use client"`,
so they cannot export metadata at all and inherit that site-level card. A shared
game link has no preview of its own.

The codex pages already do this correctly and are the model.

**Fix:** dynamic OG images per game and per profile, rendering the final position
plus both revealed rules, and switch to `summary_large_image`. A shared game
should look like a game. This single change makes every future share, from every
channel, worth more.

### Clips are the wrong shape and the wrong codec

`ClipRenderer.tsx` renders a 720x880 canvas, recorded to webm with no audio
track. Vertical platforms want 1080x1920 mp4. 720x880 is neither square nor 9:16,
so every clip needs manual reframing before it can be posted, which is exactly
the friction that stops a person from posting daily.

**Fix:** a 9:16 render target, mp4 where the browser supports it, and a caption
burned into the frame (platform captions get cropped; burned-in ones do not).

### The share button is not where the feeling is

`GameOver.tsx` routes clipping to the in-game actions menu, and the result
screen's own Share copies plain text. The emotional peak of a NerfChess game is
the instant the secret rules are revealed and you find out what your opponent was
fighting. That is the screenshot people would post, and the product does not
offer it.

**Fix:** on the result screen, a "Share this reveal" button producing an image of
the final position with both rules named, and the clip entry point beside it.

### There is no reason to come back tomorrow

No puzzle route exists. Without a daily artifact there is no habit loop and
nothing recurring to post. A "today's nerf" daily puzzle solves the retention
problem and the content problem with one feature, and it works even when nobody
is online, which sidesteps the liquidity problem entirely.

---

## Phase 1: seed the communities that already want this

Ranked by fit, not by size.

### r/AnarchyChess is the single best-fit audience on the internet

Around a million people whose entire shared identity is cursed chess. NerfChess
is, mechanically, their premise shipped as a real product. Nothing else in the
plan has this quality of match.

It is also allergic to marketing, and a post that reads as an ad will be
downvoted and remembered. The play is content that IS the joke, where the game is
incidental:

- A clip captioned only with the absurd thing that happened, no link, no pitch.
- The card art and names on their own. "I Hate My Ex: destroys every piece on the
  board" is an AnarchyChess post with or without a game attached.
- Reply, in the comments, with what the rule actually was. Let people ask.

Post as a player, not as a founder. If someone asks what it is, that is when the
link goes in a comment. Expect this to take several attempts to land.

### Chess Discords and variant communities

Lichess variant players, Fairy-Stockfish people, chess960 regulars. Small,
high-intent, and they will give real mechanical feedback. This is where early
retained players come from, not virality.

### Creators who need formats

A 2,443-card variant is a content engine for someone who has to publish three
times a week. The pitch is not "please cover my game", it is "here is a format
your audience can play with you". "Creator versus chat, chat picks the nerf" is
the specific hook. Offer to build a custom lobby or a named card. Aim at the
mid-size chess creators, not the largest ones; they need novelty more and answer
their own messages.

### Reddit beyond AnarchyChess

r/WebGames and r/playmygame accept direct posts. r/chess is stricter and worth
saving until there is a polished demo video and some numbers.

### Hacker News, once

The engineering is genuinely interesting: deterministic replay across client and
server, 2,443 cards with a no-silent-failure harness, Durable Objects, a
client-side clip recorder. A "Show HN" or a technical write-up about making a
chess variant deterministic converts developers into players, and developers
share things. This is a one-shot card, so spend it when the share loop from
Phase 0 is live.

---

## Phase 2: short-form, rebuilt

Keep posting, change the format. The owner being willing to appear on camera is
the biggest available lever, because a face can carry the "wait, what" beat that
the rules explanation currently has to carry.

**Hook formulas that fit this product**, in rough order of expected performance:

1. **Reaction to your own game.** Face in frame, board below. The reaction sells
   the moment before the viewer understands the rules; the rules land second.
2. **Cold open on the absurdity.** Frame one is the board wipe, the banana peel,
   the piece that will not move. Explain nothing for three seconds.
3. **"My rule was X and I still won."** A constraint story. Legible in one line
   and inherently a flex.
4. **Guess the rule.** Show a game where one side is playing strangely, ask the
   comments to guess the handicap, answer in a pinned comment. Built for the
   algorithm: it drives comments and rewatches.
5. **Card reveal.** Just the card, its name, and what it does. Cheap to produce,
   endlessly repeatable, and it doubles as codex SEO content.

**What to stop doing:** anything that opens by explaining what NerfChess is.

**Cadence:** one post a day for thirty days on one platform, not three posts a
week across three. Pick TikTok first because it distributes to strangers most
aggressively. Repost the winners to Reels and Shorts afterwards.

---

## What to measure

Vanity metrics will mislead here. Track three things:

1. **Watch-through on the first three seconds.** This is the hook test and the
   only thing that decides whether the platform pushes a video. If it is below
   about 60 percent the hook failed, and nothing later in the video matters.
2. **Land to first finished game.** The funnel that actually matters. The
   analytics for this do not exist yet (docs/improvement-roadmap.md flags it as
   Priority 0.5) and should be built alongside Phase 0.
3. **Day 1 and day 7 return.** Whether anything is being built or just rented.

One outlier beats a hundred median posts, so judge the format by its ceiling, not
its average. A run of thirty posts where one hits 200,000 is a success; thirty
posts averaging 800 is the current state.

---

## Sequencing

1. **Weeks 1 to 2:** Phase 0. OG images, 9:16 mp4 clips, share on the result
   screen, basic funnel analytics.
2. **Weeks 2 to 4:** daily short-form using the hook formulas, one platform.
   Simultaneously seed the Discords and post to AnarchyChess as a player.
3. **Week 4:** read the data. Whichever hook formula produced the outlier becomes
   the format; the rest are dropped.
4. **Week 5 onward:** creator outreach with real numbers in hand, and the Hacker
   News post once the share loop is live.
5. **Ongoing:** the daily puzzle, which is the retention feature and the content
   engine at the same time.

## The one-line version

The content is not underperforming because there is too little of it. It is
underperforming because the hook needs a paragraph and the product cannot be
shared. Fix the share loop first, then let the game's own absurdity be the
content, and post it where absurd chess is already the local religion.
