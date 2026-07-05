import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import {
  HOUSE_ENABLED_KEY,
  getAppSetting,
  setAppSetting,
  settingIsOn,
} from "@/lib/server/settings";

export const dynamic = "force-dynamic";

// GET: current house-bots on/off state (moderator only).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const value = await getAppSetting(guard.db, HOUSE_ENABLED_KEY);
  return NextResponse.json({ enabled: settingIsOn(value) });
}

// POST { enabled: boolean }: turn the house bots on or off site-wide. The
// game-server Durable Object reads this (cached ~15s), so a change takes effect
// within a few seconds without a redeploy.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean." }, { status: 400 });
  }
  await setAppSetting(guard.db, HOUSE_ENABLED_KEY, body.enabled ? "1" : "0");
  return NextResponse.json({ enabled: body.enabled });
}
