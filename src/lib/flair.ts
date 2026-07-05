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
