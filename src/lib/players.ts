// The player directory backing the leaderboard and the Players page: the
// seeded ladder plus the reference bots. Swap for a server-side directory when
// accounts land.

export interface DirectoryPlayer {
  name: string;
  rating: number;
  games: number;
  tag?: "you" | "bot";
}

export const SEED_PLAYERS: DirectoryPlayer[] = [
  { name: "en_prise_enjoyer", rating: 2418, games: 1204 },
  { name: "FogWalker", rating: 2291, games: 863 },
  { name: "queenless_wonder", rating: 2183, games: 651 },
  { name: "Hard Bot", rating: 1900, games: 9999, tag: "bot" },
  { name: "castle_through_check", rating: 1846, games: 412 },
  { name: "h_file_hermit", rating: 1712, games: 289 },
  { name: "Medium Bot", rating: 1500, games: 9999, tag: "bot" },
  { name: "pawn_stormer", rating: 1433, games: 176 },
  { name: "blunderful", rating: 1264, games: 98 },
  { name: "Easy Bot", rating: 1100, games: 9999, tag: "bot" },
  { name: "still_learning", rating: 1015, games: 41 },
];

export const BOT_DIFFICULTY: Record<string, "easy" | "medium" | "hard"> = {
  "Easy Bot": "easy",
  "Medium Bot": "medium",
  "Hard Bot": "hard",
};
