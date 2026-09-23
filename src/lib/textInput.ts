// One normaliser for every piece of free text a player can type into the
// site: DMs, club posts, club and tournament names, report descriptions,
// suggestions. It runs on the server before anything is stored, and is pure
// (no DOM, no Node APIs) so the Durable Object and the client can share it.
//
// What it guarantees, in order:
//
//   1. NFC, so the same visible text is always the same stored string.
//   2. No control characters (tabs become spaces; newlines survive only in
//      multi-line fields; CR, CRLF, U+2028 and U+2029 become \n).
//   3. No invisible format characters (\p{Cf}): zero-width spaces, BOMs, soft
//      hyphens, word joiners, and every bidi embedding, override and isolate
//      (so nobody can post a blank message, a "3 character" invisible club
//      name, or flip the rest of a page right to left). Two exceptions keep
//      real writing intact: ZWJ inside emoji sequences (family, profession and
//      skin-tone emoji) and ZWJ/ZWNJ between letters of scripts that need them
//      (Persian, Arabic, the Indic scripts), plus the tag characters of
//      subdivision flags.
//   4. Blank lookalikes (Hangul fillers, the braille blank) and exotic spaces
//      read as a plain space; runs of spaces collapse; the ends are trimmed.
//   5. At most four combining marks per base character (no "Zalgo" towers
//      that paint over neighbouring rows) and no orphan marks.
//   6. A length cap counted in code points and cut on a grapheme boundary,
//      so an emoji or a surrogate pair is never split in half.
//
// HTML is NOT stripped: React renders every one of these fields as text, so
// "<script>" is shown literally, which is what the player typed.

export type TextPolicy = {
  /** Maximum length in code points after normalisation. */
  maxChars: number;
  /** Keep line breaks (DMs, posts, descriptions). Default false. */
  multiline?: boolean;
  /** Most consecutive blank lines kept in multi-line text. Default 1. */
  maxBlankLines?: number;
};

const ZWNJ = 0x200c;
const ZWJ = 0x200d;
const VS16 = 0xfe0f;
const BLACK_FLAG = 0x1f3f4;
const MAX_MARKS_PER_BASE = 4;

const RE_PICTO = /\p{Extended_Pictographic}/u;
const RE_EMOJI_MOD = /\p{Emoji_Modifier}/u;
const RE_LETTER_OR_MARK = /[\p{L}\p{M}]/u;
// Scripts whose writing never needs a joiner: an invisible joiner between two
// of their letters is only ever a way to dodge a filter or fake a name.
const RE_JOINERLESS_SCRIPT = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Common}]/u;
const RE_FORMAT = /\p{Cf}/u;
const RE_CONTROL = /\p{Cc}/u;
const RE_MARK = /\p{M}/u;
const RE_SPACE_SEP = /\p{Zs}/u;

// Visible-width-zero characters that are not \p{Cf}: Hangul fillers, the
// braille blank, and the combining grapheme joiner.
const BLANK_LOOKALIKES = new Set([0x115f, 0x1160, 0x3164, 0xffa0, 0x2800]);
const INVISIBLE_MARKS = new Set([0x034f]);

function isTag(cp: number): boolean {
  return cp >= 0xe0020 && cp <= 0xe007f;
}

function keepJoiner(cp: number, prev: string | undefined, next: string | undefined): boolean {
  if (!prev || !next) return false;
  if (cp === ZWJ) {
    const prevCp = prev.codePointAt(0)!;
    const afterEmoji = RE_PICTO.test(prev) || prevCp === VS16 || RE_EMOJI_MOD.test(prev);
    if (afterEmoji && RE_PICTO.test(next)) return true;
  }
  // Script joiners: both neighbours are letters (or marks) of a script that
  // actually shapes with them.
  return (
    RE_LETTER_OR_MARK.test(prev) &&
    RE_LETTER_OR_MARK.test(next) &&
    !RE_JOINERLESS_SCRIPT.test(prev) &&
    !RE_JOINERLESS_SCRIPT.test(next)
  );
}

/** Drop invisible and control characters and normalise spaces (steps 2 to 5). */
function scrub(input: string, multiline: boolean): string {
  const chars = Array.from(input);
  const out: string[] = [];
  // -1 = no base yet, so leading marks are orphans and dropped.
  let marksOnBase = -1;
  let inFlagTags = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cp = ch.codePointAt(0)!;
    const prevKept = out[out.length - 1];

    if (ch === "\n") {
      out.push(multiline ? "\n" : " ");
      marksOnBase = -1;
      inFlagTags = false;
      continue;
    }
    if (ch === "\t") {
      out.push(" ");
      marksOnBase = -1;
      continue;
    }
    if (RE_CONTROL.test(ch)) continue;

    if (RE_FORMAT.test(ch)) {
      if (isTag(cp)) {
        // Subdivision flags: U+1F3F4 followed by tag letters and a cancel tag.
        if (prevKept && (prevKept.codePointAt(0) === BLACK_FLAG || inFlagTags)) {
          out.push(ch);
          inFlagTags = cp !== 0xe007f;
        }
        continue;
      }
      if ((cp === ZWJ || cp === ZWNJ) && keepJoiner(cp, prevKept, chars[i + 1])) {
        out.push(ch);
      }
      continue;
    }
    inFlagTags = false;

    if (BLANK_LOOKALIKES.has(cp) || (RE_SPACE_SEP.test(ch) && ch !== " ")) {
      out.push(" ");
      marksOnBase = -1;
      continue;
    }
    if (ch === " ") {
      out.push(" ");
      marksOnBase = -1;
      continue;
    }
    if (INVISIBLE_MARKS.has(cp)) continue;

    if (RE_MARK.test(ch)) {
      // Variation selectors and marks attach to the previous base; a mark
      // with no base (start of text, after a space) is dropped.
      if (marksOnBase < 0) continue;
      if (marksOnBase >= MAX_MARKS_PER_BASE) continue;
      marksOnBase++;
      out.push(ch);
      continue;
    }
    marksOnBase = 0;
    out.push(ch);
  }
  return out.join("");
}

function tidyWhitespace(text: string, multiline: boolean, maxBlankLines: number): string {
  if (!multiline) return text.replace(/ {2,}/g, " ").trim();
  const lines = text.split("\n").map((line) => line.replace(/ {2,}/g, " ").trim());
  const kept: string[] = [];
  let blanks = 0;
  for (const line of lines) {
    if (line === "") {
      blanks++;
      if (blanks > maxBlankLines) continue;
    } else {
      blanks = 0;
    }
    kept.push(line);
  }
  return kept.join("\n").trim();
}

type SegmenterLike = { segment(input: string): Iterable<{ segment: string }> };
let segmenter: SegmenterLike | null | undefined;
function graphemeSegmenter(): SegmenterLike | null {
  if (segmenter === undefined) {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => SegmenterLike }).Segmenter;
    segmenter = Seg ? new Seg(undefined, { granularity: "grapheme" }) : null;
  }
  return segmenter;
}

/** Number of code points (what every length cap in this module counts). */
export function codePointLength(text: string): number {
  let n = 0;
  for (const _ of text) n++;
  return n;
}

/**
 * Cut `text` to at most `maxChars` code points without splitting a grapheme
 * (an emoji sequence or a letter with its marks is kept whole or dropped
 * whole). Never splits a surrogate pair even without Intl.Segmenter.
 */
export function truncateCodePoints(text: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (codePointLength(text) <= maxChars) return text;
  const seg = graphemeSegmenter();
  let out = "";
  let used = 0;
  if (seg) {
    for (const { segment } of seg.segment(text)) {
      const len = codePointLength(segment);
      if (used + len > maxChars) break;
      out += segment;
      used += len;
    }
    return out;
  }
  for (const ch of text) {
    if (used + 1 > maxChars) break;
    out += ch;
    used++;
  }
  return out;
}

/**
 * Normalise one field. Non-strings become "". The result may be empty (all
 * whitespace or invisible input), which callers treat as "nothing written".
 */
export function cleanText(input: unknown, policy: TextPolicy): string {
  if (typeof input !== "string" || input === "") return "";
  const multiline = policy.multiline ?? false;
  // Bound the work on hostile input before the per-character passes: nothing
  // beyond a generous multiple of the cap can survive them anyway.
  const budget = policy.maxChars * 8 + 64;
  let text = input.length > budget ? input.slice(0, budget) : input;
  // A cut there may have split a surrogate pair; drop a trailing lone half.
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1);
  text = text.normalize("NFC").replace(/\r\n?|[\u2028\u2029]/g, "\n");
  text = scrub(text, multiline);
  text = tidyWhitespace(text, multiline, policy.maxBlankLines ?? 1);
  text = truncateCodePoints(text, policy.maxChars);
  // Truncation can leave a trailing space or newline.
  return multiline ? text.replace(/\s+$/u, "") : text.trim();
}

/** Field policies shared by the routes (lengths match the existing caps). */
export const TEXT_POLICIES = {
  directMessage: { maxChars: 1000, multiline: true, maxBlankLines: 2 },
  clubPost: { maxChars: 500, multiline: true, maxBlankLines: 2 },
  clubName: { maxChars: 60 },
  clubDescription: { maxChars: 240 },
  tournamentName: { maxChars: 70 },
  tournamentDescription: { maxChars: 280 },
  reportDescription: { maxChars: 1000, multiline: true, maxBlankLines: 2 },
  suggestionName: { maxChars: 80 },
  suggestionDescription: { maxChars: 1000, multiline: true, maxBlankLines: 2 },
  suggestionContact: { maxChars: 120 },
} as const satisfies Record<string, TextPolicy>;
