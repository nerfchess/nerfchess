import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
for (const id of process.argv.slice(2)) { const d = BUFF_BY_ID[id]; console.log(id, "retired="+isRetired(id), d?.tier, d?.kind, "|", d?.description); }
