import { fenToBoard, boardToFen, START_FEN } from "../../../../../src/lib/fen";
console.log(boardToFen(fenToBoard(START_FEN)!) === START_FEN);
