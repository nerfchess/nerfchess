// Example trigger module for polish:strip. A trigger is any module whose
// default export takes the Playwright page and does one thing; the strip
// starts at the input event it causes.
//
//   npm run polish:strip -- --route /lobby --trigger scripts/polish/triggers/quick-settings.ts \
//     --clip header --pad 280 --name quick-settings-open

import type { Page } from "@playwright/test";

export default async function openQuickSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Quick settings" }).first().click();
}
