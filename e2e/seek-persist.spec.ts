import { test, expect } from "@playwright/test";

// Temp check: a Quick Play search must survive switching lobby tabs.
//
// The offline test env has no game server, so the game-server WebSocket
// (ws://…/socket/v1) is replaced with a socket that stays CONNECTING forever:
// MPSession.queue() then stays pending (~8s per connect attempt, 3 attempts)
// and QueueButton holds its "searching" state long enough to flip tabs and
// back. Only /socket/ URLs are stubbed — Next dev's HMR socket must stay real
// (replacing the global outright breaks the dev client's boot).
test("quick play seek persists across tab switches", async ({ page }) => {
  await page.addInitScript(() => {
    const RealWebSocket = window.WebSocket;
    function PatchedWebSocket(url: string, protocols?: string | string[]) {
      if (String(url).includes("/socket/")) {
        // Game server: hang in CONNECTING forever.
        return {
          readyState: 0,
          url: String(url),
          onopen: null,
          onmessage: null,
          onerror: null,
          onclose: null,
          send() {},
          close() {},
          addEventListener() {},
          removeEventListener() {},
        };
      }
      return new RealWebSocket(url, protocols);
    }
    PatchedWebSocket.CONNECTING = 0;
    PatchedWebSocket.OPEN = 1;
    PatchedWebSocket.CLOSING = 2;
    PatchedWebSocket.CLOSED = 3;
    PatchedWebSocket.prototype = RealWebSocket.prototype;
    // @ts-expect-error test stub
    window.WebSocket = PatchedWebSocket;
  });

  // The offline env has no account backend either: answer /api/auth/me with a
  // fake signed-in user so startSearch reaches the searching state instead of
  // failing at guest creation.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u_test",
          username: "tester",
          rating: 1500,
          rd: 150,
          games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          avatar: null,
          role: "user",
          mutedUntil: null,
          bio: null,
          flair: null,
          isGuest: false,
          email: null,
        },
      }),
    }),
  );

  await page.goto("/lobby");
  const findButton = page.getByRole("button", { name: /find a .* game/i });
  await expect(findButton).toBeVisible({ timeout: 30_000 });

  // Start the search: the searching row (status text + Cancel) replaces the
  // setup controls.
  await findButton.click();
  await expect(page.getByText(/finding a/i)).toBeVisible({ timeout: 10_000 });
  const cancel = page.getByRole("button", { name: /^cancel$/i });
  await expect(cancel).toBeVisible();

  // Flip to Watch & Friends, open the friends fold, then back to Play.
  await page.getByRole("tab", { name: /watch & friends/i }).click();
  await expect(page.getByText("Live games")).toBeVisible();
  await expect(findButton).toBeHidden();
  await page.getByRole("button", { name: /play a friend/i }).click();
  await expect(page.getByLabel("Friend game code")).toBeVisible();
  await page.getByRole("tab", { name: /^play/i }).click();

  // The in-progress search is still shown, with its Cancel button.
  await expect(page.getByText(/finding a/i)).toBeVisible();
  await expect(cancel).toBeVisible();

  // Explicit cancel still works and returns to the idle setup.
  await cancel.click();
  await expect(findButton).toBeVisible();
  await expect(page.getByText(/finding a/i)).toBeHidden();
});
