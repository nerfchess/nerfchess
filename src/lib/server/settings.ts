// Site-wide key/value settings, stored in the shared D1 `app_settings` table so
// both the Next API (where a moderator flips them) and the game-server Durable
// Object (which reads them, cached) see the same value. See schema.ts.

import type { D1Database } from "@cloudflare/workers-types";

// Whether the house bots (the engine-driven roster that keeps the lobby warm)
// are active. Absent row = on by default.
export const HOUSE_ENABLED_KEY = "house_enabled";

// How many house bots are active (the first N of the roster). A moderator
// slider between 30 and 60; an absent row means the default (30).
export const HOUSE_COUNT_KEY = "house_count";

export async function getAppSetting(db: D1Database, key: string): Promise<string | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setAppSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value, Date.now())
    .run();
}

// A stored value counts as "off" only when explicitly "0"/"false"; anything
// else (including a missing row) is on, so the house bots default to enabled.
export function settingIsOn(value: string | null): boolean {
  return value !== "0" && value !== "false";
}
