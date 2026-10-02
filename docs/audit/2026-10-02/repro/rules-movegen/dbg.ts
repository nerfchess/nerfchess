import { parseFen, gen, uci } from "./ref";
const p = parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
console.log(gen(p, "legal").slice(0, 6));
