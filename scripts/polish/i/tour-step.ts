// polish:strip trigger: start the harness tour, then step it once, so the strip
// shows the spotlight appearing and moving to its second target.
import type { Page } from "@playwright/test";

export default async function tourStep(page: Page): Promise<void> {
  await page.click("[data-testid=tour-start]");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Next", exact: true }).click();
}
