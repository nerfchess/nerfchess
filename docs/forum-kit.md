# NerfChess Forum Kit

Ready-to-post drafts for every channel in docs/marketing-plan.md. Each draft
follows that community's written rules. Fill the bracketed gaps, never solicit
votes anywhere, and post from the personal account that has been participating
for at least two weeks.

## 1. Show HN (post when the share loop is live)

Title:

    Show HN: NerfChess, chess where you draft a power-up card every 5 moves

URL: https://nerfchess.com

First comment (post it immediately after submitting):

    Solo dev here. NerfChess is free, browser-based, no signup: chess where
    both players draft a card every five moves. Buff mode stacks powers onto
    your own army; Nerf mode deals you a secret handicap your opponent has to
    deduce while cursing you further. Capture the king to win.

    Some engineering notes HN might enjoy:

    - There are 2,448 implemented cards. Every one has an entrance, a use
      animation, a board effect, and a per-piece visual, enforced by CI
      coverage gates that only ratchet down.
    - The server is a Cloudflare Durable Object per game; clients replay
      moves deterministically and a desync test harness diffs replicas on
      every card in the library. Desync is the one bug this game cannot have,
      so the whole test culture is built around it.
    - Balance is measured by paired self-play: same seed, same bots, one side
      holding the card, and the win-rate delta per card comes out in
      percentage points.
    - Most of the code was written with Claude. Happy to talk about what that
      workflow actually looks like at 380k lines.

    Things I know are rough: [current known issues]. Brutal feedback wanted.

Prep gate before posting: guest play works logged out in an incognito window,
a challenge link seats a friend, the server has headroom for a 50k-visit day,
and the FAQ answers "how is this balanced".

## 2. r/WebGames

Follow the sidebar's link format on the day of posting. Title:

    NerfChess: chess but you draft a power-up card every 5 moves (free, no
    signup, works on phones)

Link directly to https://nerfchess.com. One comment from you after posting:

    Dev here. Two modes: Buff (stack powers on your own pieces) and Nerf
    (you get a secret handicap, opponent has to figure out what it is).
    2,448 cards. Feedback very welcome, especially on the draft UI.

## 3. r/playmygame

Use their mandatory template exactly as the sub renders it. Answers to have
ready: Playable link https://nerfchess.com; Platform: browser, desktop and
mobile; Free to play: yes, no signup needed; Involvement: solo developer;
Feedback wanted: first-game clarity, draft pacing, mobile boards.

## 4. r/IndieGaming and r/IndieDev (clip posts)

Post a 15 to 30 second clip, not a link. Titles that carry the joke:

    - My chess variant lets you drop a banana peel. A grandmaster piece just
      slipped on it.
    - In my chess game your opponent can secretly curse your bishops. This
      player took 40 moves to notice.
    - I added a card that makes four of your pieces move like amazons. This
      is what checkmate looks like now.

Body comment: one line about the game plus the link. The clip does the work.

## 5. r/AnarchyChess (the meme plays, post as a player)

Never a promo link in the post. Sequence, one post per week at most:

    a. Clip captioned "New response just dropped" showing an absurd card
       resolving. No link. Answer questions in comments.
    b. Card face image: "I Hate My Ex: destroys every piece on the board".
       Nothing else.
    c. The day the meme cards ship: "Il Vaticano is now a legal move" with
       the clip of it happening. Reply in comments with the rule text and,
       only when asked, the site.

## 6. Lichess forum and chess.com forums

Do not post. Advertising is against the lichess forum rules and chess.com
moderates external links. This entry exists so nobody forgets why.

## 7. PyChess and variant Discords

Join, play, talk design for two weeks before showing anything. Then, in the
appropriate channel:

    Been building a draft-a-card-every-5-moves variant called NerfChess.
    2,448 cards, all free in the browser. Would genuinely value this
    server's eyes on the balance approach: [one paragraph on paired-bot
    win-rate measurement]. Link if anyone wants to try: https://nerfchess.com

## 8. TalkChess (engineering thread)

Title: Measuring per-card win-rate deltas in a 2,448-card chess variant.
Body: the paired self-play harness writeup (same seed, held card vs not,
stderr from the pair spread), the desync-first test culture, and the bot's
card-evaluation policy. End with the link. No marketing language anywhere.

## 9. Creator outreach DM (mid-tier chess creators, 10k to 200k)

    Subject: A format for you: chess where chat curses your pieces

    Hi [name], I run nerfchess.com, a free browser chess variant where you
    draft power-up cards every five moves. I built a mode I think fits your
    channel: you play while your chat votes on which secret handicap you
    carry, and the reveal at the end is the punchline. I can set up a custom
    lobby for you, and if it lands I will design and name a card after your
    channel (five creators already have one in the game). One example clip:
    [clip]. Interested?

## 10. itch.io page copy

Short description: Chess where you draft a power-up card every 5 moves.
Free, browser, no signup.

Long description: lead with the two modes in two sentences, the 2,448-card
codex, no account needed, phone friendly. Tags: chess, chess-variant,
multiplayer, board-game, card-game, strategy, free, browser, html5, pvp.
Screenshots: the draft moment, an absurd board state, the reveal screen, the
codex, the podium. Devlog cadence: one per two weeks, alternating design
essays (how a card gets balanced) and build notes (what Claude wrote).

## 11. Product Hunt (quiet week, after HN)

Tagline: Chess with power-up cards, free in your browser.
First comment: the two-mode explanation plus the solo-dev story, four
sentences, then answer questions all day.
