// F029 and F007: what /game/<id> shows when the game is not live.
//
// The page asks the game server to watch the id and, in parallel, asks the
// archive (/api/games/<id>). `next dev` does not run the game server, so the
// socket is answered here with Playwright's WebSocket routing, the arena
// lobby (the Tier 3 check) is answered empty, and the archive is mocked.
//
// F029: an id neither the game server nor the archive knows used to say "That
// game has wrapped up" and send the viewer to the lobby after six seconds. It
// now shows the shared not-found panel and stays put. When the archive does
// not answer, "no such game" would be a guess, so the page says it could not
// load the game and offers Retry.
//
// F007: the connecting frame is drawn in the replay view's geometry, so the
// board does not move when the stored game swaps in.

import { expect, test, type Page } from "@playwright/test";

const REPLAY = {
  id: "POLISHR1",
  white_name: "polish_white",
  black_name: "polish_black",
  white_nerf_id: "",
  black_nerf_id: "",
  time_sec: 300,
  increment_sec: 3,
  moves: "e2e4 e7e5 g1f3 b8c6",
  winner: "w",
  reason: "resign",
  rated: 0,
  white_rating_before: 1500,
  white_rating_after: 1510,
  black_rating_before: 1490,
  black_rating_after: 1480,
  started_at: Date.now() - 600_000,
  completed_at: Date.now() - 60_000,
  mode: "buff",
};

type Archive = "absent" | "down" | "replay";

// The socket answers the watch frame with the server's not_found error after
// `holdMs` (a hold keeps the connecting frame up long enough to measure).
async function stub(page: Page, id: string, archive: Archive, holdMs = 0) {
  await page.routeWebSocket(/\/socket\/v1/, (ws) => {
    ws.onMessage((raw) => {
      let frame: { t?: string } = {};
      try {
        frame = JSON.parse(String(raw));
      } catch {}
      if (frame.t !== "watch") return;
      setTimeout(() => ws.send(JSON.stringify({ t: "error", d: { code: "not_found", message: "not_found" } })), holdMs);
    });
  });
  await page.route(/arena\.nerfchess\.com/, (route) => route.fulfill({ json: { games: [], players: [] } }));
  await page.route(`**/api/games/${id}`, (route) => {
    if (archive === "absent") return route.fulfill({ status: 404, json: { error: "Game not found." } });
    if (archive === "down") return route.fulfill({ status: 503, json: { error: "unavailable" } });
    return route.fulfill({ json: { game: { ...REPLAY, id } } });
  });
}

test.describe("/game/[id] when the game is not live", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("an id nobody knows shows the not-found panel and stays on the page", async ({ page }) => {
    await stub(page, "NOSUCH1", "absent");
    await page.goto("/game/NOSUCH1");
    await expect(page.getByRole("heading", { name: "No game with that id" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("link", { name: "Start a game" })).toBeVisible();
    // The old screen redirected to /lobby after 6s.
    await page.waitForTimeout(8_000);
    expect(new URL(page.url()).pathname).toBe("/game/NOSUCH1");
    await expect(page.getByRole("heading", { name: "No game with that id" })).toBeVisible({ timeout: 90_000 });
  });

  test("an archive that does not answer is an error with Retry, not a 404", async ({ page }) => {
    await stub(page, "NOSUCH2", "down");
    await page.goto("/game/NOSUCH2");
    await expect(page.getByRole("heading", { name: "Something interrupted the game" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No game with that id" })).toHaveCount(0);
  });
});

for (const vp of [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test(`connecting frame and replay share the board box, ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await stub(page, "POLISHR1", "replay", 4_000);
    await page.goto("/game/POLISHR1");
    const box = async () =>
      page.evaluate(() => {
        // The skeleton's board and the live Board both fill a square box.
        const el = document.querySelector("main .aspect-square") as HTMLElement | null;
        const header = document.querySelector("header, nav") as HTMLElement | null;
        const r = el?.getBoundingClientRect();
        return {
          header: header ? Math.round(header.getBoundingClientRect().height) : -1,
          board: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } : null,
        };
      });
    await expect(page.getByText("Connecting…")).toBeVisible({ timeout: 90_000 });
    const connecting = await box();
    await expect(page.getByRole("heading", { name: /polish_white vs polish_black/ })).toBeAttached({ timeout: 30_000 });
    await page.waitForTimeout(500);
    const replay = await box();
    console.log(JSON.stringify({ vp: vp.name, connecting, replay }));
    expect(connecting.board).not.toBeNull();
    expect(replay.board).not.toBeNull();
    expect(replay.header).toBe(connecting.header);
    expect(Math.abs(replay.board!.x - connecting.board!.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(replay.board!.y - connecting.board!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(replay.board!.w - connecting.board!.w)).toBeLessThanOrEqual(2);
  });
}
