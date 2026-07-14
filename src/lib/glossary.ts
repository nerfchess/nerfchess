// Plain-language definitions for chess and NerfChess jargon that shows up in
// rule and card descriptions, plus the richer entries behind the /guide/glossary
// page and the click-to-expand popovers.
//
// Every entry carries a short one-liner (`def`, used by the in-game hover
// tooltip and as the first popover line) and most carry a longer `detail`
// (2-4 sentences), an optional `example`, and `related` cross-links. All
// gameplay facts in the details are sourced from the engine
// (src/engine/draft.ts, buff.ts, game.ts, src/lib/tiers.ts, worker.ts) — when
// tuning constants change there, change the prose here too.
//
// Matching is case-insensitive and whole-word only (see GLOSSARY_REGEX /
// GlossaryText). Variant spellings and plurals go in `aliases` so either form
// underlines. Keep every `def` to one short sentence.

export const GLOSSARY_GROUPS = [
  "Modes & winning",
  "Card types",
  "Playing a card",
  "The draft",
  "Effects on the board",
  "Board vocabulary",
] as const;

export type GlossaryGroup = (typeof GLOSSARY_GROUPS)[number];

export interface GlossaryEntry {
  /** Canonical display name ("Lock-in window"). */
  term: string;
  /** Anchor id on /guide/glossary (kebab-case, stable). */
  slug: string;
  /** One-sentence definition: the quick tooltip line. */
  def: string;
  /** Longer, engine-accurate expansion (2-4 sentences). */
  detail?: string;
  /** A short concrete example. */
  example?: string;
  /** Slugs of related entries, cross-linked on the glossary page. */
  related?: string[];
  /** Extra strings (plurals, synonyms) that also match this entry. */
  aliases?: string[];
  /** Section heading on the glossary page. */
  group: GlossaryGroup;
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // --- Modes & winning -------------------------------------------------------
  {
    term: "Nerf mode",
    slug: "nerf-mode",
    group: "Modes & winning",
    def: "The mode of secret handicaps: each player picks one hidden nerf before move one, then drafts hexes and boons as the game runs.",
    detail:
      "Both players are shown two nerf cards and pick one inside a 20-second lock-in window (an unpicked seat auto-takes its first card). Both players' options are public — only the picks stay secret until the game ends. A draft then lands every 5 of your own moves: about 60% of draws prefer the hex bucket, the rest boons and items. Nerf mode is rated in its own pool, separate from Buff mode.",
    related: ["nerf", "hex", "boon", "lock-in-window", "buff-mode"],
  },
  {
    term: "Buff mode",
    slug: "buff-mode",
    group: "Modes & winning",
    def: "The mode with no handicaps: both players draft power-up cards every 5 moves and race to build the stronger army.",
    detail:
      "Buff mode has no nerfs at all, so it never offers hexes or nerf-relief cards — every draft is a straight power-up. Offers climb the tier ladder as the game goes on, and the mode keeps its own rating pool, separate from Nerf mode.",
    related: ["buff", "draft", "tier", "nerf-mode"],
  },
  {
    term: "Capture the king",
    slug: "capture-the-king",
    group: "Modes & winning",
    aliases: ["king capture"],
    def: "The win condition: there is no checkmate and no stalemate — the game ends the instant a king is actually taken.",
    detail:
      "Because only capture ends the game, moving into check is legal, both kings can be in check at the same time, and you may castle through, into, or out of check. The first king captured wins on the spot, even if the capturer's own king was hanging. Games can still be drawn by the fifty-move rule, threefold repetition, or mutual paralysis.",
    related: ["check", "forced-pass", "premove", "castling"],
  },
  {
    term: "Check",
    slug: "check",
    group: "Modes & winning",
    def: "A direct threat to capture the king — which, in Nerf Chess, you are never forced to answer.",
    detail:
      "Check still exists as a fact about the board, but carries no rule: you may ignore it, move into it, or leave your king in it, and both kings can be in check at once. Ignoring it usually loses on the spot, because the game ends the moment a king is captured. Only inside a Chess Diff sub-game do the standard check rules return.",
    related: ["capture-the-king", "premove", "chess-diff"],
  },
  {
    term: "Flagging",
    slug: "flagging",
    group: "Modes & winning",
    def: "Losing a timed game because your clock reached zero.",
    detail:
      "Clocks pause during the opening nerf pick and each draft's 20-second lock-in window, and only start charging after a short grace at the start of the game. Clock-attack cards (Time Thief, Deadline and friends) pressure your time but can never push a clock below a 3-second floor, so a card alone can never flag you.",
    related: ["increment", "lock-in-window"],
  },
  {
    term: "Increment",
    slug: "increment",
    group: "Modes & winning",
    def: "Seconds added to your clock after each of your moves; a 3+2 game is 3 minutes with 2 seconds per move.",
    detail:
      "Speed buckets are estimated as base time plus 40 moves of increment: under 30 seconds is UltraBullet, under 3 minutes Bullet, under 8 minutes Blitz, and everything slower (or untimed) counts as Rapid.",
    related: ["flagging"],
  },
  {
    term: "Premove",
    slug: "premove",
    group: "Modes & winning",
    aliases: ["premoves"],
    def: "A move queued during your opponent's turn that fires the instant it becomes your move.",
    detail:
      "Premoves are filtered by your own nerf and include buff-granted movement, so you can only queue what you could actually play. A premove that would land or leave your own king in check is cancelled instead of played: walking into check stays legal, but only as a deliberate manual move — a blind premove never does it for you.",
    related: ["check", "capture-the-king"],
  },
  {
    term: "Forced pass",
    slug: "forced-pass",
    group: "Modes & winning",
    def: "When effects leave you with no legal move, your turn passes automatically instead of losing the game.",
    detail:
      "There is no stalemate: a fully locked-down player simply passes, their effect timers tick down as if they had moved, and the turn goes back. If both players are paralyzed at once the game is a draw. Move-restricting nerfs and leashes relax for a turn rather than ever leaving you at zero moves.",
    related: ["freeze", "capture-the-king"],
  },

  // --- Card types ------------------------------------------------------------
  {
    term: "Nerf",
    slug: "nerf",
    group: "Card types",
    aliases: ["nerfs"],
    def: "A secret handicap rule that weakens one player for the whole game.",
    detail:
      "Chosen one-of-two before the first move in Nerf mode and revealed only when the game ends. The board pre-filters anything your nerf forbids, so you can never break it by accident — though some nerfs instead add a losing condition that fires on its own terms. A nerf can never strand you: if its filter would empty your move list, it relaxes for that one turn.",
    example: "“You cannot capture queens.”",
    related: ["nerf-mode", "boon", "suspend"],
  },
  {
    term: "Buff",
    slug: "buff",
    group: "Card types",
    aliases: ["buffs"],
    def: "A helpful power-up card a player drafts to gain an edge.",
    detail:
      "Buffs are passive (work while held), instant (fire the moment they are picked), or activated (used on your turn, usually at the cost of that turn unless the card is a free action). A card you hold unspent is never offered to you again.",
    related: ["draft", "activated", "passive", "instant", "free-action"],
  },
  {
    term: "Hex",
    slug: "hex",
    group: "Card types",
    aliases: ["hexes"],
    def: "A curse-style card that hampers your opponent, the bulk of Nerf mode's draft.",
    detail:
      "About 60% of nerf-mode draws prefer the hex bucket: freezes, petrifications, muzzles, and other curses cast on the enemy army. Hexes never appear in Buff mode, and kings are protected from the harshest of them — no hex can freeze or petrify a king.",
    example: "Cold Feet: your opponent's pawns cannot capture for their next 3 turns.",
    related: ["freeze", "walnut", "nerf-mode"],
  },
  {
    term: "Boon",
    slug: "boon",
    group: "Card types",
    aliases: ["boons"],
    def: "A beneficial card in Nerf mode's pool: relief from your own nerf, or a light supportive effect.",
    detail:
      "Nerf-relief boons soften, suspend, or even permanently remove your handicap. While your nerf is suspended or removed, relief cards leave your draft pool entirely — and if you are offered nerf-relief twice without ever taking one, the category stops appearing for the rest of the game.",
    example: "Reprieve suspends your nerf for your next 2 turns.",
    related: ["nerf", "suspend", "item"],
  },
  {
    term: "Item",
    slug: "item",
    group: "Card types",
    aliases: ["items"],
    def: "A playful one-use consumable card, drafted in both modes.",
    detail:
      "Items are the light-hearted corner of the pool — apples, bananas, coconuts — spent for a small one-shot effect. In Nerf mode they share the non-hex slice of the draft with boons; in Buff mode they roll alongside the power-ups.",
    related: ["boon", "hex"],
  },

  // --- Playing a card ----------------------------------------------------------
  {
    term: "Instant",
    slug: "instant",
    group: "Playing a card",
    def: "A card whose effect fires the moment you pick it in the draft; there is nothing to activate later.",
    detail:
      "Freezes, reveals, and board strikes are often instant: the effect resolves during the draft itself and never costs a move. The card then sits in your dock spent, as a record of what fired.",
    related: ["activated", "passive", "turn-cost"],
  },
  {
    term: "Activated",
    slug: "activated",
    group: "Playing a card",
    def: "A card that waits in your dock until you choose to use it, usually spending your turn.",
    detail:
      "Activating a card is your move for that turn unless it is a free action. Some activated cards ask you to pick targets (squares, or one of the opponent's cards) before they resolve, and every activated card can fire at most once.",
    related: ["free-action", "turn-cost", "instant"],
  },
  {
    term: "Passive",
    slug: "passive",
    group: "Playing a card",
    def: "A card that works automatically the whole time you hold it.",
    detail:
      "Passive cards change the rules quietly — a piece gains a new way to move, your army gets a standing guard — with nothing to click. They keep working until spent, nullified, or the game ends. Nerfs themselves are always passive.",
    related: ["activated", "instant", "turn-cost"],
  },
  {
    term: "Free action",
    slug: "free-action",
    group: "Playing a card",
    aliases: ["free actions"],
    def: "An activated card that resolves within your turn instead of consuming it.",
    detail:
      "The extra-move family are free actions: you play the card and still make your normal move. Every other activated card costs the turn — the turn-cost badge on each card tells you which, straight from the engine's own fields.",
    related: ["activated", "extra-move", "turn-cost"],
  },
  {
    term: "Turn cost",
    slug: "turn-cost",
    group: "Playing a card",
    def: "The badge on every card saying what playing it costs: your turn, free, instant, or passive.",
    detail:
      "The four values are derived from the same fields the engine uses to decide whether to pass the turn after a card fires, so the label can never disagree with what the game actually does.",
    related: ["activated", "free-action", "instant", "passive"],
  },
  {
    term: "Signature animation",
    slug: "signature-animation",
    group: "Playing a card",
    aliases: ["signature animations"],
    def: "The bespoke board animation each card plays when it fires.",
    detail:
      "Every card in the library has its own visual flourish — roughly 180 are hand-crafted and the rest are generated from the card's family — so no card fires silently. Signatures are cosmetic only and can be toggled off with the FX button.",
    related: ["instant", "activated"],
  },
  {
    term: "Chess Diff",
    slug: "chess-diff",
    group: "Playing a card",
    def: "A tier-6 card that pauses the game and spawns a fresh, completely normal game of 1+0 chess; the winner seizes an apex card.",
    detail:
      "While the diff runs there are no drafts, no nerfs, and no buffs — and the standard chess rules return, so you may not move into check, and the diff is decided by checkmate, stalemate, or its 1-minute clocks. Only the diff's winner is handed a guaranteed apex (tier 9) card; a drawn diff grants nobody anything. The paused board, effects, and clocks then resume exactly where they left off.",
    related: ["apex", "tier", "capture-the-king"],
  },

  // --- The draft ---------------------------------------------------------------
  {
    term: "Draft",
    slug: "draft",
    group: "The draft",
    aliases: ["drafts", "drafting"],
    def: "The recurring pick: every 5 of your own moves you are offered two cards and keep one.",
    detail:
      "Both players draft at the same time on a shared trigger, and in online games each pick has a 20-second lock-in window with the game clock paused. You can skip an offer to bank it or reroll it for a fresh set, and later cards bend the ritual further: three-card offers, take-both, blocked drafts, forced tiers.",
    related: ["bank", "reroll", "tier", "lock-in-window", "take-both"],
  },
  {
    term: "Tier",
    slug: "tier",
    group: "The draft",
    aliases: ["tiers"],
    def: "A card's power level, from I (Trivial) to VIII (Unhinged), plus the granted-only bands IX (Apex) and X (Mythic).",
    detail:
      "The ladder reads Trivial, Easy, Common, Severe, Brutal, Cruel, Punishing, Unhinged. Draft rounds climb a fixed curve — roughly tiers I, II, III, V, VII round by round, with a small random wobble — and every level above VI has a 45% chance per card to slip back down one, so tier VII–VIII offers stay rare blowout moments. Tiers IX and X never roll in the normal draft.",
    related: ["apex", "mythic", "draft", "bank"],
  },
  {
    term: "Apex",
    slug: "apex",
    group: "The draft",
    aliases: ["apex card", "apex cards"],
    def: "A tier-9 card: never offered by the normal draft, only granted.",
    detail:
      "There are exactly three roads to an apex card: bank an offer that contained a tier-8 card (your next, banked offer then deals two apex cards, guaranteed), win a Chess Diff, or hit the Jackpot gamble. Every apex grant also rolls a roughly 10% chance to upgrade into a tier-10 mythic instead.",
    related: ["mythic", "bank", "chess-diff", "tier"],
  },
  {
    term: "Mythic",
    slug: "mythic",
    group: "The draft",
    aliases: ["mythics"],
    def: "A tier-10 card, the rarest band: an apex grant upgrades into a mythic about one time in ten.",
    detail:
      "Mythics replace a tier-9 apex roll roughly 10% of the time, per slot, wherever apex cards are granted. Rerolling an apex offer never downgrades a landed mythic — but a tier-9 slot rerolls the upgrade gate again, so a reroll can still roll up into one.",
    related: ["apex", "reroll", "tier"],
  },
  {
    term: "Bank",
    slug: "bank",
    group: "The draft",
    aliases: ["banked", "banking"],
    def: "Skipping a draft to save its value: your next offer rolls exactly one tier higher.",
    detail:
      "Banking never stacks past +1, so back-to-back skips buy nothing extra. The exception is at the top: banking an offer that contained a tier-8 card promotes your next offer into a guaranteed two-card apex (tier 9–10) offer — you do not have to draft the tier-8, passing it up is what earns the pull.",
    related: ["draft", "apex", "tier"],
  },
  {
    term: "Reroll",
    slug: "reroll",
    group: "The draft",
    aliases: ["rerolls", "rerolled"],
    def: "Discard the offer on the table and roll a fresh set of cards at the same tiers.",
    detail:
      "Each player starts the game with one reroll, and draft cards can grant more. The fresh cards are guaranteed to differ from the ones you were looking at, while the draft's index, tiers, and any banked bonus stay put. On an apex offer, a landed mythic is never rerolled away.",
    related: ["draft", "mythic"],
  },
  {
    term: "Take-both",
    slug: "take-both",
    group: "The draft",
    aliases: ["take both"],
    def: "An effect that lets you keep every card in your next offer instead of choosing just one.",
    detail:
      "Granted by draft-manipulation cards, and it can cover several future offers at once. Combined with a prep effect (a three-card offer), that is three cards from a single draft.",
    related: ["draft", "prep"],
  },
  {
    term: "Prep",
    slug: "prep",
    group: "The draft",
    def: "An effect that makes your next draft offer three cards instead of two.",
    detail:
      "You still pick one, unless take-both is running. A prepped offer is never collapsed into an apex offer: it owes you three cards one tier higher and keeps the normal path even when its banked tier would hit the top.",
    related: ["take-both", "draft", "bank"],
  },
  {
    term: "Lock-in window",
    slug: "lock-in-window",
    group: "The draft",
    aliases: ["lock in window", "lock-in"],
    def: "The 20 seconds each online pick must resolve in while the game clock is paused.",
    detail:
      "The opening nerf pick auto-resolves at the deadline — an unpicked seat takes its first card — so a vanished player cannot hold the table hostage. A mid-game buff offer instead stays open when the window ends, but the clock starts running again: deliberating past the window costs your own time.",
    related: ["draft", "flagging"],
  },
  {
    term: "Blocked draft",
    slug: "blocked-draft",
    group: "The draft",
    aliases: ["blocked drafts"],
    def: "An opponent's effect that makes your next draft(s) skip outright: no cards, no bank.",
    detail:
      "Each blocked offer is simply eaten when the draft trigger fires. Related weapons in the same family: Nullify makes your next drafted cards arrive dead, and Suppress strips draft-manipulation cards out of your next offers.",
    related: ["draft", "forced-tier"],
  },
  {
    term: "Forced tier",
    slug: "forced-tier",
    group: "The draft",
    def: "An effect (Recast, Draft Tyranny) that pins your next offer to a fixed tier instead of the round's shared roll.",
    detail:
      "The forced tier overrides banking and boosts for that one offer. Forcing a low tier onto your opponent late in the game is a real curse; forcing a high one onto yourself is a gift.",
    related: ["tier", "draft", "blocked-draft"],
  },

  // --- Effects on the board ----------------------------------------------------
  {
    term: "Freeze",
    slug: "freeze",
    group: "Effects on the board",
    aliases: ["freezes", "frozen"],
    def: "An effect that locks a piece in place: it cannot move at all until the timer runs out.",
    detail:
      "The timer ticks down after each of the frozen side's own turns. Kings are never frozen, and if three or more of your pieces are frozen your king always keeps its plain one-square steps. A player left with no legal move gets a forced pass, never a loss.",
    related: ["walnut", "forced-pass", "hex"],
  },
  {
    term: "Walnut",
    slug: "walnut",
    group: "Effects on the board",
    aliases: ["walnuts", "petrify", "petrified", "petrifies"],
    def: "A hexed piece sealed in a shell (or petrified): it can only shuffle one square at a time until it frees itself.",
    detail:
      "Unlike a freeze, a walnut or petrified piece can still crawl one king-step per move, so it plays as a slow rather than a statue. The timer ticks on the owner's own turns, and kings are never turned into walnuts. Capturing the piece removes the effect with it.",
    related: ["freeze", "hex"],
  },
  {
    term: "Shield",
    slug: "shield",
    group: "Effects on the board",
    aliases: ["shields", "shielded"],
    def: "A protection that blocks pieces or squares from being captured while it lasts.",
    detail:
      "A shield can cover chosen squares (following the piece standing there when it moves) or your whole army, and its timer ticks on your opponent's turns. It never protects the king itself — king invulnerability is exclusively the king-safe ward. And an uncapturable piece may not be the one to capture the enemy king: you must expose a piece to win.",
    related: ["uncapturable", "ward", "king-safe"],
  },
  {
    term: "Ward",
    slug: "ward",
    group: "Effects on the board",
    aliases: ["wards", "warded"],
    def: "A lighter protective charm that guards a piece, the subtler cousin of a shield.",
    detail:
      "The same law binds every protection: while the warded piece cannot be captured, it may not deliver the king-capture itself.",
    related: ["shield", "uncapturable"],
  },
  {
    term: "Uncapturable",
    slug: "uncapturable",
    group: "Effects on the board",
    def: "A piece that cannot currently be taken — and therefore may not take the enemy king.",
    detail:
      "Shields, wards, and the king-safe effect all make pieces uncapturable for a time. The balance rule is symmetric: an untouchable attacker would be a riskless finish, so the winning capture must always be made by a piece your opponent could have taken.",
    related: ["shield", "king-safe", "ward"],
  },
  {
    term: "King-safe",
    slug: "king-safe",
    group: "Effects on the board",
    aliases: ["king safe"],
    def: "A ward on your king itself: while it runs, your king cannot be captured.",
    detail:
      "The only effect allowed to make a king uncapturable (shields never cover kings), and it always carries a drawback. The mirror rule applies: a king-safe king may not capture the enemy king while its own ward lasts. Its timer ticks on the opponent's turns.",
    related: ["shield", "uncapturable", "capture-the-king"],
  },
  {
    term: "Barred",
    slug: "barred",
    group: "Effects on the board",
    aliases: ["barred squares"],
    def: "Squares that are off-limits to you while the effect lasts.",
    detail:
      "A move that would capture the king ignores any wall — winning is king capture, so a barred zone can never seal the game unwinnable. Full-line walls (a whole file or rank) also block moves that cross the line, not just ones landing on it, and every wall relaxes for a turn rather than leaving you with zero moves.",
    related: ["capture-the-king", "forced-pass"],
  },
  {
    term: "Suspend",
    slug: "suspend",
    group: "Effects on the board",
    aliases: ["suspended", "suspends"],
    def: "To temporarily pause a nerf's effect, usually via a boon.",
    detail:
      "While your nerf is suspended (Reprieve, Grace Period) or removed for good (Nerf Breaker), the moves it forbade come back — and nerf-relief cards leave your draft pool, since there is nothing left to relieve.",
    related: ["nerf", "boon"],
  },
  {
    term: "King-only",
    slug: "king-only",
    group: "Effects on the board",
    aliases: ["king only"],
    def: "A restriction under which you may only move your king until it expires.",
    detail:
      "The timer ticks on your own turns. Your king can still capture, and if even king moves are impossible the forced-pass rule catches you rather than losing the game.",
    related: ["forced-pass"],
  },
  {
    term: "No-pawn-advance",
    slug: "no-pawn-advance",
    group: "Effects on the board",
    def: "A restriction that stops your pawns from moving straight forward; pawn captures stay legal.",
    detail:
      "Only the forward push is blocked — diagonal captures (and en passant) still work, so a pawn chain can keep fighting while it lasts.",
    related: ["hex"],
  },
  {
    term: "Extra move",
    slug: "extra-move",
    group: "Effects on the board",
    aliases: ["extra moves"],
    def: "A granted bonus move: you move again before your opponent replies.",
    detail:
      "Extra moves chain — but while you are chaining, capturing the enemy king is off the table until your opponent has played one reply move. The final chained move may still give check or set up threats; it just cannot end the game on the spot. Extra-move cards are free actions.",
    related: ["skip", "free-action", "capture-the-king"],
  },
  {
    term: "Skip",
    slug: "skip",
    group: "Effects on the board",
    aliases: ["skips", "skipped"],
    def: "A stolen tempo: your opponent's next turn is consumed and you move again.",
    detail:
      "Skips are the mirror of extra moves and obey the same guard: no king capture while the chain runs — the defender always gets one reply before the axe can fall. (Skipping a draft is a different thing: that is banking.)",
    related: ["extra-move", "bank", "capture-the-king"],
  },
  {
    term: "Strike",
    slug: "strike",
    group: "Effects on the board",
    aliases: ["strikes"],
    def: "A card effect that hits one or more squares, clearing or capturing what stands there.",
    detail:
      "The lightning flash you see afterwards is purely visual and fades when your opponent replies. Pieces removed by a strike count as real captures, so they feed the revival pools.",
    related: ["bonk"],
  },
  {
    term: "Bonk",
    slug: "bonk",
    group: "Effects on the board",
    def: "A comedy hit that conks the pieces on the struck squares, the goofy cousin of a strike.",
    detail:
      "The dropped-coconut impact is visual flair; the actual stun is a paired freeze on the same square.",
    related: ["strike", "freeze"],
  },
  {
    term: "Pocket",
    slug: "pocket",
    group: "Effects on the board",
    def: "Your reserve of pieces earned from cards, ready to drop onto the board on a later turn.",
    detail:
      "Crazyhouse-style: some cards grant pieces into your pocket instead of onto the board. A pocket never holds a king, and its contents are yours until dropped.",
    related: ["drop"],
  },
  {
    term: "Drop",
    slug: "drop",
    group: "Effects on the board",
    aliases: ["drops"],
    def: "Placing a piece from your pocket onto an empty square, which spends your turn.",
    detail:
      "A drop can only land on an empty square, so it can never capture anything — the king included. Pawns may never be dropped on the 1st or 8th rank, and a king is never in a pocket. Drops count as legal moves, so a player who can only drop is not stalemated.",
    related: ["pocket", "forced-pass"],
  },
  {
    term: "Amazon",
    slug: "amazon",
    group: "Effects on the board",
    def: "A powerful fairy piece that moves as a queen and a knight combined.",
    detail:
      "The classic super-piece: several cards create one or upgrade an existing piece into one.",
  },

  // --- Board vocabulary --------------------------------------------------------
  {
    term: "Chebyshev distance",
    slug: "chebyshev-distance",
    group: "Board vocabulary",
    aliases: ["chebyshev"],
    def: "How cards measure distance: the larger of the file difference and the rank difference — king steps.",
    detail:
      "Whenever a card says “within N squares”, count how many king moves it would take, not straight-line distance. A square 2 files and 1 rank away is 2 squares away.",
    related: ["file", "rank"],
  },
  {
    term: "Rim",
    slug: "rim",
    group: "Board vocabulary",
    def: "The outer edge of the board: the a- and h-files and the 1st and 8th ranks.",
  },
  {
    term: "File",
    slug: "file",
    group: "Board vocabulary",
    def: "A vertical column of squares on the board, labeled a through h.",
  },
  {
    term: "Rank",
    slug: "rank",
    group: "Board vocabulary",
    def: "A horizontal row of squares on the board, numbered 1 through 8.",
  },
  {
    term: "Back rank",
    slug: "back-rank",
    group: "Board vocabulary",
    def: "The row nearest a player where the pieces start, a classic spot for ambushing a careless king.",
  },
  {
    term: "Home rank",
    slug: "home-rank",
    group: "Board vocabulary",
    def: "The back row where a player's pieces begin the game.",
  },
  {
    term: "Minor piece",
    slug: "minor-piece",
    group: "Board vocabulary",
    aliases: ["minor pieces"],
    def: "A bishop or a knight.",
  },
  {
    term: "Major piece",
    slug: "major-piece",
    group: "Board vocabulary",
    aliases: ["major pieces"],
    def: "A rook or a queen.",
  },
  {
    term: "Double-step",
    slug: "double-step",
    group: "Board vocabulary",
    def: "A pawn's opening option to advance two squares at once from its starting row.",
  },
  {
    term: "En passant",
    slug: "en-passant",
    group: "Board vocabulary",
    def: "A special pawn capture of an enemy pawn that just moved two squares, taken as if it had moved only one.",
    detail:
      "Fully legal in Nerf Chess. One wrinkle: any irregular turn flow (an extra move or a skip) clears the en passant square, so the window can vanish before you use it.",
    related: ["extra-move", "skip"],
  },
  {
    term: "Promotion",
    slug: "promotion",
    group: "Board vocabulary",
    aliases: ["promote", "promotes", "promoted"],
    def: "When a pawn reaches the far side of the board and turns into a stronger piece, usually a queen.",
  },
  {
    term: "Castling",
    slug: "castling",
    group: "Board vocabulary",
    aliases: ["castle", "castles"],
    def: "A single move where the king and a rook shift together to tuck the king safely away.",
    detail:
      "In Nerf Chess you may castle through, into, or out of check — only the normal geometry (empty squares, an unmoved king and rook) is required. Cards can even restore castling rights you already spent. Only inside a Chess Diff do the standard castling-through-check bans return.",
    related: ["capture-the-king", "chess-diff"],
  },
  {
    term: "Capture",
    slug: "capture",
    group: "Board vocabulary",
    def: "Taking an enemy piece by moving onto its square.",
    detail:
      "Captures matter beyond material here: pieces your opponent has taken from you form your revival pool, which resurrection cards draw from.",
    related: ["capture-the-king"],
  },
];

// --- Derived lookup structures ----------------------------------------------

/** Matching key (lowercased term or alias) -> its entry. */
const KEY_TO_ENTRY = new Map<string, GlossaryEntry>();
for (const entry of GLOSSARY_ENTRIES) {
  for (const key of [entry.term, ...(entry.aliases ?? [])]) {
    KEY_TO_ENTRY.set(key.toLowerCase(), entry);
  }
}

const SLUG_TO_ENTRY = new Map<string, GlossaryEntry>(
  GLOSSARY_ENTRIES.map((e) => [e.slug, e]),
);

/** Back-compat flat record: matching key -> one-line definition. */
export const GLOSSARY: Record<string, string> = Object.fromEntries(
  [...KEY_TO_ENTRY.entries()].map(([key, entry]) => [key, entry.def]),
);

// Build a single case-insensitive regex that matches any glossary term as a
// whole word or phrase. Terms are sorted longest-first so multi-word phrases
// (for example "back rank") win over the shorter words they contain. Hyphens
// and word characters both count as boundaries, so "rank" never matches inside
// "prankster" and "king-only" is not split at the hyphen. Compiled once at
// module load.
const TERMS = [...KEY_TO_ENTRY.keys()].sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GLOSSARY_REGEX = new RegExp(
  `(?<![A-Za-z0-9-])(${TERMS.map(escapeRegExp).join("|")})(?![A-Za-z0-9-])`,
  "gi",
);

/** Look up a matched term (any casing) and return its one-line definition. */
export function lookupTerm(term: string): string | undefined {
  return KEY_TO_ENTRY.get(term.toLowerCase())?.def;
}

/** Look up a matched term (any casing, alias or plural) and return its full
 * glossary entry, for the rich click-open popover. */
export function lookupEntry(term: string): GlossaryEntry | undefined {
  return KEY_TO_ENTRY.get(term.toLowerCase());
}

/** Look up an entry by its glossary-page anchor slug. */
export function entryForSlug(slug: string): GlossaryEntry | undefined {
  return SLUG_TO_ENTRY.get(slug);
}

/** The canonical glossary-page anchor link for an entry. */
export function glossaryHref(entry: Pick<GlossaryEntry, "slug">): string {
  return `/guide/glossary#${entry.slug}`;
}
