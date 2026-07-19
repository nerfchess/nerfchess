import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import {
  HOUSE_ENABLED_KEY,
  HOUSE_COUNT_KEY,
  HOUSE_SKILL_OVERRIDES_KEY,
  getAppSetting,
  setAppSetting,
  settingIsOn,
} from "@/lib/server/settings";
import {
  clampHouseCount,
  dailyHouseCount,
  HOUSE_COUNT_MIN,
  HOUSE_COUNT_MAX,
  HOUSE_SKILLS,
  bakedResolvedProfile,
  resolveSkillProfile,
  parseSkillOverrides,
  cleanSkillPatch,
  WEAKENED_PRESET,
  VERY_WEAK_PRESET,
  WEAKEN_CLAMP,
} from "@/lib/server/bots";

export const dynamic = "force-dynamic";

// When nothing is pinned, report the same day-varying default the game server
// uses (dailyHouseCount), so the slider opens on the value that actually plays
// rather than always sitting at the floor.
function readCount(value: string | null): number {
  return value == null
    ? dailyHouseCount(Math.floor(Date.now() / 86_400_000))
    : clampHouseCount(Number(value));
}

// Per-tier strength state for the dashboard: baked default, the stored override
// (if any), and the effective (resolved) profile — the last computed by the same
// resolveSkillProfile the DO uses, so the UI shows exactly what plays.
function skillTiers(overridesRaw: string | null) {
  const map = parseSkillOverrides(overridesRaw);
  return HOUSE_SKILLS.map((skill) => ({
    skill,
    defaults: bakedResolvedProfile(skill),
    overrides: (map?.[String(skill)] as Record<string, unknown> | undefined) ?? null,
    effective: resolveSkillProfile(skill, map),
  }));
}

async function state(db: Parameters<typeof getAppSetting>[0]) {
  const [enabled, count, overrides] = await Promise.all([
    getAppSetting(db, HOUSE_ENABLED_KEY),
    getAppSetting(db, HOUSE_COUNT_KEY),
    getAppSetting(db, HOUSE_SKILL_OVERRIDES_KEY),
  ]);
  return {
    enabled: settingIsOn(enabled),
    count: readCount(count),
    min: HOUSE_COUNT_MIN,
    max: HOUSE_COUNT_MAX,
    // Strength tuning (docs/bot-weakening-spec.md §5).
    clamp: WEAKEN_CLAMP,
    presets: { weakened: WEAKENED_PRESET, veryWeak: VERY_WEAK_PRESET },
    skillTiers: skillTiers(overrides),
  };
}

// GET: current house-bots on/off state, active count, and per-tier strength
// (moderator only).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await state(guard.db));
}

// Merge a batch of per-tier patches into the stored override map. `null` for a
// tier clears it; a patch merges its (cleaned, clamped) fields onto that tier's
// existing override; a tier that ends up empty is dropped. Returns the new map.
function mergeOverrides(
  current: Record<string, unknown> | null,
  patches: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current ?? {}) };
  const validTiers = new Set(HOUSE_SKILLS.map(String));
  for (const [tier, patch] of Object.entries(patches)) {
    if (!validTiers.has(tier)) continue; // ignore unknown tiers
    if (patch === null) {
      delete next[tier];
      continue;
    }
    const existing = (next[tier] as Record<string, unknown> | undefined) ?? {};
    const merged = { ...existing, ...cleanSkillPatch(patch) };
    if (Object.keys(merged).length === 0) delete next[tier];
    else next[tier] = merged;
  }
  return next;
}

// POST { enabled?, count?, skillOverrides?, resetSkillOverrides? }:
// - enabled/count: turn the house bots on/off and PIN the active count (60-90),
//   overriding the day-varying default the DO uses when no count is stored.
// - skillOverrides: a { "<tier>": patch | null } map, merged into the stored
//   overrides (per-tier patch, or null to clear a tier). Values are clamped.
// - resetSkillOverrides: clear ALL strength overrides (back to baked).
// The game-server Durable Object reads all of these (cached ~15s), so a change
// takes effect within a few seconds without a redeploy.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  let body: {
    enabled?: unknown;
    count?: unknown;
    skillOverrides?: unknown;
    resetSkillOverrides?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const hasEnabled = typeof body.enabled === "boolean";
  const hasCount = body.count != null;
  const hasOverrides = body.skillOverrides != null;
  const hasReset = body.resetSkillOverrides === true;
  if (!hasEnabled && !hasCount && !hasOverrides && !hasReset) {
    return NextResponse.json(
      { error: "Provide `enabled`, `count`, `skillOverrides`, and/or `resetSkillOverrides`." },
      { status: 400 },
    );
  }
  if (hasCount && (typeof body.count !== "number" || !Number.isFinite(body.count))) {
    return NextResponse.json({ error: "`count` must be a number." }, { status: 400 });
  }
  if (hasOverrides && (typeof body.skillOverrides !== "object" || Array.isArray(body.skillOverrides))) {
    return NextResponse.json({ error: "`skillOverrides` must be an object." }, { status: 400 });
  }

  if (hasEnabled) {
    await setAppSetting(guard.db, HOUSE_ENABLED_KEY, body.enabled ? "1" : "0");
  }
  if (hasCount) {
    await setAppSetting(guard.db, HOUSE_COUNT_KEY, String(clampHouseCount(body.count as number)));
  }
  if (hasReset) {
    // "{}" (not an absent row) is the explicit "no overrides" value; the DO
    // parses it to an empty map and every tier resolves to baked.
    await setAppSetting(guard.db, HOUSE_SKILL_OVERRIDES_KEY, "{}");
  } else if (hasOverrides) {
    const current = parseSkillOverrides(await getAppSetting(guard.db, HOUSE_SKILL_OVERRIDES_KEY));
    const merged = mergeOverrides(current, body.skillOverrides as Record<string, unknown>);
    await setAppSetting(guard.db, HOUSE_SKILL_OVERRIDES_KEY, JSON.stringify(merged));
  }

  return NextResponse.json(await state(guard.db));
}
