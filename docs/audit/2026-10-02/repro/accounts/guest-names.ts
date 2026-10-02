import { randomGuestName } from "../../../../../src/lib/guestNames";
import { containsProfanity, findProfanity, censorText } from "../../../../../src/lib/profanity";
import { validUsername } from "../../../../../src/lib/server/auth";
const all = new Set<string>();
for (let a = 0; a < 60; a++) for (let n = 0; n < 60; n++) {
  const seq = [(a + 0.5) / 60, (n + 0.5) / 60];
  let k = 0;
  all.add(randomGuestName(() => seq[k++]));
}
let bad = 0;
for (const n of all) if (containsProfanity(n) || !validUsername(n)) { bad++; console.log("bad guest name", n); }
console.log("guest names enumerated", all.size, "bad", bad);
const chat = ["I had a cocktail", "my therapist says hi", "spicy opening", "Scunthorpe United", "Hancock gambit", "Nazir is strong", "this is shitake", "assassin move", "class act"];
for (const c of chat) console.log(JSON.stringify(c), "->", JSON.stringify(censorText(c)), "flags:", findProfanity(c).join(",") || "-");
