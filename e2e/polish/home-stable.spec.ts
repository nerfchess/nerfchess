// F004: the home page's async regions hold their final geometry.
//
// The live counter under the three buttons rendered nothing until the first
// lobby snapshot and then pushed the mode list down 60px; the Latest games
// skeleton had a different row height and count from the feed it stood in for.
// Each state is loaded twice: once with the data held (the loading state) and
// once with it served, and the boxes must not differ.
//
// It also checks the shared lobby poll: the hero and the live counter used to
// fetch the same snapshot separately, so a load made two /api/lobby requests
// (four under React's dev double effects) where one serves both.

import { expect, test, type Page } from "@playwright/test";

const GAMES = Array.from({ length: 10 }, (_, i) => ({
  id: `polish-feed-${i}`,
  whiteName: `white_player_${i}`,
  blackName: `black_${i}`,
  winner: i % 3 === 0 ? "w" : i % 3 === 1 ? "b" : "draw",
  reason: "checkmate",
  rated: i % 2 === 0,
  category: i % 2 ? "nerf" : "buff",
  completedAt: Date.now() - i * 60_000,
}));
const LOBBY = { players: [{ name: "polish_lobby_a", rating: 1500, status: "online" }], anonymous: 3, games: [], challenges: [], seeks: [] };

const BOXES = [
  // The ways in: title row, buttons, rejoin slot, live counter, modes, blurb.
  "main > section:nth-of-type(1) > div.order-2 > *",
  // The Latest games rows.
  "main > section:nth-of-type(1) > div.order-3 li",
  // The section under the fold, which everything above pushes.
  "main > section:nth-of-type(2) > *",
];

async function boxes(page: Page, serve: boolean): Promise<string[][]> {
  await page.route("**/api/community/recent**", (route) => (serve ? route.fulfill({ json: { games: GAMES } }) : undefined));
  await page.route("**/api/lobby**", (route) => (serve ? route.fulfill({ json: LOBBY }) : undefined));
  await page.goto("/");
  if (serve) {
    await expect(page.getByText("white_player_9")).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Latest games" })).toBeVisible();
    await page.waitForTimeout(1000);
  }
  return page.evaluate((sels) => {
    return sels.map((s) =>
      Array.from(document.querySelectorAll(s)).map((e) => {
        const r = e.getBoundingClientRect();
        return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
    );
  }, BOXES);
}

for (const vp of [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
]) {
  test.describe(`home, ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });

    test("loading and loaded share one geometry", async ({ browser }) => {
      const make = () => browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
      const loadingPage = await make();
      const loading = await boxes(loadingPage, false);
      await loadingPage.close();
      const loadedPage = await make();
      const loaded = await boxes(loadedPage, true);
      await loadedPage.close();
      expect(loaded).toEqual(loading);
    });
  });
}

test("one lobby request serves the hero and the live counter", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/lobby**", (route) => {
    requests += 1;
    return route.fulfill({ json: LOBBY });
  });
  await page.goto("/");
  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(2000);
  expect(requests).toBe(1);
});
