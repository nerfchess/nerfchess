// Board width the match surfaces compute for landscape phones, from the literal
// boardFitClass in OnlineMatch.tsx (~2652) / game/page.tsx: at sm (>=640px wide)
//   w = min(var(--board-cap,720px), calc(100dvh - 12rem), calc(100vw - 344px))
// (15rem when a hint shows). Root font size is 14px (globals.css html), so 1rem = 14px.
// Header at sm is CompactSiteHeader min-h-[60px] (SiteHeader.tsx:752).
// MobileBuffDrawer is `sm:block lg:hidden` and 46px + inset (mobileChrome.ts).
const REM = 14;
const devices = [
  { name: "iPhone SE landscape", w: 667, h: 375, safariChrome: 0 },
  { name: "iPhone 14 landscape (toolbar hidden)", w: 844, h: 390, safariChrome: 0 },
  { name: "iPhone 14 landscape (tab bar shown)", w: 844, h: 390, safariChrome: 50 },
  { name: "Pixel 7 landscape (Chrome)", w: 915, h: 412, safariChrome: 56 },
  { name: "Galaxy S8 landscape", w: 740, h: 360, safariChrome: 56 },
];
const portrait = { name: "iPhone 14 portrait (reference)", w: 390, h: 844 };
for (const d of devices) {
  const dvh = d.h - d.safariChrome;
  for (const reserveRem of [12, 15]) {
    const board = Math.min(720, dvh - reserveRem * REM, d.w - 344);
    console.log(`${d.name.padEnd(40)} dvh=${dvh} reserve=${reserveRem}rem -> board ${board}px, square ${(board / 8).toFixed(1)}px`);
  }
}
// below sm (portrait phone): w = min(100vw, max(60dvh, 100dvh - 12rem))
const pw = Math.min(portrait.w, Math.max(0.6 * portrait.h, portrait.h - 12 * REM));
console.log(`${portrait.name.padEnd(40)} board ${pw}px, square ${(pw / 8).toFixed(1)}px`);
