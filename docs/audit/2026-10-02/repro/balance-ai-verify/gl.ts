import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
const d: any = BUFF_BY_ID["ghost_legion"];
console.log(d.kind, d.tier, Object.keys(d));
console.log(String(d.augmentMoves).slice(0, 1500));
console.log(String(d.onMovePlayed).slice(0, 1500));
