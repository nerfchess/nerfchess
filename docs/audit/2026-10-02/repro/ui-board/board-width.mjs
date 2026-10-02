// Evaluates the board-width class strings from OnlineMatch.tsx:2652 and
// game/page.tsx:1800 for a set of viewports (root font 14px, globals.css:574).
// Static: assumes dvh == viewport height, ignores the portrait-tablet band
// (portrait 768..1279) since no phone hits it. Grid = width - 2*12px (sm:inset-3) at >=640.
const rem = 14, cap = 720; // boardSize 1.0
const variants = {
  "online, no hint":      { base: 12, sm: 12, lg: 12 },
  "online, hint":         { base: 12, sm: 15, lg: 15 },
  "/game, no hint":       { base: 12, sm: 8,  lg: 8 },
  "/game, hint":          { base: 12, sm: 11, lg: 11 },
};
const vps = [[320,568],[360,640],[390,844],[568,320],[667,375],[740,360],[844,390],[932,430],[1024,600],[1280,720],[1366,768],[1440,800],[1920,960]];
const rail = 320;
for (const [name, v] of Object.entries(variants)) {
  console.log(`\n${name}`);
  for (const [w, h] of vps) {
    let bw;
    if (w < 640) bw = Math.min(w, Math.max(0.6 * h, h - v.base * rem));
    else if (w < 1024) bw = Math.min(cap, h - v.sm * rem, w - 344);
    else bw = Math.min(cap, h - v.lg * rem, w - 380 - rail);
    bw = Math.min(bw, w);
    const grid = w >= 640 ? bw - 24 : bw;
    console.log(`  ${String(w).padStart(4)}x${String(h).padEnd(4)} ${w > h ? "landscape" : "portrait "} board ${bw.toFixed(0).padStart(4)}px  grid ${grid.toFixed(0).padStart(4)}px  cell ${(grid / 8).toFixed(1)}px`);
  }
}
