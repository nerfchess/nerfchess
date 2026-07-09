// Random two-word guest usernames, assembled from a chess-and-critters word
// list. Kept within validUsername's charset and length (3-20 chars).

const ADJECTIVES = [
  "Sneaky", "Sleepy", "Feisty", "Gallant", "Rusty", "Cunning", "Dashing",
  "Grumpy", "Mellow", "Nimble", "Plucky", "Quirky", "Rowdy", "Swift",
  "Zesty", "Bold", "Clever", "Daring", "Eager", "Frisky", "Jolly",
  "Crafty", "Dizzy", "Fuzzy", "Gentle", "Hasty", "Iron", "Loyal",
  "Merry", "Noble", "Odd", "Proud", "Quiet", "Rapid", "Shady",
  "Tricky", "Wily", "Witty", "Brave", "Calm", "Fierce", "Humble",
] as const;

const NOUNS = [
  "Pawn", "Rook", "Knight", "Bishop", "Gambit", "Fork", "Skewer",
  "Castle", "Tempo", "Blunder", "Patzer", "Kibitzer", "Squire",
  "Jester", "Herald", "Baron", "Falcon", "Badger", "Otter", "Raven",
  "Fox", "Lynx", "Mole", "Hedgehog", "Weasel", "Magpie", "Heron",
  "Stoat", "Marmot", "Gopher", "Ferret", "Osprey", "Puffin", "Walrus",
  "Wombat", "Gecko", "Mongoose", "Pangolin", "Ocelot", "Tapir",
] as const;

// Guest names are public, but they're minted on auth routes, so the default
// randomness source is the CSPRNG (works in Workers, Node, and browsers).
export function cryptoRand(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function randomGuestName(rand: () => number = cryptoRand): string {
  const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${adjective}${noun}`;
}

/** Fallback when the plain two-word combos collide: tack on two digits. */
export function randomGuestNameNumbered(rand: () => number = cryptoRand): string {
  return `${randomGuestName(rand)}${Math.floor(rand() * 90 + 10)}`.slice(0, 20);
}
