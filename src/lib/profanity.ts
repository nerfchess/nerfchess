// Basic profanity screening, shared by username registration (reject), the
// in-game chat relay (censor + flag), and any future report surfaces. This is
// a lightweight first pass, not a complete moderation system: it folds
// fullwidth and accented forms (NFKD), maps a small set of lookalike letters,
// undoes common letter substitutions and checks against a compact word list.
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

// Letters from other scripts that render the same as a Latin letter, so
// "fuсk" with a Cyrillic "с" reads as the word it looks like. Deliberately
// small: only lowercase shapes that are near-identical in common fonts.
// Accented forms (ё, ї) need no entry: NFKD splits them into the base
// letter and a mark, and the mark is stripped.
//
// These apply only when the same text also carries ASCII letters, digits
// or substitution symbols. A disguise mixes scripts ("fuсk", "sh1т"); a
// word written wholly in Cyrillic or Greek is a real word in that language
// (Russian "соска" would otherwise fold to "cocka" and be censored).
const SCRIPT_LOOKALIKES: Record<string, string> = {
  // Cyrillic
  "а": "a", "в": "b", "е": "e", "к": "k", "м": "m", "н": "h", "о": "o",
  "р": "p", "с": "c", "т": "t", "у": "y", "х": "x", "ѕ": "s", "і": "i",
  "ј": "j", "ԁ": "d", "ԛ": "q", "ԝ": "w", "һ": "h",
  // Greek
  "α": "a", "β": "b", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p",
  "τ": "t", "υ": "u", "χ": "x",
};

// Latin letters that NFKD does not fold. Always mapped.
const LATIN_LOOKALIKES: Record<string, string> = {
  "ı": "i", "ł": "l", "ø": "o", "đ": "d", "ħ": "h", "ɡ": "g",
};

/** Fold compatibility forms (fullwidth, circled, math letters) and accents,
 *  lowercase, map lookalike letters, undo common substitutions, and keep
 *  only a to z. */
function normalize(text: string): string {
  const folded = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  let mixed = false;
  for (const raw of folded) {
    if ((raw >= "a" && raw <= "z") || raw in SUBS || raw in LATIN_LOOKALIKES) {
      mixed = true;
      break;
    }
  }
  let out = "";
  for (const raw of folded) {
    const ch =
      raw in LATIN_LOOKALIKES ? LATIN_LOOKALIKES[raw] : mixed && raw in SCRIPT_LOOKALIKES ? SCRIPT_LOOKALIKES[raw] : raw;
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
