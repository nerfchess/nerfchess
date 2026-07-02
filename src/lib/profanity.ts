// Basic profanity screening, shared by username registration (reject), the
// in-game chat relay (censor + flag), and any future report surfaces. This is
// a lightweight first pass, not a complete moderation system: it normalizes
// common letter substitutions and checks against a compact word list.
//
// Environment-agnostic on purpose (no Node/DOM APIs): it runs in Workers, the
// Durable Object, Next API routes, and the browser.

const WORDS: string[] = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "arsehole",
  "dickhead",
  "pussy",
  "cock",
  "wanker",
  "twat",
  "prick",
  "whore",
  "slut",
  "bastard",
  "douche",
  "jackass",
  "dumbass",
  "bullshit",
  "motherfucker",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kike",
  "spic",
  "chink",
  "tranny",
  "rapist",
  "hitler",
  "nazi",
];

// Substitutions people use to sneak words past filters (l33t etc.).
const SUBS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "+": "t",
  "*": "",
};

/** Lowercase and undo common letter substitutions; keep only letters. */
function normalize(text: string): string {
  let out = "";
  for (const ch of text.toLowerCase()) {
    const mapped = ch in SUBS ? SUBS[ch] : ch;
    if (mapped >= "a" && mapped <= "z") out += mapped;
  }
  return out;
}

/** True when the text contains a listed word anywhere in it, even embedded
 *  ("xXfuckXx"). Suited to compact strings like usernames. */
export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return WORDS.some((word) => normalized.includes(word));
}

/** The listed words found as whole words in running text (for chat).
 *  Word-level so "class" or "assist" never flag. */
export function findProfanity(text: string): string[] {
  const found = new Set<string>();
  for (const token of text.split(/[\s.,;:!?'"()\[\]{}\-_/\\]+/)) {
    const normalized = normalize(token);
    if (!normalized) continue;
    for (const word of WORDS) {
      if (normalized === word || normalized.includes(word)) found.add(word);
    }
  }
  return [...found];
}

/** Replace each profane token in running text with asterisks, keeping
 *  everything else (including punctuation and spacing) as typed. */
export function censorText(text: string): string {
  return text.replace(/[^\s.,;:!?'"()\[\]{}/\\]+/g, (token) => {
    const normalized = normalize(token);
    if (normalized && WORDS.some((word) => normalized.includes(word))) {
      return "*".repeat(token.length);
    }
    return token;
  });
}
