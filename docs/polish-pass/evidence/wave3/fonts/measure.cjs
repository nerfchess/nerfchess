const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({executablePath: require("fs").existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined});
  const p = await b.newPage();
  await p.goto("http://localhost:3000/terms-of-service", { waitUntil: "load", timeout: 180000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.fonts].some(f => f.family.includes("Noto Sans") && f.status === "loaded"), null, { timeout: 120000 });
  const res = await p.evaluate(async () => {
    const txt = [...document.querySelectorAll("main p, main li, main h1, main h2, nav a")].map(e => e.textContent).join(" ").slice(0, 20000);
    const css = `
@font-face{font-family:LibR;src:local("Liberation Sans");font-weight:100 500}
@font-face{font-family:LibR;src:local("Liberation Sans Bold");font-weight:600 900}
@font-face{font-family:MonoL;src:local("Liberation Mono");}`;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const mk = (fam, w, t) => { const s = document.createElement("span"); s.style.cssText = `font-family:${fam};font-weight:${w};font-size:100px;white-space:nowrap;position:absolute;left:-99999px`; s.textContent = t; document.body.appendChild(s); return s; };
    const out = {};
    const probe = mk("LibR", 400, "x"); await document.fonts.load("400 100px LibR"); await document.fonts.load("700 100px LibR");
    for (const w of [400, 500, 600, 700]) {
      await document.fonts.load(`${w} 100px "Noto Sans"`);
      const a = mk('"Noto Sans"', w, txt).getBoundingClientRect().width;
      const l = mk("LibR", w, txt).getBoundingClientRect().width;
      out["noto" + w] = { noto: a, lib: l, ratio: a / l };
    }
    const mtxt = "0123456789:.+-  1:23.4 2450 ABCDEF abcdef ";
    for (const w of [400, 500, 600]) {
      await document.fonts.load(`${w} 100px "JetBrains Mono"`);
      const a = mk('"JetBrains Mono"', w, mtxt).getBoundingClientRect().width;
      const l = mk("LibR", w, mtxt).getBoundingClientRect().width;
      out["mono" + w] = { mono: a, lib: l, ratio: a / l };
    }
    out.len = txt.length;
    out.fonts = [...document.fonts].filter(f=>/Fallback|Metric|LibR/.test(f.family)).map(f => `${f.family}:${f.weight}:${f.status}`);
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
