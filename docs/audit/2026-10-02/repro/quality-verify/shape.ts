import { newGame, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
const g: any = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
console.log(Object.keys(g)); console.log(Object.keys(g.board ?? {}));
console.log("pieces?", Array.isArray(g.board?.pieces), g.board?.pieces?.length);
