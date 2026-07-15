// Ambient gold-dust star field shared by the home page and the lobby: three
// parallax dust layers (each a single node carrying a tiled speckle that
// drifts on a seamless loop), twelve 4-point brass glints that twinkle on
// offset beats, and two slow shooting stars (one pass roughly every 14s).
// Pure CSS — transform/opacity only, no JS loops, no canvas; 17 animated
// nodes total (10 on phones), pointer-events-none, fully stilled under
// reduced motion and dropped in perf mode / light theme. Styles live in
// globals.css under "Ambient gold-dust star field".
export function StarField() {
  // left/top in %, size in px; lg glints hide on phones via .star-glint--lg.
  const glints: { left: number; top: number; size: number; dur: number; delay: number; lg?: boolean }[] = [
    { left: 6, top: 12, size: 10, dur: 4.2, delay: 0 },
    { left: 16, top: 64, size: 14, dur: 5.6, delay: 1.3, lg: true },
    { left: 27, top: 30, size: 8, dur: 3.8, delay: 2.6 },
    { left: 38, top: 82, size: 12, dur: 6.2, delay: 0.9, lg: true },
    { left: 47, top: 8, size: 9, dur: 4.8, delay: 3.4 },
    { left: 58, top: 44, size: 15, dur: 5.2, delay: 1.9, lg: true },
    { left: 66, top: 74, size: 8, dur: 4.4, delay: 0.4 },
    { left: 74, top: 18, size: 12, dur: 6.6, delay: 2.2, lg: true },
    { left: 83, top: 56, size: 9, dur: 3.6, delay: 4.1 },
    { left: 90, top: 32, size: 13, dur: 5.8, delay: 1.1, lg: true },
    { left: 94, top: 78, size: 8, dur: 4.6, delay: 3 },
    { left: 33, top: 52, size: 7, dur: 5, delay: 2 },
  ];
  return (
    <div className="starfield" aria-hidden>
      <span className="star-layer star-layer--far" />
      <span className="star-layer star-layer--mid" />
      <span className="star-layer star-layer--near" />
      {glints.map((g, i) => (
        <span
          key={i}
          className={"star-glint" + (g.lg ? " star-glint--lg" : "")}
          style={{
            left: `${g.left}%`,
            top: `${g.top}%`,
            width: g.size,
            height: g.size,
            "--glint-dur": `${g.dur}s`,
            "--glint-delay": `${g.delay}s`,
          } as React.CSSProperties}
        />
      ))}
      {/* Kept out of the top heading band: each streak travels down-right, so a
          start high in the viewport draws a diagonal line straight across a page
          masthead / tab row (the lobby's "stray diagonal near the heading").
          Starting them in the lower-middle keeps the ambient pass without ever
          crossing a header. */}
      <span className="star-shoot" style={{ left: "10%", top: "44%", "--shoot-delay": "5s" } as React.CSSProperties} />
      <span className="star-shoot" style={{ left: "64%", top: "36%", "--shoot-delay": "19s" } as React.CSSProperties} />
    </div>
  );
}
