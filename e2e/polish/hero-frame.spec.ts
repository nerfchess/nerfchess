// F003: the home hero keeps one frame in every channel state.
//
// HeroTv shows the demo position until the archive pool (/api/games/recent)
// resolves, then an archived game rerun, and a live game when one is on. The
// three states used to render different rows around the board (the rerun had
// no row above it, the demo had no row below it), so the board and the phone
// CTAs under it moved by a row's height whenever the channel flipped. The
// frame is now fixed: same rows, same heights, only their content changes.
//
// The live state needs a watched game over the socket and is not mocked here;
// it renders through the same HeroFrame as the two states below.

import { expect, test, type Page } from "@playwright/test";

const REPLAY = {
  game: null,
  games: [
    {
      id: "polish-hero-replay",
      white_name: "hero_white",
      black_name: "hero_black",
      white_rating_before: 1500,
      black_rating_before: 1480,
      moves: "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
      category: "buff",
      white_avatar: null,
      black_avatar: null,
    },
  ],
};

type Geometry = { frameY: number; frameH: number; heroH: number; nextY: number };

async function heroGeometry(page: Page, withReplay: boolean): Promise<Geometry> {
  await page.unrouteAll();
  await page.route("**/api/games/recent**", (route) =>
    route.fulfill({ json: withReplay ? REPLAY : { game: null, games: [] } }),
  );
  await page.goto("/");
  if (withReplay) await expect(page.getByText("Featured replay")).toBeVisible();
  else await expect(page.getByText("Live games appear here")).toBeVisible();
  return page.evaluate(() => {
    const frame = document.querySelector(".tv-frame")!.getBoundingClientRect();
    // The hero column and the column that follows it (the ways in on a phone).
    const hero = document.querySelector("main section > div:nth-child(1)")!.getBoundingClientRect();
    const next = document.querySelector("main section > div:nth-child(2)")!.getBoundingClientRect();
    return { frameY: Math.round(frame.y), frameH: Math.round(frame.height), heroH: Math.round(hero.height), nextY: Math.round(next.y) };
  });
}

for (const vp of [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
]) {
  test.describe(`hero frame, ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });

    test("demo and rerun share one geometry", async ({ page }) => {
      const demo = await heroGeometry(page, false);
      const replay = await heroGeometry(page, true);
      expect(replay, `demo ${JSON.stringify(demo)} vs replay ${JSON.stringify(replay)}`).toEqual(demo);
    });
  });
}
