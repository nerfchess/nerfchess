// How many distinct stadium scene-layer cache keys (each a full-res canvas that
// is never evicted) does a user generate by moving the clip window?
// fieldSeed formula copied from src/components/clip/clipScene.ts:608-609.
const keys = new Set();
const styleSeed = 0; // a fixed style
for (let startPly = 0; startPly < 40; startPly++) for (let n = 1; n <= 6; n++) {
  const fieldSeed = (0x1badb002 ^ Math.imul(startPly, 2654435761) ^ (n << 16) ^ Math.imul(styleSeed, 0x85ebca6b)) >>> 0;
  keys.add(`stadium:1080x1920:${fieldSeed & 0xff}`);
}
const perStart = new Set(); for (let s = 0; s < 20; s++) perStart.add(((0x1badb002 ^ Math.imul(s, 2654435761) ^ (3 << 16)) >>> 0) & 0xff);
console.log("distinct keys over startPly 0..39 x n 1..6:", keys.size, "=> ~", (keys.size * 1080 * 1920 * 4 / 1048576).toFixed(0), "MB of canvas backing store at 9:16");
console.log("distinct keys over 20 start plies at n=3:", perStart.size);
