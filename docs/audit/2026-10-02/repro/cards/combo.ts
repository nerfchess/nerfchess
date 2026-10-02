import fs from "node:fs";
import { CARD_GLYPH_CATEGORY, GLYPH_CATEGORIES } from "../../../../../src/lib/cardGlyphMap.gen";
import { COMBO_TAGS } from "../../../../../src/engine/comboTags";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
const live = JSON.parse(fs.readFileSync(__dirname + "/live-ids.json", "utf8")).buffs as string[];
for (const cat of ["mass-freeze", "turn-skip-enemy", "draft-denial"]) {
  const ids = live.filter((id) => GLYPH_CATEGORIES[CARD_GLYPH_CATEGORY[id]] === cat);
  const tagged = ids.filter((id) => COMBO_TAGS[id]);
  console.log(`${cat}: ${ids.length} live cards in glyph category, ${tagged.length} carry a combo tag; untagged e.g. ${ids.filter((id) => !COMBO_TAGS[id]).slice(0, 8).join(", ")}`);
}
console.log("combo-tagged ids:", Object.keys(COMBO_TAGS).length, "live:", Object.keys(COMBO_TAGS).filter((id) => live.includes(id)).length);
