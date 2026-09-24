// /lobby states that used to move or misbehave after the first paint.
//
// F005: a ?tab= deep link painted the Play tab first and flipped to the asked
// tab a microtask after mount. The selected tab is now sampled every frame
// from the moment the tab row exists; it must be the asked one throughout.
//
// F145: the tabs had no keyboard pattern: every tab was a Tab stop and the
// arrow keys did nothing. Now the row is one Tab stop and the arrow keys (and
// Home and End) move the selection and the focus.

import { expect, test } from "@playwright/test";

const LOBBY = { players: [], anonymous: 0, games: [], challenges: [], seeks: [] };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/lobby**", (route) => route.fulfill({ json: LOBBY }));
});

const SAMPLE_TABS = `(() => {
  window.__selectedTabs = [];
  const tick = () => {
    const sel = document.querySelector('[role="tab"][aria-selected="true"]');
    if (sel) window.__selectedTabs.push(sel.id);
    if (window.__selectedTabs.length < 200) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();`;

test("a ?tab=watch deep link selects Watch from the first frame", async ({ page }) => {
  await page.addInitScript(SAMPLE_TABS);
  await page.goto("/lobby?tab=watch");
  await page.waitForFunction(() => (window as unknown as { __selectedTabs: string[] }).__selectedTabs.length >= 60);
  const seen = await page.evaluate(() => [...new Set((window as unknown as { __selectedTabs: string[] }).__selectedTabs)]);
  expect(seen).toEqual(["lobby-tab-watch"]);
});

test("the tabs are one Tab stop and follow the arrow keys", async ({ page }) => {
  await page.goto("/lobby");
  const play = page.getByRole("tab", { name: /^Play/ });
  const watch = page.getByRole("tab", { name: /^Watch & Friends/ });
  await expect(play).toHaveAttribute("aria-selected", "true");
  await expect(play).toHaveAttribute("tabindex", "0");
  await expect(watch).toHaveAttribute("tabindex", "-1");

  await play.focus();
  await page.keyboard.press("ArrowRight");
  await expect(watch).toHaveAttribute("aria-selected", "true");
  await expect(watch).toBeFocused();
  await expect(page.locator("#lobby-panel-watch")).toBeVisible();

  await page.keyboard.press("Home");
  await expect(play).toHaveAttribute("aria-selected", "true");
  await expect(play).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(watch).toHaveAttribute("aria-selected", "true");
});

test("a tab's aria-controls always points at a panel in the page", async ({ page }) => {
  await page.goto("/lobby");
  for (const tab of await page.getByRole("tab").all()) {
    const controls = await tab.getAttribute("aria-controls");
    if (controls) await expect(page.locator(`#${controls}`)).toHaveCount(1);
  }
});
