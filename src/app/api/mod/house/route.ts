import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import {
  HOUSE_ENABLED_KEY,
  HOUSE_GAMES_KEY,
  HOUSE_SKILL_OVERRIDES_KEY,
  getAppSetting,
  setAppSetting,
  settingIsOn,
} from "@/lib/server/settings";
import {
  clampHouseGames,
  HOUSE_GAMES_MIN,
  HOUSE_GAMES_MAX,
  HOUSE_GAMES_DEFAULT,
  HOUSE_SKILLS,
  bakedResolvedProfile,
  resolveSkillProfile,
  parseSkillOverrides,
  cleanSkillPatch,
  WEAKENED_PRESET,
  VERY_WEAK_PRESET,
  WEAKEN_CLAMP,
} from "@/lib/server/bots";
import { notifyModEvent } from "@/lib/server/modWebhook";

export const dynamic = "force-dynamic";

// When nothing is pinned, report the same default the game server falls back to
// (HOUSE_GAMES_DEFAULT), so the slider opens on the value that actually plays.
function readGames(value: string | null): number {
  return value == null ? HOUSE_GAMES_DEFAULT : clampHouseGames(Number(value));
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
  const [enabled, games, overrides] = await Promise.all([
    getAppSetting(db, HOUSE_ENABLED_KEY),
    getAppSetting(db, HOUSE_GAMES_KEY),
    getAppSetting(db, HOUSE_SKILL_OVERRIDES_KEY),
  ]);
  return {
    enabled: settingIsOn(enabled),
    games: readGames(games),
    min: HOUSE_GAMES_MIN,
    max: HOUSE_GAMES_MAX,
    // Strength tuning (docs/bot-weakening-spec.md §5).
    clamp: WEAKEN_CLAMP,
    presets: { weakened: WEAKENED_PRESET, veryWeak: VERY_WEAK_PRESET },
    skillTiers: skillTiers(overrides),
  };
}

// GET: current house-bots on/off state, active-games target, and per-tier
// strength (moderator only).
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

// POST { enabled?, games?, skillOverrides?, resetSkillOverrides? }:
// - enabled: turn the house bots on/off.
// - games: PIN how many house-vs-house filler games run at once (0..HOUSE_GAMES_MAX,
//   clamped), overriding the default band the DO uses when nothing is stored.
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
    games?: unknown;
    skillOverrides?: unknown;
    resetSkillOverrides?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const hasEnabled = typeof body.enabled === "boolean";
  const hasGames = body.games != null;
  const hasOverrides = body.skillOverrides != null;
  const hasReset = body.resetSkillOverrides === true;
  if (!hasEnabled && !hasGames && !hasOverrides && !hasReset) {
    return NextResponse.json(
      { error: "Provide `enabled`, `games`, `skillOverrides`, and/or `resetSkillOverrides`." },
      { status: 400 },
    );
  }
  if (hasGames && (typeof body.games !== "number" || !Number.isFinite(body.games))) {
    return NextResponse.json({ error: "`games` must be a number." }, { status: 400 });
  }
  if (hasOverrides && (typeof body.skillOverrides !== "object" || Array.isArray(body.skillOverrides))) {
    return NextResponse.json({ error: "`skillOverrides` must be an object." }, { status: 400 });
  }

  if (hasEnabled) {
    await setAppSetting(guard.db, HOUSE_ENABLED_KEY, body.enabled ? "1" : "0");
  }
  if (hasGames) {
    await setAppSetting(guard.db, HOUSE_GAMES_KEY, String(clampHouseGames(body.games as number)));
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

  // One event per knob actually touched, so the sheet reads as a change log
  // rather than one opaque "house settings saved" row.
  if (hasEnabled) {
    notifyModEvent({
      kind: "house_toggled",
      actor: guard.mod.username,
      detail: body.enabled ? "on" : "off",
    });
  }
  if (hasGames) {
    notifyModEvent({
      kind: "house_games_pinned",
      actor: guard.mod.username,
      detail: String(clampHouseGames(body.games as number)),
    });
  }
  if (hasReset || hasOverrides) {
    notifyModEvent({
      kind: "house_skill_override",
      actor: guard.mod.username,
      detail: hasReset ? "reset to baked" : JSON.stringify(body.skillOverrides).slice(0, 400),
    });
  }

  return NextResponse.json(await state(guard.db));
}
