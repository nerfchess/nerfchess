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

function cryptoRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer");
  }
  const maxUint32 = 2 ** 32;
  const limit = Math.floor(maxUint32 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % maxExclusive;
}

export function randomGuestName(rand: () => number = cryptoRand): string {
  const adjective =
    rand === cryptoRand
      ? ADJECTIVES[cryptoRandomInt(ADJECTIVES.length)]
      : ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const noun =
    rand === cryptoRand
      ? NOUNS[cryptoRandomInt(NOUNS.length)]
      : NOUNS[Math.floor(rand() * NOUNS.length)];
  return `${adjective}${noun}`;
}

/** Fallback when the plain two-word combos collide: tack on two digits. */
export function randomGuestNameNumbered(rand: () => number = cryptoRand): string {
  const suffix = rand === cryptoRand ? 10 + cryptoRandomInt(90) : Math.floor(rand() * 90 + 10);
  return `${randomGuestName(rand)}${suffix}`.slice(0, 20);
}
