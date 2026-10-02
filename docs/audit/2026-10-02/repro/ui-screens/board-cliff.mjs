// OnlineMatch boardFitClass (no hint, rail open), 1rem = 14px:
//  <sm : min(100vw, max(60dvh, 100dvh-12rem))
//  sm  : min(720, 100dvh-12rem, 100vw-344)
//  lg  : min(720, 100dvh-12rem, 100vw-380-railW)   railW = --match-rail-w default 320
// portrait 768..1279 uses TABLET_STACK_BOARD: min(720, 100dvh-16rem, 100vw-1rem)
const REM = 14;
function board(w, h, railW = 320) {
  const portraitBand = w >= 768 && w <= 1279.98 && h > w;
  if (portraitBand) return Math.min(720, h - 16 * REM, w - REM);
  if (w < 640) return Math.min(w, Math.max(0.6 * h, h - 12 * REM));
  if (w < 1024) return Math.min(720, h - 12 * REM, w - 344);
  return Math.min(720, h - 12 * REM, w - 380 - railW);
}
for (const [w, h] of [[1023, 768], [1024, 768], [1100, 800], [1180, 820], [1279, 800], [1280, 800], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
  console.log(`${w}x${h}: board ${board(w, h)}px`);
}
