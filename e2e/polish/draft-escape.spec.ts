import { test, expect } from "@playwright/test";

// F143 regression: Escape with a glossary definition pinned open inside the
// draft used to hide the whole draft, because the draft's capture-phase
// keydown ran before the definition's own Escape. The first Escape now closes
// only the definition; a second one still tucks the draft away.

test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [{ name: "dc:settings-v1", value: JSON.stringify({ animationSpeed: "off" }) }],
      },
    ],
  },
});

test("Escape closes an open definition before it hides the draft", async ({ page }) => {
  await page.goto("/dev/draft");
  await page.getByRole("button", { name: "Open", exact: true }).first().click({ timeout: 120_000 });
  const draft = page.locator('[role="dialog"]').first();
  await expect(draft).toBeVisible({ timeout: 30_000 });
  const term = draft.locator('[role="button"][aria-expanded]').first();
  await expect(term).toBeVisible({ timeout: 30_000 });
  await term.click();
  await expect(term).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(term).toHaveAttribute("aria-expanded", "false");
  await expect(draft).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(draft).toBeHidden();
});
