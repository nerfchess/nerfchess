import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { isGodPanelUser } from "@/lib/godPanel";
import {
  GOD_PANEL_KEY,
  getAppSetting,
  setAppSetting,
  settingIsOnStrict,
} from "@/lib/server/settings";

export const dynamic = "force-dynamic";

// The god panel is the owners' personal "fun with friends" tool, so unlike the
// house-bots toggle it is gated to the god-panel accounts specifically, not to
// any moderator. requireMod does the session/role check; isGodPanelUser narrows
// it to those accounts, matched case-insensitively like the game server does.
function isOwner(guard: { mod: { username: string } }): boolean {
  return isGodPanelUser(guard.mod.username);
}

// GET: is the owner god panel currently switched on? Defaults to off, so an
// absent row keeps the panel hidden.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  if (!isOwner(guard)) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }
  const value = await getAppSetting(guard.db, GOD_PANEL_KEY);
  return NextResponse.json({ enabled: settingIsOnStrict(value) });
}

// POST { enabled: boolean }: show or hide the owner god panel in-game. The
// client reads this on match start, so a change takes effect on the next game.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  if (!isOwner(guard)) {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }
  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean." }, { status: 400 });
  }
  await setAppSetting(guard.db, GOD_PANEL_KEY, body.enabled ? "1" : "0");
  return NextResponse.json({ enabled: body.enabled });
}
