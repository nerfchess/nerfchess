# NerfChess: how to actually get players (v2)

Written 2026-07-28, expanded 2026-08-04 with primary research into lichess,
chess.com, generals.io, skribbl.io, 5D Chess, Really Bad Chess, The Ouroboros
King, Hacker News launch norms, Reddit self-promotion enforcement, the chess
Discord ecosystem, itch.io and the web portals, the chess creator meta, and
programmatic SEO practice. Assumes organic only, no ad budget, and that the
owner is willing to appear on camera.

## The honest diagnosis (unchanged, still true)

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

What the research adds to the diagnosis: the sites that won this category won it
with product loops, not campaigns. Lichess's homepage IS the matchmaking screen;
skribbl.io's entire top funnel is a friend sending a room link; generals.io was
posted to Hacker News by a stranger and held the front page because anyone could
be playing within ten seconds. Every channel below multiplies whatever the
product loop already does. None of them can rescue a funnel with a wall in it.

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
channel, worth more. Status 2026-08-04: per-card codex OG images, sitemap,
robots, structured data, and canonical metadata are being shipped in the repo as
part of this wave; the game and profile OG images remain open.

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

**The research strengthens this into the single highest-value feature on the
list.** Chess.com's retention machine is the daily puzzle plus forgiving streaks
(a 48-hour grace window; streaks that count any meaningful activity). Really Bad
Chess was reborn as a daily puzzle on Puzzmo for the same reason. The version
that markets itself: a fixed position, three cards, find the win, and a
Wordle-style share string ("NerfChess Daily #214, 2/3, streak 9"). The share
string is the organic social channel. Ship the daily with the streak forgiving
by design: two missed days should bend a streak, not break it.

### The funnel itself, timed

A visitor must reach a real game in under 15 seconds from the homepage with zero
navigation: guest play with no account, the quick-pair grid on the landing
surface, and a copyable challenge link that seats a friend into a game. Lichess
proves the product is the landing page. Measure time-to-first-move as a KPI and
treat any regression as a launch blocker. Challenge links are the viral
primitive: every invite is an acquisition event.

---

## Phase 1: seed the communities that already want this

Ranked by fit, not by size. One global rule first: Reddit enforces its 90/10
self-promotion rule by shadowban, and every community below remembers accounts
that arrived selling. The posting account participates genuinely for two weeks
before the first link, and self-links stay the minority of its activity forever.
Never astroturf; every post is signed as the developer or played straight as a
player. Communities forgive promotion and never forgive deception.

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

**The escalation the research adds: ship their memes as real cards.** Il
Vaticano, the Knook, forced en passant. This sub has a history of memes becoming
demanded features, and "Il Vaticano is now a legal move" with a clip is their
love language, not an ad. The same three cards capture real search volume ("il
vaticano chess move", "knook chess piece") that nobody else can hold with a
playable page. Post as a player, not as a founder. If someone asks what it is,
that is when the link goes in a comment. Expect this to take several attempts to
land.

### Chess Discords and variant communities

Lichess variant players, Fairy-Stockfish people, chess960 regulars, and
specifically the PyChess Discord, where the living variant-design community
organizes and runs design contests. Small, high-intent, and they will give real
mechanical feedback. This is where early retained players come from, not
virality. Also TalkChess, engineering posts only: "how the bot evaluates 2,448
power-up cards" lands there; promo does not.

Open our own Discord before any launch post. Every channel converts better when
"join the Discord" exists, and every big post will be asked "where is the
community". Seed it with the playtest group.

### Creators who need formats

A 2,448-card variant is a content engine for someone who has to publish three
times a week. The pitch is not "please cover my game", it is "here is a format
your audience can play with you". "Creator versus chat, chat picks the nerf" is
the specific hook. Offer to build a custom lobby or a named card; the five
creator cards already in the game are the proof this offer is real. Aim at the
mid-size chess creators (10k to 200k subs), not the largest ones; they need
novelty more and answer their own messages. Get three to five mid-tier videos
before tagging the giants.

The proven formula, from 5D Chess and Really Bad Chess: a strong player meets
rules that break their intuition, and the confusion is the content. Nerf mode's
end-of-game reveal is a built-in dramatic structure: the whole video builds to
"what was the handicap". Provide the custom lobby and the clip pipeline so a
creator's editor has nothing to build.

### Reddit beyond AnarchyChess

- r/WebGames: the exact audience, direct game links allowed, follow the sidebar
  format. The post is one line: "NerfChess: chess but you draft a power-up card
  every 5 moves (free, no signup)".
- r/playmygame: feedback-focused, mandatory post template, must be free. Use it
  early for feedback, not reach.
- r/IndieGaming and r/IndieDev: clip and GIF posts vastly outperform links. Post
  the 20-second absurd-combo clip; the title tells the joke.
- r/chess: strict on promotion and 4M strong. Never post the site. Post content
  ("we gave one player 8 secret handicaps; here is the game") and ask the mods
  about promo policy first. Save it until there is a polished clip and numbers.
- r/chessvariants: tiny; post for completeness.

Do not post promo on the lichess forum (advertising is explicitly banned there
and the goodwill matters) or chess.com's forums (moderated against external
links). Skip both as channels, permanently.

### Hacker News, once

The engineering is genuinely interesting: deterministic replay across client and
server, 2,448 cards with a no-silent-failure harness, Durable Objects, a
client-side clip recorder. A "Show HN" converts developers into players, and
developers share things. This is a one-shot card, so spend it when the share
loop from Phase 0 is live.

The norms that decide the outcome: instantly tryable with no signup wall,
factual title with zero marketing language, posted from a personal account on a
weekday morning US time, never solicit votes, and the first comment is the
backstory essay (solo dev, why 2,448 cards, how you balance a secret handicap,
what Claude built). A quiet Show HN may be re-posted once later; that is
explicitly allowed. Front page is 20k to 80k visits in a day and the most useful
feedback the product will ever get, so the server must hold a spike and the
guest funnel must be flawless first. The ready-to-post draft lives in
docs/forum-kit.md.

### Distribution platforms, deliberately late

- itch.io: publish a page now for the permanent backlink, tags, screenshots, and
  devlogs (card balancing, bot design, the Claude story double as posts there).
  Enter chess-adjacent jams; jams are the discovery mechanism.
- CrazyGames and Poki: tens of millions of monthly users, but they embed the
  game on their portals, which splits the multiplayer pool. Defer until an
  embeddable guest build exists; then they are the largest raw-traffic lever
  available to a browser game.
- Product Hunt: games underperform there and it amplifies existing audiences
  rather than creating them. One quiet week after HN, expectations low.

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

## Phase 3: SEO (the compounding channel)

Nobody outranks lichess for "play chess online" and we will not try. The
realistic clusters, in priority order:

1. **"chess with power ups"** and phrasings of it. Low competition, exact-match
   intent, no strong incumbent. The homepage title and description now target it.
2. **"games like X" comparison pages:** Really Bad Chess, 5D Chess, The
   Ouroboros King, Shotgun King, "chess roguelike browser". The chess-roguelike
   wave generates steady search demand and NerfChess is a legitimate free
   browser answer. One honest page per title, competitors included and ranked
   fairly; honest comparison content earns links precisely because it is fair.
   This is the highest-conversion content available.
3. **"weird chess variants you can play in your browser":** one honest listicle
   including competitors.
4. **Meme terms** once the meme cards ship: il vaticano, knook, forced en
   passant.
5. **Glossary and rules pages** feeding internal links into the codex.
6. **Devlog essays for backlinks:** the balance harness, the desync test,
   building with Claude. These rank for nothing chess-related and earn the
   developer links that lift everything else.

Technical foundation (shipped in the repo this wave): unique metadata and
canonicals everywhere, robots and a generated sitemap covering all static pages
plus all 2,448 codex card pages, WebSite and Organization JSON-LD site-wide,
VideoGame co-typed with WebApplication on the homepage (Google only shows
software rich results for the co-typed form), FAQPage on the FAQ,
BreadcrumbList on codex pages, and per-card OG images so every card link pasted
anywhere renders as a rich preview.

The one standing risk: 2,448 templated card pages can read as thin content and
suppress the whole domain. Every card page must carry page-specific substance
(the rule, a strategy note, synergies and counters that differ per page, live
pick and win stats once samples allow). Roll indexing out in batches, watch
Search Console coverage, and noindex genuinely duplicate cards until enriched.
Core Web Vitals on a mid-range Android phone are a competitive feature; the
codex and landing routes must never load the game engine bundle.

---

## What to measure

Vanity metrics will mislead here. Track three things:

1. **Watch-through on the first three seconds.** This is the hook test and the
   only thing that decides whether the platform pushes a video. If it is below
   about 60 percent the hook failed, and nothing later in the video matters.
2. **Land to first finished game.** The funnel that actually matters. The
   analytics for this do not exist yet (docs/improvement-roadmap.md flags it as
   Priority 0.5) and should be built alongside Phase 0. Time-to-first-move is
   the companion number, with 15 seconds as the budget.
3. **Day 1 and day 7 return.** Whether anything is being built or just rented.

Secondary, once live: Daily Draft share strings posted, challenge links created
and redeemed, replay links opened, Search Console impressions per cluster, codex
index coverage.

One outlier beats a hundred median posts, so judge the format by its ceiling, not
its average. A run of thirty posts where one hits 200,000 is a success; thirty
posts averaging 800 is the current state. Review everything weekly for thirty
minutes; kill what is flat after three honest tries, feed what moves.

---

## Sequencing (eight weeks)

1. **Weeks 1 to 2:** Phase 0. Game and profile OG images, 9:16 mp4 clips, share
   on the result screen, funnel analytics, guest funnel timed under 15 seconds.
   Discord opened and seeded. Reddit account starts participating. itch.io page
   drafted. (Codex OG images, sitemap, robots, and structured data: already
   shipping in the repo.)
2. **Weeks 2 to 4:** daily short-form using the hook formulas, one platform.
   Simultaneously seed the Discords and post to AnarchyChess as a player.
   r/playmygame for feedback. Daily Draft ships.
3. **Week 4:** read the data. Whichever hook formula produced the outlier
   becomes the format; the rest are dropped.
4. **Week 5:** Show HN, full prep gate, everything else pauses that week and
   every comment gets answered. Then r/WebGames and the clip posts.
5. **Week 6:** the meme wave. Meme cards live, AnarchyChess post, meme term
   pages indexed.
6. **Week 7:** creator outreach with real numbers in hand, twenty mid-tier
   pitches, custom lobbies offered. Comparison pages published.
7. **Week 8:** Product Hunt in a quiet week; evaluate the CrazyGames embed
   build; review metrics and double down on whichever channel overperformed.

## The one-line version

The content is not underperforming because there is too little of it. It is
underperforming because the hook needs a paragraph and the product cannot be
shared. Fix the share loop first, then let the game's own absurdity be the
content, and post it where absurd chess is already the local religion.
