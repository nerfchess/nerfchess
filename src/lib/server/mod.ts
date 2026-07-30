/// <reference types="@cloudflare/workers-types" />

// Moderation primitives shared by the /api/mod routes: role gate, target
// lookup, and the actions themselves. Every action is written to mod_actions
// so there is always an audit trail of who did what to whom.

import { NextResponse } from "next/server";
import { getDb } from "./db";
import {
  isModerator,
  sessionTokenFromCookieHeader,
  userForSession,
  type SessionUser,
  type UserRole,
} from "./auth";
import { createNotification } from "./social";
import { notifyModEvent, type ModEventKind } from "./modWebhook";

// Sentinel for "permanent": far enough out to outlive the site.
export const PERMANENT_MS = 4102444800000; // 2100-01-01

export const MOD_ACTIONS = [
  "warn",
  "mute",
  "unmute",
  "ban",
  "unban",
  "set_role",
  "flag_name",
  "unflag_name",
] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export interface ModeratedUser {
  id: string;
  username: string;
  role: UserRole;
  muted_until: number | null;
  banned_until: number | null;
}

// Resolves the calling moderator or an error response ready to return.
export async function requireMod(
  request: Request,
): Promise<{ db: D1Database; mod: SessionUser } | NextResponse> {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isModerator(user)) return NextResponse.json({ error: "Moderator access required." }, { status: 403 });
  return { db, mod: user };
}

export async function findUserByName(db: D1Database, username: string): Promise<ModeratedUser | null> {
  return db
    .prepare(
      `SELECT id, username, role, muted_until, banned_until
       FROM users WHERE username_lower = ?`,
    )
    .bind(username.trim().toLowerCase())
    .first<ModeratedUser>();
}

async function logAction(
  db: D1Database,
  mod: SessionUser,
  target: ModeratedUser,
  action: string,
  expiresAt: number | null,
  note: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mod_actions (id, mod_user_id, mod_name, target_user_id, target_name, action, expires_at, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), mod.id, mod.username, target.id, target.username, action, expiresAt, note, Date.now())
    .run();
}

// Applies one moderation action. Returns an error string (user-facing) or
// null on success. Hierarchy: nobody touches admins, only admins touch mods,
// and only admins change roles.
export async function applyModAction(
  db: D1Database,
  mod: SessionUser,
  target: ModeratedUser,
  action: ModAction,
  durationMs: number | null,
  note: string | null,
  role?: string,
): Promise<string | null> {
  if (target.id === mod.id) return "You cannot moderate yourself.";
  if (target.role === "admin") return "Admins cannot be moderated.";
  if (target.role === "mod" && mod.role !== "admin") return "Only an admin can moderate a moderator.";

  // A null duration means a permanent sanction (the UI's "Permanent" option).
  // A provided but non-positive duration is a bad request, not a request for a
  // permanent ban: reject it instead of silently making the sanction permanent.
  if ((action === "mute" || action === "ban") && durationMs !== null && durationMs <= 0) {
    return "Duration must be a positive number of milliseconds, or omit it for a permanent action.";
  }
  const until = durationMs && durationMs > 0 ? Date.now() + durationMs : PERMANENT_MS;

  switch (action) {
    case "warn":
      // A warning is just an audit entry; repeat offenses escalate.
      break;
    case "mute":
      await db.prepare("UPDATE users SET muted_until = ? WHERE id = ?").bind(until, target.id).run();
      break;
    case "unmute":
      await db.prepare("UPDATE users SET muted_until = NULL WHERE id = ?").bind(target.id).run();
      break;
    case "ban":
      await db.prepare("UPDATE users SET banned_until = ? WHERE id = ?").bind(until, target.id).run();
      // Kill their sessions so the ban takes effect immediately.
      await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(target.id).run();
      break;
    case "unban":
      await db.prepare("UPDATE users SET banned_until = NULL WHERE id = ?").bind(target.id).run();
      break;
    case "set_role": {
      if (mod.role !== "admin") return "Only an admin can change roles.";
      if (role !== "user" && role !== "mod") return "Role must be 'user' or 'mod'.";
      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, target.id).run();
      break;
    }
    case "flag_name":
      // Never deletes the account: the owner keeps ratings, games, and
      // achievements, but must pick a new name before playing on.
      await db.prepare("UPDATE users SET name_flagged = 1 WHERE id = ?").bind(target.id).run();
      break;
    case "unflag_name":
      // False-positive relief: clears the flag with the name unchanged.
      await db.prepare("UPDATE users SET name_flagged = 0 WHERE id = ?").bind(target.id).run();
      break;
    default:
      return "Unknown action.";
  }

  const timed = action === "mute" || action === "ban";
  await logAction(db, mod, target, action === "set_role" ? `set_role:${role}` : action, timed ? until : null, note);

  // Warned or muted players find out via their bell. Bans kill the session,
  // so a ban notice waits in the bell if the account ever comes back.
  if (action === "warn" || action === "mute" || action === "ban" || action === "flag_name") {
    const untilText =
      timed && until < PERMANENT_MS ? ` until ${new Date(until).toLocaleString("en-US", { timeZone: "UTC" })} UTC` : "";
    const text =
      action === "warn"
        ? `You received a warning from the moderators${note ? `: ${note}` : "."}`
        : action === "mute"
        ? `You have been muted${untilText}. You cannot chat or send messages while muted.`
        : action === "flag_name"
        ? "A moderator flagged your username as inappropriate. Pick a new name to continue; your rating, games, and achievements are kept."
        : `You have been banned${untilText}.`;
    try {
      await createNotification(db, { userId: target.id, type: action, text });
    } catch {}
  }
  // Outbound notification (Google Sheets, when configured). Placed AFTER the
  // audit row so the spreadsheet can never claim an action the database does not
  // have, and fire-and-forget so a slow endpoint cannot delay the response. This
  // one hook covers every action that goes through applyModAction; the routes
  // that mutate state WITHOUT coming through here (card overrides, the house
  // toggles and persona editor, ratings, the god panel, report and chat-flag
  // triage) call notifyModEvent themselves.
  notifyModEvent({
    kind: action as ModEventKind,
    actor: mod.username,
    target: target.username,
    detail: [role ? `role=${role}` : null, note].filter(Boolean).join(" ") || undefined,
    expiresAt: timed ? until : null,
  });
  return null;
}
