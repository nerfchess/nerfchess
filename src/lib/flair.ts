// Curated emoji a player can pick as their profile flair, shown next to the
// username (Lichess-style). Kept as an allowlist so the server can validate
// exactly what may be stored.

export const FLAIR_EMOJI: string[] = [
  // Chess and gaming
  "♟️", "♞", "♜", "♛", "♚", "🏆", "🎯", "🎲", "🎮", "⚔️", "🛡️", "👑",
  // Animals
  "🐴", "🦉", "🦊", "🐺", "🦅", "🐢", "🐙", "🦈", "🐝", "🦁", "🐸", "🐼",
  // Nature
  "🌲", "🌊", "🔥", "⚡", "🌙", "⭐", "🌈", "🍀", "🌹", "🍄",
  // Objects
  "🚀", "⚓", "🔭", "🗝️", "📚", "🎩", "💎", "🕰️",
  // Faces
  "😎", "🤠", "🤓", "😈", "🤖", "👻",
];

export function isFlairEmoji(value: unknown): value is string {
  return typeof value === "string" && FLAIR_EMOJI.includes(value);
}

// --- Top-10 reward flair -----------------------------------------------------
//
// "Laurelled": the one flair that cannot simply be picked. The set-flair route
// only accepts it while the account currently holds a top-10 spot on a
// leaderboard (see lib/server/topTen.ts), so wearing the rosette is itself
// proof of standing. It is deliberately NOT in FLAIR_EMOJI: isFlairEmoji stays
// the strict "anyone may pick this" allowlist, while isAllowedFlair is the
// "may this stored value render" check used by display surfaces.

export const LAUREL_FLAIR = "🏵️";

/** How deep the honors run: the top N of each leaderboard wear the laurel. */
export const LAUREL_TOP_N = 10;

export function isAllowedFlair(value: unknown): value is string {
  return isFlairEmoji(value) || value === LAUREL_FLAIR;
}
