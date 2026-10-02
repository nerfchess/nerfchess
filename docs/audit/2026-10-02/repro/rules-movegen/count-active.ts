import { isRetired } from "../../../../../src/engine/retired";
import fs from "node:fs";
const ids = fs.readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
console.log(`flagged ${ids.length}, not retired ${ids.filter((i) => !isRetired(i)).length}`);
