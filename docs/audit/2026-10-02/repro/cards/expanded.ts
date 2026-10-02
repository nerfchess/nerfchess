import { EXPANDED_NERFS } from "../../../../../src/engine/nerfs/expanded/index";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
const live = PLAYABLE_NERFS.filter((n) => !isRetired(n.id));
const exp = new Set(EXPANDED_NERFS.map((n) => n.id));
console.log("expanded nerfs:", EXPANDED_NERFS.length, "live nerfs:", live.length, "live nerfs NOT in expanded set (no smoke probe in test-nerfs):", live.filter((n) => !exp.has(n.id)).length);
