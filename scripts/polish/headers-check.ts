// Side-end header check (slice L, F044, F055, F113).
//
//   ./node_modules/.bin/tsx scripts/polish/headers-check.ts [--out FILE]
//
// 1. F044: loads /about in Chromium, turns on the custom background the same
//    way applyUiPrefs does (html[data-custom-bg] plus --custom-bg-url) with an
//    https image, and records every securitypolicyviolation. A violation on
//    img-src means the "Background image URL" setting silently does nothing.
// 2. F055: the response headers must not carry X-Powered-By or the retired
//    interest-cohort token, and the CSP must not name Google Fonts origins
//    (fonts are self-hosted by next/font).
// 3. F113: non-hashed public assets (house avatars, pieces, sounds) must send a
//    Cache-Control with a positive max-age.
//
// Exits 1 on any failure. Talks to the shared dev server (POLISH_BASE).
import { BASE, launch, parseArgs, waitForServer, writeJson } from "./lib/common";

type Result = { name: string; ok: boolean; detail: unknown };

async function main() {
  const args = parseArgs();
  await waitForServer();
  const results: Result[] = [];

  const res = await fetch(`${BASE}/about`, { redirect: "manual" });
  const csp = res.headers.get("content-security-policy") || "";
  const pp = res.headers.get("permissions-policy") || "";
  results.push({ name: "no x-powered-by", ok: !res.headers.get("x-powered-by"), detail: res.headers.get("x-powered-by") });
  results.push({ name: "no interest-cohort", ok: !/interest-cohort/.test(pp), detail: pp });
  results.push({ name: "csp has no google fonts origins", ok: !/fonts\.(googleapis|gstatic)\.com/.test(csp), detail: csp });

  const assets = ["/house-pfp/aurora.svg", "/piece/lichess/cardinal/wK.svg", "/sound/lichess/Capture.mp3"];
  for (const a of assets) {
    const r = await fetch(`${BASE}${a}`, { method: "HEAD" });
    const cc = r.headers.get("cache-control") || "";
    const m = /max-age=(\d+)/.exec(cc);
    results.push({ name: `cache ${a}`, ok: r.ok && !!m && Number(m[1]) > 0, detail: { status: r.status, cc } });
  }

  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded", timeout: 300_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __cspv: string[] };
      w.__cspv = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        w.__cspv.push(`${e.effectiveDirective} ${e.blockedURI}`);
      });
      const html = document.documentElement;
      html.dataset.customBg = "on";
      html.style.setProperty("--custom-bg-url", 'url("https://images.example.com/polish-bg.png")');
      html.style.setProperty("--custom-bg-dim", "0.3");
    });
    await page.waitForTimeout(1500);
    const violations = await page.evaluate(() => (window as unknown as { __cspv: string[] }).__cspv);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
    const imgViolations = violations.filter((v) => v.startsWith("img-src"));
    results.push({ name: "custom background not blocked by csp", ok: imgViolations.length === 0, detail: { violations, bodyBackgroundImage: bg } });
  } finally {
    await browser.close();
  }

  const out = args.values.get("out");
  if (out) writeJson(out, { base: BASE, at: new Date().toISOString(), results });
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok ? "" : `  ${JSON.stringify(r.detail)}`}`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
