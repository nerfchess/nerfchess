import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

// One player's achievements: the full catalog, each merged with the player's
// progress and unlock time so the page can render locked and unlocked states
// side by side. The unlocked rows are read straight from D1, keyed by user_id
// (bounded, indexed) - there is no game scan here.
export async function GET(_request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = params.username.trim().toLowerCase();
  const db = await getDb();
  const user = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(username)
    .first<{ id: string; username: string }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const rows = await db
    .prepare(`SELECT achievement_id, progress, unlocked_at FROM user_achievements WHERE user_id = ?`)
    .bind(user.id)
    .all<{ achievement_id: string; progress: number; unlocked_at: number | null }>();
  const byId = new Map(rows.results.map((r) => [r.achievement_id, r]));

  const achievements = ACHIEVEMENTS.map((a) => {
    const row = byId.get(a.id);
    const progress = row?.progress ?? 0;
    const unlockedAt = row?.unlocked_at ?? null;
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      goal: a.goal,
      progress: Math.min(progress, a.goal),
      unlocked: unlockedAt != null,
      unlockedAt,
    };
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return NextResponse.json({
    username: user.username,
    unlockedCount,
    total: achievements.length,
    achievements,
  });
}
