import { censorText, findProfanity, containsProfanity } from "../../../../../src/lib/profanity.ts";
for (const s of ["I love a cocktail", "my therapist said hi", "Alfred Hitchcock film", "classy assist", "spicy food in Scunthorpe"]) {
  console.log(JSON.stringify(s), "->", JSON.stringify(censorText(s)), findProfanity(s));
}
for (const u of ["Hancock", "Peacock", "Dickens", "Nazir", "therapist"]) console.log(u, containsProfanity(u));
