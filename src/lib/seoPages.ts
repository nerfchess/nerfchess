// Titles, descriptions and preview copy for every static route, in one table.
//
// Each route's metadata export and its opengraph-image file both read their
// row, so the search title, the chat preview title and the card image never
// drift apart. Rules the guard (npm run test:seo-dupes) holds every row to:
// unique title and description, description 50 to 160 characters, sentence
// case, no em dash, the brand at most once in the title (pageMeta adds
// " · Nerf Chess" only when the title does not already name the game).

import type { Metadata } from "next";
import { pageMeta, type PageMetaInput } from "@/lib/seo";

export type PageSeo = {
  title: string;
  description: string;
  /** Preview card: the section label, and an optional shorter title and
   *  subtitle for the image (the search title can be longer). */
  kicker: string;
  cardTitle?: string;
  cardSubtitle?: string;
  mode?: "buff" | "nerf";
  noindex?: boolean;
  type?: PageMetaInput["type"];
  /** The search phrases the route targets (kept from the first SEO wave). */
  keywords?: string[];
};

/** Rounded down to the hundred, "1,600+": true for as long as the library
 *  only grows, and derived from it (see liveCardCount in seoCards.ts). */
export const CARD_COUNT_PHRASE = "1,600+";

export const PAGES = {
  "/play": {
    title: "Play Nerf Chess against the bot or a friend",
    description:
      "Start a game in your browser: Buff mode drafts power-up cards, Nerf mode deals a secret handicap. Pick a bot strength or a clock and play free.",
    kicker: "Play",
    keywords: ["play nerf chess", "chess variant vs computer", "power-up chess online", "buff chess bot", "play chess with power ups", "chess variant against bot", "free online chess variant"],
    cardTitle: "Play against the bot or a friend",
    cardSubtitle: "Buff mode or Nerf mode, any clock, free in your browser.",
  },
  "/lobby": {
    title: "Play Nerf Chess online against real people",
    description:
      "Rated Buff and Nerf queues, open challenges and live games to watch. Get matched with a real opponent in seconds, free in your browser.",
    kicker: "Lobby",
    keywords: ["play chess variant online", "chess with power ups multiplayer", "online chess variant lobby", "nerf chess lobby", "buff chess online", "chess variant matchmaking"],
    cardTitle: "Play online against real people",
    cardSubtitle: "Rated Buff and Nerf queues, open challenges and live games.",
  },
  "/codex": {
    title: "Codex: every Nerf Chess card and rule",
    description:
      "Browse every Nerf Chess card: power-up buffs, secret nerfs, hexes, boons and items, each graded by tier from Trivial to Mythic. Search and filter the lot.",
    kicker: "Codex",
    keywords: ["nerf chess cards", "chess power up list", "chess card list", "buff chess cards", "chess with cards rules", "power up chess cards", "chess variant card library"],
    cardTitle: "Every card and rule",
  },
  "/codex/suggest": {
    title: "Suggest a card for the codex",
    description:
      "Have an idea for a Nerf Chess card? Suggest a new nerf, buff, hex or boon, and the team reviews every idea for the codex.",
    kicker: "Codex",
    cardTitle: "Suggest a card",
    cardSubtitle: "Propose a nerf, buff, hex or boon for the codex.",
  },
  "/puzzles": {
    title: "Daily chess puzzle: capture the king",
    description:
      "A new Nerf Chess puzzle every day, free and with no account. There is no checkmate here: find the move that captures the king, often under a handicap.",
    kicker: "Daily puzzle",
    keywords: ["daily chess puzzle", "chess variant puzzle", "capture the king puzzle", "nerf chess puzzle", "chess puzzle no checkmate"],
    cardTitle: "Today's puzzle",
    cardSubtitle: "Find the move that captures the king.",
  },
  "/updates": {
    title: "Updates: what is new in Nerf Chess",
    description:
      "A running log of what changed in Nerf Chess: new buff and nerf cards, card animations, rebalanced tiers, clearer card wording and new features.",
    kicker: "Updates",
    cardTitle: "What is new",
    cardSubtitle: "New cards, rebalanced tiers and new features, in one log.",
  },
  "/tutorial": {
    title: "Nerf Chess tutorial: the rules and the card types",
    description:
      "Learn Nerf Chess in a few minutes: win by capturing the king, no checkmate or stalemate, secret nerfs, and the card types. Then start a game.",
    kicker: "Tutorial",
    keywords: ["how to play nerf chess", "nerf chess rules", "nerf chess tutorial", "chess with power ups how to play", "capture the king chess rules", "chess variant rules"],
    cardTitle: "Learn to play in a few minutes",
    cardSubtitle: "Capture the king, no checkmate, secret nerfs and the card types.",
  },
  "/tutorial/walkthrough": {
    title: "Interactive walkthrough: your first moves",
    description:
      "A guided board that walks you through capturing the king, drafting a card and playing with a secret nerf, one move at a time.",
    kicker: "Tutorial",
    cardTitle: "Your first moves, guided",
  },
  "/tutorial/first-game": {
    title: "Your first game: a guided match against the bot",
    description:
      "Play your first Nerf Chess game against the computer, with hints on drafting cards, using them, and closing in on the enemy king.",
    kicker: "Tutorial",
    cardTitle: "Your first game, guided",
  },
  "/guide": {
    title: "What is Nerf Chess? The complete guide",
    description:
      "Nerf Chess is a free chess variant: carry a secret handicap in Nerf mode or draft power-up cards in Buff mode, and win by capturing the king. Start here.",
    kicker: "Guide",
    cardTitle: "What is Nerf Chess?",
    cardSubtitle: "Secret handicaps, power-up cards, and the king is there to be taken.",
    type: "article",
  },
  "/guide/how-to-play": {
    title: "How to play Nerf Chess: rules and card types",
    description:
      "The Nerf Chess rules in five minutes: capture the king to win, no checkmate or stalemate, secret handicaps, and the card types from nerf to item.",
    kicker: "Guide",
    cardTitle: "How to play",
    cardSubtitle: "Capture the king to win. No checkmate, no stalemate.",
    type: "article",
  },
  "/guide/nerf-mode": {
    title: "Nerf mode: chess with secret handicaps",
    description:
      "Every player carries a hidden handicap. Pick one of two secret rules, deduce your opponent's, and draft hexes to curse them. How Nerf mode works.",
    kicker: "Guide",
    cardSubtitle: "Pick a secret rule, deduce your opponent's, and hex them.",
    mode: "nerf",
    type: "article",
  },
  "/guide/buff-mode": {
    title: "Buff mode: chess with power-up cards",
    description:
      "No handicaps, just power: both players draft a buff every 5 moves, tiers climb from Trivial to Unhinged, and the stronger army wins. Rules and strategy.",
    kicker: "Guide",
    cardSubtitle: "Draft a power-up every 5 moves and build the stronger army.",
    mode: "buff",
    type: "article",
  },
  "/guide/chess-with-power-ups": {
    title: "Chess with power-ups: free to play online",
    description:
      "Looking for a chess game with power-ups? Draft a power-up card every 5 moves in Nerf Chess, free in your browser. How it works and how to start.",
    kicker: "Guide",
    keywords: ["chess with power ups", "power up chess", "chess game with power ups", "is there a chess game with power ups", "chess power ups online", "buff chess", "chess with special abilities", "chess with cards and power ups"],
    cardTitle: "Chess with power-ups",
    cardSubtitle: "Yes, it exists, and it is free in your browser.",
    type: "article",
  },
  "/guide/capture-the-king": {
    title: "Capture the king: chess with no checkmate",
    description:
      "In capture-the-king chess you win by taking the enemy king, not by checkmate. How no-checkmate chess works in Nerf Chess and how it changes play.",
    kicker: "Guide",
    keywords: ["capture the king chess", "chess capture the king", "no checkmate chess", "chess win by capturing king", "chess without checkmate", "king capture chess variant", "chess no stalemate"],
    cardSubtitle: "You win by taking the king, so the king is a real piece.",
    type: "article",
  },
  "/guide/chess-roguelike": {
    title: "Chess roguelike and chess card game",
    description:
      "Chess crossed with a card game: draft from a tiered deck of 1,600+ cards every 5 moves, with power that escalates like a roguelike. How the draft works.",
    kicker: "Guide",
    keywords: ["chess roguelike", "chess card game", "chess deckbuilder", "roguelike chess", "chess with cards", "chess drafting game", "deckbuilding chess", "chess card drafting"],
    cardSubtitle: "A tiered deck, a draft every 5 moves, and power that escalates.",
    type: "article",
  },
  "/guide/chess-variants": {
    title: "Chess variants: where Nerf Chess fits",
    description:
      "A tour of popular chess variants, from Chess960 and Crazyhouse to Atomic, Fog of War and Duck Chess, and where Nerf Chess fits among them.",
    kicker: "Guide",
    cardTitle: "Chess variants",
    cardSubtitle: "From Chess960 to Duck Chess, and where Nerf Chess fits.",
    type: "article",
  },
  "/guide/glossary": {
    title: "Glossary: every Nerf Chess term",
    description:
      "Every Nerf Chess term in one place: nerf, buff, hex, boon, item, draft, bank, reroll, the tiers up to Apex and Mythic, freeze, shield and Chess Diff.",
    kicker: "Guide",
    cardTitle: "Glossary",
    cardSubtitle: "Nerf, buff, hex, boon, bank, reroll and every other term.",
    type: "article",
  },
  "/about": {
    title: "About Nerf Chess and the team behind it",
    description:
      "Nerf Chess is a free online chess variant with secret handicaps and power-up cards. What it is, why it plays differently, and the team that makes it.",
    kicker: "About",
    keywords: ["about nerf chess", "what is nerf chess", "chess variant with power ups", "chess with secret rules", "capture the king chess"],
    cardTitle: "Chess, with secrets",
    cardSubtitle: "What Nerf Chess is, and the team that makes it.",
  },
  "/faq": {
    title: "Nerf Chess FAQ: how the variant works",
    description:
      "Answers to common questions: the two modes, what nerfs and buffs are, how drafting and banking work, ratings, and playing a friend with no account.",
    kicker: "FAQ",
    keywords: ["nerf chess faq", "how does nerf chess work", "chess with power ups faq", "buff chess rules", "chess variant questions", "is nerf chess free"],
    cardTitle: "Questions and answers",
    cardSubtitle: "The two modes, drafting, banking, ratings and friend games.",
  },
  "/contact": {
    title: "Contact the Nerf Chess team",
    description:
      "Share a card idea, report a bug or talk strategy on the Nerf Chess Discord, and find updates and clips on Instagram, TikTok and YouTube.",
    kicker: "Contact",
    cardTitle: "Get in touch",
  },
  "/guidelines": {
    title: "Community guidelines",
    description:
      "The house rules for playing on Nerf Chess: play fair, keep chat friendly, pick a reasonable name, and use the report tools when something is off.",
    kicker: "Guidelines",
    cardTitle: "Community guidelines",
  },
  "/privacy-policy": {
    title: "Privacy policy",
    description:
      "The Nerf Chess privacy policy: what information the site keeps, how it is used and shared, how long it is kept, and the choices you have about it.",
    kicker: "Privacy",
    cardTitle: "Privacy policy",
  },
  "/terms-of-service": {
    title: "Terms of service",
    description:
      "The terms for using Nerf Chess: your account, fair play, community conduct, the content you post, and the limits of the service.",
    kicker: "Terms",
    cardTitle: "Terms of service",
  },
  "/leaderboard": {
    title: "Leaderboard: the top Nerf Chess players",
    description:
      "The strongest Nerf Chess players in each rated pool. Buff mode and Nerf mode keep separate ratings, so climb the board in the mode you play best.",
    kicker: "Leaderboard",
    keywords: ["nerf chess leaderboard", "chess variant rankings", "chess variant ratings", "top chess variant players"],
    cardTitle: "The top players",
    cardSubtitle: "Separate ratings for Buff mode and Nerf mode.",
  },
  "/tournaments": {
    title: "Tournaments: live Nerf Chess events",
    description:
      "Timed Nerf Chess tournaments in Buff and Nerf mode, where drafting and secret handicaps meet a live bracket. Join an event and climb the standings.",
    kicker: "Tournaments",
    keywords: ["nerf chess tournaments", "chess variant tournament", "power up chess tournament", "online chess variant events"],
    cardTitle: "Tournaments",
    cardSubtitle: "Timed events in Buff and Nerf mode. Join one and climb.",
  },
  "/clubs": {
    title: "Clubs: Nerf Chess teams and communities",
    description:
      "Find or start a Nerf Chess club: a player-run community with its own board, members and games. Join one and play with your team.",
    kicker: "Clubs",
    keywords: ["nerf chess clubs", "chess variant teams", "chess variant community groups", "chess with power ups clubs"],
    cardTitle: "Clubs",
    cardSubtitle: "Player-run communities with their own board and games.",
  },
  "/community": {
    title: "Community: Nerf Chess players and clubs",
    description:
      "Who is playing Nerf Chess right now: top-rated players, the busiest members, live games, clubs and recent results in Buff and Nerf mode.",
    kicker: "Community",
    keywords: ["nerf chess community", "chess variant players", "chess variant clubs", "online chess variant community"],
    cardTitle: "Players, clubs and live games",
  },
  "/tv": {
    title: "Nerf Chess TV: watch live games",
    description:
      "Watch live Nerf Chess games as they happen: secret handicaps and drafted power-up cards playing out in real time. Free to spectate, no account.",
    kicker: "TV",
    keywords: ["watch chess variant", "nerf chess tv", "live chess variant games", "spectate chess with power ups"],
    cardTitle: "Watch live games",
    cardSubtitle: "Secret handicaps and power-up cards, in real time.",
  },
  "/achievements": {
    title: "Achievements: Nerf Chess badges and milestones",
    description:
      "Every Nerf Chess achievement in one place: badges for winning with power-ups, surviving brutal nerfs, capturing kings and mastering both modes.",
    kicker: "Achievements",
    keywords: ["nerf chess achievements", "chess variant badges", "chess with power ups achievements"],
    cardTitle: "Badges and milestones",
  },
  "/analysis": {
    title: "Analysis board",
    description:
      "Set up any Nerf Chess position on a free analysis board: replay games, test buff and hex lines, and explore capture-the-king rules move by move.",
    kicker: "Analysis",
    cardTitle: "Analysis board",
  },
  "/login": {
    title: "Sign in or create an account",
    description:
      "Sign in to play rated Nerf Chess, track your Buff and Nerf ratings and keep your game history. Accounts are free, and friend games need none.",
    kicker: "Sign in",
  },
  // Per-viewer surfaces: own title and canonical, kept out of the index.
  "/history": {
    title: "Your game history",
    description: "The Nerf Chess games you have played on this device, with a replay of each one you can step through move by move.",
    kicker: "History",
    noindex: true,
  },
  "/stats": {
    title: "Your statistics",
    description: "Your Nerf Chess statistics: results, streaks, rating highs and lows, and your record in each rated pool.",
    kicker: "Statistics",
    noindex: true,
  },
  "/profile": {
    title: "Your profile",
    description: "Your Nerf Chess profile: ratings in Buff and Nerf mode, recent games, friends, clubs and achievements.",
    kicker: "Profile",
    noindex: true,
  },
  "/profile/edit": {
    title: "Edit profile",
    description: "Change your Nerf Chess profile picture, flair and bio, and choose who can see your friends list and when you are online.",
    kicker: "Profile",
    noindex: true,
  },
  "/settings": {
    title: "Settings",
    description: "Nerf Chess settings: the board and pieces, sound, motion, game preferences and your account.",
    kicker: "Settings",
    noindex: true,
  },
  "/friend": {
    title: "Play a friend",
    description: "Create a private Nerf Chess game and send the code to a friend, or join a friend's game with their code. No account needed.",
    kicker: "Play a friend",
    noindex: true,
  },
  "/inbox": {
    title: "Inbox",
    description: "Your Nerf Chess messages: conversations with friends and other players, newest first.",
    kicker: "Inbox",
    noindex: true,
  },
  "/game": {
    title: "Game against the bot",
    description: "A Nerf Chess game against the computer in your browser, in Buff mode or Nerf mode, at the strength you picked.",
    kicker: "Game",
    noindex: true,
  },
} satisfies Record<string, PageSeo>;

export type StaticPath = keyof typeof PAGES;

/** The route's metadata. `image: "segment"` when the route folder has its
 *  own opengraph-image file. */
export function staticMeta(path: StaticPath, opts: { image?: "segment" } = {}): Metadata {
  const p: PageSeo = PAGES[path];
  return pageMeta({
    title: p.title,
    description: p.description,
    path,
    noindex: p.noindex,
    type: p.type,
    image: opts.image,
    keywords: p.keywords,
  });
}
