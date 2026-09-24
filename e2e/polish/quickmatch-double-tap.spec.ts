// Quick pairing: a second tap on Find while the first is still starting must
// not queue twice.
//
// A signed-out visitor's first Find mints a guest account before it opens the
// matchmaking socket. That takes a round trip or two, and the button stayed
// live the whole time: a second tap ran startSearch again, and both runs went
// on to open their own socket and send their own queue frame, so the player
// sat in the pool twice. startSearch now holds a start-in-flight guard.
//
// The guest mint is held back 2.5s here so both taps land inside it, and the
// game server socket (not run by `next dev`) is answered by Playwright, which
// counts the queue frames.

import { expect, test } from "@playwright/test";

test("two quick taps on Find send one queue frame", async ({ page }) => {
  let queued = 0;
  await page.routeWebSocket(/\/socket\/v1/, (ws) => {
    ws.onMessage((raw) => {
      try {
        if (JSON.parse(String(raw)).t === "queue") queued += 1;
      } catch {}
    });
  });
  await page.route("**/api/lobby**", (route) =>
    route.fulfill({ json: { players: [], anonymous: 0, games: [], challenges: [], seeks: [] } }),
  );
  await page.route("**/api/auth/guest", async (route) => {
    await new Promise((r) => setTimeout(r, 2_500));
    await route.continue();
  });
  await page.goto("/lobby");
  const find = page.getByRole("button", { name: /^Find a / }).locator("visible=true").first();
  await expect(find).toBeVisible({ timeout: 90_000 });
  await find.click();
  await find.click({ timeout: 2_000 }).catch(() => {});
  // Searching state, then give any second run time to reach the socket.
  await expect(page.getByRole("button", { name: /cancel/i }).locator("visible=true").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  expect(queued).toBe(1);
});
