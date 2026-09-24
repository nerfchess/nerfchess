// ---------------------------------------------------------------------------
// Brief section 4: a first visit to /login mints a guest from the header
// (useSession ensure -> ensureAccount -> POST /api/auth/guest). When the
// visitor signs in before that mint answers, the late guest response used to
// land after the login response and overwrite both the session and the nc_who
// display cookie, so the signed-in visitor became a guest again and the next
// first paint drew the guest header (seen in signin-bump.spec.ts on a busy dev
// server, nc_who "v1.g.user.WittyJester.").
//
// This spec makes the race deterministic in both orders: the mint already on
// the wire when Sign in is pressed, and the header's signed-out /me landing
// only after the sign-in is on the wire (so the mint starts during it). The
// guest response is held until the login response is in.
// ---------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";
import { seedAll } from "../../scripts/polish/seed";

const USERNAME = "polish_user";
const PASSWORD = process.env.POLISH_SEED_PASSWORD || "polish-local-only-7";

test.beforeAll(async () => {
  await seedAll(() => {});
});

type Race = "mint-first" | "sign-in-first";

async function signInDuringGuestMint(page: Page, race: Race) {
  let loginDone!: () => void;
  const loginLanded = new Promise<void>((resolve) => (loginDone = resolve));
  let loginSent!: () => void;
  const loginStarted = new Promise<void>((resolve) => (loginSent = resolve));
  let guestHeld = false;
  let meHeld = false;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/auth/login") loginSent();
  });
  page.on("response", (r) => {
    if (new URL(r.url()).pathname === "/api/auth/login") loginDone();
  });
  // Every hold also ends after 4s, so a client that orders its session
  // writes (and so waits for one of these) is never deadlocked.
  const until = (p: Promise<void>) => Promise.race([p, new Promise((r) => setTimeout(r, 4_000))]);
  // The guest mint is sent at once, but its answer lands after the sign-in's.
  await page.route("**/api/auth/guest", async (route) => {
    const response = await route.fetch();
    guestHeld = true;
    await until(loginLanded);
    await route.fulfill({ response });
  });
  if (race === "sign-in-first") {
    // The header's first /me (the signed-out answer that leads to the mint)
    // only lands once the sign-in is already on the wire.
    await page.route("**/api/auth/me", async (route) => {
      if (meHeld) return route.continue();
      meHeld = true;
      const response = await route.fetch();
      await until(loginStarted);
      await route.fulfill({ response });
    });
  }

  await page.goto("/login");
  if (race === "mint-first") await expect.poll(() => guestHeld, { timeout: 60_000 }).toBe(true);
  else await expect.poll(() => meHeld, { timeout: 60_000 }).toBe(true);
  await page.getByLabel("Username or email").fill(USERNAME);
  await page.getByLabel("Password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 60_000 }),
    page.getByRole("button", { name: "Sign in", exact: true }).last().click(),
  ]);
  // Let any held response land before reading the cookies.
  await loginLanded;
  await page.waitForTimeout(4_500);
}

for (const race of ["mint-first", "sign-in-first"] as const) {
  test(`a guest mint in flight does not undo a sign-in (${race})`, async ({ page }) => {
    test.setTimeout(120_000);
    await signInDuringGuestMint(page, race);
    const who = (await page.context().cookies()).find((c) => c.name === "nc_who")?.value ?? "";
    expect(who, "display cookie").toMatch(new RegExp(`^v1\\.u\\.\\w+\\.${USERNAME}\\.`));
    const me = (await (await page.request.get("/api/auth/me")).json()) as { user: { username: string } | null };
    expect(me.user?.username, "session after sign-in").toBe(USERNAME);
    // The header follows the same account, not the guest.
    await expect(page.locator("nav.site-nav [data-header-right]").first()).toContainText(USERNAME, { timeout: 30_000 });
  });
}
