import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

async function probe(path) {
  console.log('=== ' + path + ' ===');
  errors.length = 0;
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 }).catch((e)=>console.log('goto err', e.message));
  await page.waitForTimeout(2500);
  // measure overlay sizes relative to their tile
  const info = await page.evaluate(() => {
    const out = {};
    const tiles = [...document.querySelectorAll('button')].filter(b => b.querySelector('svg,span'));
    out.tileCount = tiles.length;
    // find elements whose rendered box is absurdly large vs viewport
    const huge = [];
    const all = document.querySelectorAll('.gsig-root, [class*="fx-sig"], [class*="fx-cast"], .gsig-lead-orbit, span');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width > 3000 || r.height > 3000) {
        huge.push({ cls: (el.className||'').toString().slice(0,60), w: Math.round(r.width), h: Math.round(r.height) });
        if (huge.length > 15) break;
      }
    }
    out.huge = huge;
    return out;
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('console errors:', errors.slice(0, 10));
}

await probe('/dev/plays');
await page.screenshot({ path: '/tmp/claude-0/-home-user-nerfchess/b8f01bb4-9594-5db0-a7df-64db5708fb65/scratchpad/plays.png', fullPage: false });
await probe('/dev/effects');
await page.screenshot({ path: '/tmp/claude-0/-home-user-nerfchess/b8f01bb4-9594-5db0-a7df-64db5708fb65/scratchpad/effects.png', fullPage: false });

await browser.close();
