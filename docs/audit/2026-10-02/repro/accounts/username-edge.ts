// Audit scratch: feed hostile / edge-case usernames through the REAL validators
// the register, rename, guest and Google routes use. isReservedUsername itself
// reads ADMIN_USERNAMES through getCloudflareContext, so the static list is
// checked directly (RESERVED_USERNAMES) plus the power names.
import { validUsername, RESERVED_USERNAMES } from "../../../../../src/lib/server/auth";
import { containsProfanity, findProfanity, censorText } from "../../../../../src/lib/profanity";
import { claimsPowerUsername, POWER_USERNAMES } from "../../../../../src/lib/godPanel";
import { cleanText, TEXT_POLICIES } from "../../../../../src/lib/textInput";
import { randomGuestName, randomGuestNameNumbered } from "../../../../../src/lib/guestNames";

const isReservedStatic = (n: string) => RESERVED_USERNAMES.includes(n.trim().toLowerCase());

// What register/route.ts does, in order (minus the DB uniqueness check).
function registerVerdict(raw: string): string {
  const username = raw.trim();
  if (!validUsername(username)) return "rejected:format";
  if (isReservedStatic(username)) return "rejected:reserved";
  if (containsProfanity(username)) return "rejected:profanity";
  if (claimsPowerUsername(username)) return "rejected:power";
  return "ACCEPTED";
}

const show = (s: string) => JSON.stringify(s).replace(/[\u0080-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

const cases: Array<[string, string]> = [
  ["plain", "Magnus_99"],
  ["min length 3", "abc"],
  ["too short", "ab"],
  ["max 20", "a".repeat(20)],
  ["21 chars", "a".repeat(21)],
  ["10k chars", "a".repeat(10000)],
  ["leading/trailing space (trimmed)", "  alice  "],
  ["inner space", "al ice"],
  ["cyrillic a homoglyph", "аdmin"],
  ["fullwidth", "ａｄｍｉｎ"],
  ["zero-width space", "ad​min"],
  ["zero-width joiner", "ad‍min"],
  ["RTL override", "‮admin"],
  ["emoji", "chess♟"],
  ["emoji 2", "kingðŸ‘‘".normalize()],
  ["combining acute", "josé"],
  ["zalgo", "z̶̷̸a̶lgo"],
  ["NUL byte", "abc\u0000def"],
  ["newline", "abc\ndef"],
  ["accented letter", "José"],
  ["dotless i", "ılovenewjeans"],
  ["reserved admin", "Admin"],
  ["reserved admin variant admin1", "admin1"],
  ["reserved admin variant admin_", "admin_"],
  ["staff impersonation", "NerfChess_Staff"],
  ["nerfchess official", "nerfchessofficial"],
  ["moderator variant", "Moderator_"],
  ["mod team", "ModTeam"],
  ["system", "system"],
  ["support", "support"],
  ["guest", "guest"],
  ["null", "null"],
  ["undefined", "undefined"],
  ["anonymous", "Anonymous"],
  ["anonymous variant", "Anonymous1"],
  ["power name exact", "ilovenewjeans"],
  ["power name capital I for l", "iIovenewjeans"],
  ["power name digit 1 for l", "i1ovenewjeans"],
  ["power name trailing underscore", "ilovenewjeans_"],
  ["leet profanity", "fUcK3r"],
  ["leet profanity 2", "sh1thead"],
  ["underscored profanity", "f_u_c_k"],
  ["digits fold", "c0ck"],
  // Scunthorpe-class false positives (real names / words):
  ["FP Scunthorpe", "Scunthorpe"],
  ["FP Hancock", "Hancock"],
  ["FP Peacock", "Peacock"],
  ["FP Hitchcock", "Hitchcock"],
  ["FP cocktail", "cocktail"],
  ["FP Spicer", "Spicer"],
  ["FP spicy", "spicy_king"],
  ["FP hospice", "hospice"],
  ["FP Nazir", "Nazir"],
  ["FP Nazira", "Nazira"],
  ["FP Slutsky", "Slutsky"],
  ["FP therapist", "therapist"],
  ["FP pussycat", "pussycat"],
  ["FP Dickens (ok)", "Dickens"],
  ["FP Shitake", "Shitake"],
  ["FP Matsushita", "Matsushita"],
  ["FP Woodcock", "Woodcock"],
  ["FP Babcock", "Babcock"],
  ["FP Glasscock", "Glasscock"],
  ["FP pricks digits", "Spr1ckle"],
  ["FP Kikeri", "Kikeriki"],
  ["FP nigeria (ok?)", "nigerian_gm"],
  ["FP retardant", "retardant"],
  ["FP 1nazi digits", "Ana2i"],
  ["FP Sp1ce", "Sp1ce"],
  ["FP 5pice", "5picy"],
  ["FP AssistantBot (ok)", "Assistant"],
  ["FP bastardo", "Bastardi"],
];

console.log("== registration verdicts (validUsername -> reserved(static) -> profanity -> power) ==");
let accepted = 0;
const fps: string[] = [];
for (const [label, name] of cases) {
  const v = registerVerdict(name);
  if (v === "ACCEPTED") accepted++;
  if (label.startsWith("FP") && v === "rejected:profanity") fps.push(`${name} (${findProfanity(name).join(",") || "substring"})`);
  console.log(`${v.padEnd(20)} ${label.padEnd(36)} ${show(name.length > 40 ? name.slice(0, 20) + "...(" + name.length + ")" : name)}`);
}
console.log(`\naccepted ${accepted}/${cases.length}`);
console.log(`Scunthorpe false positives (real names rejected as profane): ${fps.length}\n  ${fps.join("\n  ")}`);

// Every guest name combination through the profanity filter + format.
console.log("\n== guest name space ==");
const seen = new Set<string>();
let r = 0;
const det = () => {
  // walk deterministically through every adjective x noun pair
  return ((r++ % 100000) + 0.5) / 100000;
};
for (let i = 0; i < 200000; i++) seen.add(randomGuestName(det));
let bad = 0;
let badFmt = 0;
for (const n of seen) {
  if (containsProfanity(n)) {
    bad++;
    console.log("  profane guest name:", n);
  }
  if (!validUsername(n)) badFmt++;
}
console.log(`distinct guest names generated: ${seen.size}; profane: ${bad}; format-invalid: ${badFmt}`);
let numberedBad = 0;
for (let i = 0; i < 5000; i++) {
  const n = randomGuestNameNumbered();
  if (!validUsername(n)) numberedBad++;
}
console.log(`numbered guest names format-invalid in 5000 draws: ${numberedBad}`);

// Free-text normaliser on the same hostile inputs (club names use this).
console.log("\n== cleanText(clubName) ==");
for (const [label, s] of [
  ["zero-width only", "​​​"],
  ["RTL override", "‮evil"],
  ["zalgo", "z̶̷̸̹̺̻a"],
  ["hangul filler", "ㅤㅤ"],
  ["emoji family", "👨‍👩‍👧"],
  ["cyrillic admin", "аdmin"],
] as Array<[string, string]>) {
  console.log(`${label.padEnd(18)} in ${show(s)} -> out ${show(cleanText(s, TEXT_POLICIES.clubName))}`);
}

console.log("\nchat censor sample:", censorText("you are a f u c k ing c0ck, nice hospice"));
console.log("power names:", POWER_USERNAMES.join(","));
console.log("static reserved:", RESERVED_USERNAMES.join(","));
