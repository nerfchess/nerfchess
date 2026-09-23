import { expect, test } from "@playwright/test";

// Regression specs for slice E1 (content routes): states that used to lie to
// the reader or dead-end. Each test names the ledger row it guards.

test.describe("content route states", () => {
  // F183: the codex copy-link control said "Copied" even when the clipboard
  // write was refused, so a reader pasted nothing and had no idea why.
  test("codex copy link reports a failed clipboard write", async ({ page }) => {
    await page.addInitScript(`
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
      document.execCommand = () => false;
    `);
    await page.goto("/codex");
    const copy = page.getByRole("button", { name: /^Copy link to / }).first();
    await expect(copy).toBeVisible({ timeout: 60_000 });
    await copy.click();
    // Read the label straight after the click: the old code flashed "Copied"
    // for 1.6s and then reverted, so a retrying not-assertion would pass late.
    await page.waitForTimeout(300);
    expect(await copy.textContent()).not.toContain("Copied");
    await expect(copy).toContainText("Copy failed");
    await expect(page.getByRole("status").filter({ hasText: "Could not copy the link" })).toHaveCount(1);
  });

  test("codex copy link confirms a successful clipboard write", async ({ page }) => {
    await page.addInitScript(`
      window.__copied = null;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
      });
    `);
    await page.goto("/codex");
    const copy = page.getByRole("button", { name: /^Copy link to / }).first();
    await expect(copy).toBeVisible({ timeout: 60_000 });
    await copy.click();
    await expect(copy).toContainText("Copied");
    const copied = await page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);
    expect(copied).toMatch(/^http:\/\/localhost:3000\/codex\/(buff|nerf|hex|boon)\//);
  });
});

test.describe("suggest form errors", () => {
  // F184: a non-JSON error response (a proxy page, a 502) surfaced as a raw
  // "SyntaxError: Unexpected token" line, and the line had no role=alert.
  test("a non-JSON error response shows a plain message in an alert", async ({ page }) => {
    await page.route("**/api/suggest", (route) =>
      route.fulfill({ status: 502, contentType: "text/html", body: "<html><body>Bad gateway</body></html>" }),
    );
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    const alert = page.getByRole("alert").filter({ hasText: "suggestion" });
    await expect(alert).toHaveText("Could not send your suggestion. Try again in a moment.");
    await expect(page.locator("main")).not.toContainText(/SyntaxError|Unexpected token|JSON/);
  });

  test("a dropped connection shows a plain message in an alert", async ({ page }) => {
    await page.route("**/api/suggest", (route) => route.abort("internetdisconnected"));
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "connection" })).toHaveText(
      "Could not reach the server. Check your connection and try again.",
    );
    await expect(page.locator("main")).not.toContainText(/Failed to fetch|TypeError/);
  });

  test("a JSON error from the route is shown as written", async ({ page }) => {
    await page.route("**/api/suggest", (route) =>
      route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Description is too short." }) }),
    );
    await page.goto("/codex/suggest");
    await page.locator("#rule-desc").fill("A nerf where the queen may only move on even turns.");
    await page.getByRole("button", { name: /^Send .* suggestion$/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "too short" })).toHaveText("Description is too short.");
  });
});
