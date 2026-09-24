import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await b.newPage();
await page.goto("http://localhost:3000/terms-of-service", { waitUntil: "load", timeout: 300000 });
await page.addStyleTag({ content: "/*\n * Metric-matched fallbacks for the two self-hosted faces, for systems with no\n * Arial.\n *\n * next/font writes a size-adjusted \"Noto Sans Fallback\" (and \"JetBrains Mono\n * Fallback\") face whose only source is local(Arial). Linux, ChromeOS and many\n * Android builds ship no font named Arial, so that face fails to load and the\n * text falls through to system-ui (DejaVu Sans on a stock Linux box, which is\n * far wider). When Noto Sans then swaps in, every paragraph rewraps: the\n * content pages measured 0.07 to 0.31 CLS from that alone.\n *\n * Liberation Sans and Arimo are metric-compatible with Arial (same advance\n * widths, same vertical metrics), so the overrides next/font computed for\n * Arial apply to them unchanged. These faces sit after the next/font\n * fallback in the family list (layout.tsx `fallback`), so a system with Arial\n * never reaches them. Keep the four override values in step with the ones\n * next/font generates if the face or its subset ever changes.\n */\n\n@font-face {\n  font-family: \"OldNotoFb\";\n  src: local(\"Liberation Sans\"), local(\"LiberationSans\"), local(\"Arimo\"), local(\"Arimo Regular\");\n  font-weight: 100 500;\n  ascent-override: 100.54%;\n  descent-override: 27.56%;\n  line-gap-override: 0%;\n  size-adjust: 106.33%;\n}\n\n@font-face {\n  font-family: \"OldNotoFb\";\n  src: local(\"Liberation Sans Bold\"), local(\"LiberationSans-Bold\"), local(\"Arimo Bold\"), local(\"Arimo-Bold\");\n  font-weight: 600 900;\n  ascent-override: 100.54%;\n  descent-override: 27.56%;\n  line-gap-override: 0%;\n  size-adjust: 106.33%;\n}\n\n@font-face {\n  font-family: \"OldMonoFb\";\n  src: local(\"Liberation Sans\"), local(\"LiberationSans\"), local(\"Arimo\"), local(\"Arimo Regular\");\n  font-weight: 100 500;\n  ascent-override: 75.79%;\n  descent-override: 22.29%;\n  line-gap-override: 0%;\n  size-adjust: 134.59%;\n}\n\n@font-face {\n  font-family: \"OldMonoFb\";\n  src: local(\"Liberation Sans Bold\"), local(\"LiberationSans-Bold\"), local(\"Arimo Bold\"), local(\"Arimo-Bold\");\n  font-weight: 600 900;\n  ascent-override: 75.79%;\n  descent-override: 22.29%;\n  line-gap-override: 0%;\n  size-adjust: 134.59%;\n}\n" });
await page.evaluate(() => document.fonts.ready);
const r = await page.evaluate(async ([FBN, FBM]) => {
  const text = document.querySelector("main").innerText.replace(/\s+/g, " ").slice(0, 6000);
  const out = {};
  const probe = (fam, w) => { const s = document.createElement("span"); s.style.cssText = `position:absolute;white-space:nowrap;font-size:16px;font-weight:${w};font-family:${fam};visibility:hidden;line-height:normal`; s.textContent = text; document.body.appendChild(s); const r = s.getBoundingClientRect(); s.remove(); return [r.width, r.height]; };
  for (const w of [400, 500, 600, 700]) {
    await document.fonts.load(`${w} 16px "Noto Sans"`);
    const [a, ah] = probe('"Noto Sans"', w), [f, fh] = probe(FBN || "NotoSansMetricFallback", w);
    out["sans" + w] = { ratio: +(f / a).toFixed(4), hNoto: ah, hFb: fh };
  }
  const digits = "0123456789:. 1500 +12 3:00 ".repeat(40);
  for (const w of [400, 500, 600]) {
    await document.fonts.load(`${w} 16px "JetBrains Mono"`);
    const p = (fam) => { const s = document.createElement("span"); s.style.cssText = `position:absolute;white-space:nowrap;font-size:16px;font-weight:${w};font-family:${fam};line-height:normal`; s.textContent = digits; document.body.appendChild(s); const r = s.getBoundingClientRect(); s.remove(); return [r.width, r.height]; };
    const [a, ah] = p('"JetBrains Mono"'), [f, fh] = p(FBM);
    out["mono" + w] = { ratio: +(f / a).toFixed(4), hMono: ah, hFb: fh };
  }
  return out;
}, [process.env.FBN || "NotoSansMetricFallback", process.env.FBM || "JetBrainsMonoMetricFallback"]);
console.log(JSON.stringify(r));
await b.close();
