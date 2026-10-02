import fs from "node:fs";
import { CARD_GLYPH_CATEGORY, CURATED_ICON_IDS, GLYPH_CATEGORIES } from "../../../../../src/lib/cardGlyphMap.gen";
import { CARD_ICON_NAMES } from "../../../../../src/lib/cardIconNames.gen";
const live = JSON.parse(fs.readFileSync(__dirname + "/live-ids.json", "utf8"));
const all: string[] = [...live.nerfs, ...live.buffs];
const noGlyph = all.filter((id) => !Object.hasOwn(CARD_GLYPH_CATEGORY, id));
const noIcon = all.filter((id) => !Object.hasOwn(CARD_ICON_NAMES, id));
console.log("live cards:", all.length, "| curated faces:", all.filter((id) => CURATED_ICON_IDS.has(id)).length, "| category-glyph faces:", all.filter((id) => !CURATED_ICON_IDS.has(id) && Object.hasOwn(CARD_GLYPH_CATEGORY, id)).length);
console.log("missing glyph category:", noGlyph.length, noGlyph.slice(0, 10).join(","), "| missing icon name:", noIcon.length);
const perCat: Record<string, number> = {};
for (const id of all) if (!CURATED_ICON_IDS.has(id) && Object.hasOwn(CARD_GLYPH_CATEGORY, id)) { const c = GLYPH_CATEGORIES[CARD_GLYPH_CATEGORY[id]]; perCat[c] = (perCat[c] ?? 0) + 1; }
const top = Object.entries(perCat).sort((a, b) => b[1] - a[1]);
console.log("glyph categories used:", top.length, "largest:", top.slice(0, 6).map(([c, n]) => `${c}=${n}`).join(", "));
const variants = Object.values(CARD_ICON_NAMES).filter((v) => v.includes("#")).length;
console.log("icon names with overflow variant (#n):", variants, "of", Object.keys(CARD_ICON_NAMES).length);
