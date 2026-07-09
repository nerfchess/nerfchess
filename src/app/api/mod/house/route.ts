import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import {
  HOUSE_ENABLED_KEY,
  HOUSE_COUNT_KEY,
  getAppSetting,
  setAppSetting,
  settingIsOn,
} from "@/lib/server/settings";
import { clampHouseCount, HOUSE_COUNT_MIN, HOUSE_COUNT_MAX } from "@/lib/server/bots";

export const dynamic = "force-dynamic";

function readCount(value: string | null): number {
  return value == null ? HOUSE_COUNT_MIN : clampHouseCount(Number(value));
}

async function state(db: Parameters<typeof getAppSetting>[0]) {
  const [enabled, count] = await Promise.all([
    getAppSetting(db, HOUSE_ENABLED_KEY),
    getAppSetting(db, HOUSE_COUNT_KEY),
  ]);
  return {
    enabled: settingIsOn(enabled),
    count: readCount(count),
    min: HOUSE_COUNT_MIN,
    max: HOUSE_COUNT_MAX,
  };
}

// GET: current house-bots on/off state and active count (moderator only).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await state(guard.db));
}

// POST { enabled?: boolean, count?: number }: turn the house bots on/off and/or
// set how many are active (the first N of the roster, clamped 30-60). The
// game-server Durable Object reads both (cached ~15s), so a change takes effect
// within a few seconds without a redeploy.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  let body: { enabled?: unknown; count?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown; count?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const hasEnabled = typeof body.enabled === "boolean";
  const hasCount = body.count != null;
  if (!hasEnabled && !hasCount) {
    return NextResponse.json({ error: "Provide `enabled` and/or `count`." }, { status: 400 });
  }
  if (hasCount && (typeof body.count !== "number" || !Number.isFinite(body.count))) {
    return NextResponse.json({ error: "`count` must be a number." }, { status: 400 });
  }
  if (hasEnabled) {
    await setAppSetting(guard.db, HOUSE_ENABLED_KEY, body.enabled ? "1" : "0");
  }
  if (hasCount) {
    await setAppSetting(guard.db, HOUSE_COUNT_KEY, String(clampHouseCount(body.count as number)));
  }
  return NextResponse.json(await state(guard.db));
}
