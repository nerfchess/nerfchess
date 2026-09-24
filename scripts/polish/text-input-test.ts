// ---------------------------------------------------------------------------
// Unit checks for the shared text normaliser (src/lib/textInput.ts), the
// profanity normaliser (src/lib/profanity.ts) and the pure request helpers
// (intParam, memoryRateLimit in src/lib/server/request.ts).
//
//   ./node_modules/.bin/tsx scripts/polish/text-input-test.ts
//   ./node_modules/.bin/tsx scripts/polish/text-input-test.ts --profanity <file>
//
// --profanity swaps in another copy of profanity.ts (for example the one at
// HEAD~ written to a scratch file) so the before state can be shown failing.
// Exit code 1 on any failed check. Regression cover for F052, F053, F054, F077.
// ---------------------------------------------------------------------------

import path from "node:path";
import { cleanText, codePointLength, truncateCodePoints, TEXT_POLICIES } from "../../src/lib/textInput";
import { intParam, memoryRateLimit } from "../../src/lib/server/request";

type Profanity = { containsProfanity(t: string): boolean; findProfanity(t: string): string[]; censorText(t: string): string };

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
  }
}
const eq = (name: string, got: unknown, want: unknown) => check(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

async function main() {
  const argIdx = process.argv.indexOf("--profanity");
  const profPath = argIdx > 0 ? path.resolve(process.argv[argIdx + 1]) : path.resolve(__dirname, "../../src/lib/profanity.ts");
  const prof = (await import(profPath)) as Profanity;
  const onlyProfanity = argIdx > 0;

  // ---- profanity (F054) ----
  check("fullwidth word is caught", prof.containsProfanity("ｆｕｃｋ"));
  check("accented word is caught", prof.containsProfanity("fück"));
  check("cyrillic lookalike is caught", prof.containsProfanity("fuсk")); // U+0441
  check("greek lookalike is caught", prof.findProfanity("shιt happens").length > 0);
  check("circled letters are caught", prof.containsProfanity("ⓕⓤⓒⓚ"));
  check("zero-width inside a word is caught", prof.findProfanity("fu\u200bck off").length > 0);
  check("censor keeps token length", prof.censorText("ｆｕｃｋ you") === "**** you", prof.censorText("ｆｕｃｋ you"));
  check("clean word passes", !prof.containsProfanity("GrandmasterFlash"));
  check("assist is not flagged in chat", prof.findProfanity("nice assist, class move").length === 0);
  check("cyrillic prose passes", prof.findProfanity("привет друг").length === 0);
  // A wholly Cyrillic or Greek word is a real word in that script, not a
  // disguise: "соска" (Russian) folds letter by letter to "cocka" and was
  // censored. Mixing scripts, or Cyrillic with ASCII, is still caught.
  check("russian word that folds to a listed word passes", prof.findProfanity("соска").length === 0, prof.findProfanity("соска"));
  check("russian prose is not censored", prof.censorText("соска и кот") === "соска и кот", prof.censorText("соска и кот"));
  check("cyrillic mixed with latin is caught", prof.findProfanity("сосk off").length > 0);
  check("cyrillic mixed with a digit is caught", prof.containsProfanity("sh1т"));
  if (onlyProfanity) return;

  // ---- textInput (F052, F053) ----
  const one = { maxChars: 60 };
  const multi = { maxChars: 1000, multiline: true };
  eq("zero-width only is empty", cleanText("\u200b\u200c\u200d\ufeff\u2060", one), "");
  eq("hangul filler only is empty", cleanText("\u3164\u3164\u3164", one), "");
  eq("braille blank only is empty", cleanText("\u2800 \u2800", one), "");
  eq("zero width between latin letters is removed", cleanText("f\u200bu\u200dck", one), "fuck");
  eq("bidi override removed", cleanText("abc\u202eevil\u202c", one), "abcevil");
  eq("bidi isolates removed", cleanText("\u2066x\u2069\u200f", one), "x");
  eq("rtl text kept", cleanText("שלום עולם", one), "שלום עולם");
  eq("arabic kept", cleanText("مرحبا بالعالم", one), "مرحبا بالعالم");
  eq("persian zwnj kept", cleanText("می\u200cخواهم", one), "می\u200cخواهم");
  eq("devanagari zwj kept", cleanText("क\u094d\u200dष", one), "क\u094d\u200dष");
  eq("emoji family zwj kept", cleanText("👨\u200d👩\u200d👧", one), "👨\u200d👩\u200d👧");
  eq("skin tone profession zwj kept", cleanText("👩🏽\u200d💻", one), "👩🏽\u200d💻");
  eq("heart on fire zwj kept", cleanText("❤\ufe0f\u200d🔥", one), "❤\ufe0f\u200d🔥");
  eq("england flag tags kept", cleanText("🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", one), "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}");
  eq("stray tags removed", cleanText("a\u{E0067}b", one), "ab");
  eq("NFC", cleanText("e\u0301", one), "\u00e9");
  eq("control chars removed", cleanText("a\u0000b\u0007c\u001b[31m", one), "abc[31m");
  eq("tabs and newlines become spaces in single line", cleanText("a\tb\nc\r\nd", one), "a b c d");
  eq("newlines kept in multiline", cleanText("a\r\nb\u2028c", multi), "a\nb\nc");
  eq("blank line runs collapse", cleanText("a\n\n\n\n\nb", multi), "a\n\nb");
  eq("blank line cap configurable", cleanText("a\n\n\n\n\nb", { ...multi, maxBlankLines: 2 }), "a\n\n\nb");
  eq("space runs collapse", cleanText("  a    b  ", one), "a b");
  eq("exotic spaces normalised", cleanText("a\u00a0\u3000\u2003b", one), "a b");
  eq("zalgo capped at 4 marks after NFC", cleanText("a\u0300\u0301\u0302\u0303\u0304\u0305\u0306b", one), "a\u0300\u0301\u0302\u0303\u0304b".normalize("NFC"));
  eq("orphan marks dropped", cleanText("\u0301\u0301x", one), "x");
  eq("combining grapheme joiner dropped", cleanText("a\u034fb", one), "ab");
  eq("html kept literally", cleanText("<script>alert(1)</script>", one), "<script>alert(1)</script>");
  eq("non-string is empty", cleanText(42, one), "");
  eq("null is empty", cleanText(null, one), "");
  const tenK = "x".repeat(10_000);
  eq("10k chars capped to policy", codePointLength(cleanText(tenK, TEXT_POLICIES.directMessage)), 1000);
  const emojis = "😀".repeat(1500);
  const capped = cleanText(emojis, TEXT_POLICIES.directMessage);
  eq("emoji cap counts code points", codePointLength(capped), 1000);
  check("emoji cap never leaves a lone surrogate", !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(capped));
  eq("truncate keeps graphemes whole", truncateCodePoints("ab👨\u200d👩\u200d👧", 4), "ab");
  eq("truncate splits no surrogate", truncateCodePoints("😀😀😀", 2), "😀😀");
  const huge = "\u200b".repeat(200_000) + "hi";
  const t0 = Date.now();
  eq("huge invisible input is bounded", cleanText(huge, one), "");
  check("huge input is fast", Date.now() - t0 < 500, Date.now() - t0);

  // ---- request helpers (F077) ----
  eq("intParam missing uses fallback", intParam(null, 1, 50, 30), 30);
  eq("intParam empty uses fallback", intParam("", 1, 50, 30), 30);
  eq("intParam junk uses fallback", intParam("abc", 1, 50, 30), 30);
  eq("intParam clamps high", intParam("999", 1, 50, 30), 50);
  eq("intParam clamps low", intParam("0", 1, 50, 30), 1);
  eq("intParam floors", intParam("7.9", 1, 50, 30), 7);
  const now = 1_000_000;
  const results = Array.from({ length: 5 }, () => memoryRateLimit("test:k", 3, 1000, now));
  eq("memory limiter allows max then blocks", results, [true, true, true, false, false]);
  eq("memory limiter window resets", memoryRateLimit("test:k", 3, 1000, now + 1001), true);
}

main()
  .then(() => {
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
