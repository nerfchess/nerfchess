/// <reference types="@cloudflare/workers-types" />

// Moderation primitives shared by the /api/mod routes: role gate, target
// lookup, the actions themselves, and the audit log. Every mutating mod route
// writes one mod_actions row through logModEvent (who, what, to what, when,
// why, and the values an edit replaced), so the audit log is the complete
// record; the optional webhook only mirrors it.

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
import { assertSameOrigin, readJsonObject, type JsonObject } from "./request";
import { isPowerUsername } from "../godPanel";

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

// Resolves the calling moderator or an error response ready to return. A
// mutating request (anything but GET/HEAD) from another site is refused first
// (F046): the session cookie is SameSite=Lax, which a cross-site top-level
// form POST still carries.
export async function requireMod(
  request: Request,
): Promise<{ db: D1Database; mod: SessionUser } | NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    const refused = assertSameOrigin(request);
    if (refused) return refused;
  }
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

/** A size-capped JSON object body for a mod write (the same-origin check has
 *  already run in requireMod). */
export async function readModBody(request: Request): Promise<JsonObject | NextResponse> {
  return readJsonObject(request);
}

/** What an audit row is about. 'user' rows carry the player's id. */
export type ModTargetKind = "user" | "report" | "chat_flag" | "card" | "house" | "persona" | "setting" | "webhook";

export interface ModEventRecord {
  /** Short verb, e.g. 'ban', 'report_resolved', 'card_override_saved'. */
  action: string;
  targetKind: ModTargetKind;
  /** The player's id for 'user' rows (and for a rating edit). */
  targetUserId?: string | null;
  /** Human-readable target: a username, 'buff:<id>', a setting name. */
  targetName: string;
  /** Machine reference: a report id, 'buff:<id>', a setting key. */
  targetRef?: string | null;
  /** Why (the moderator's note). */
  reason?: string | null;
  expiresAt?: number | null;
  /** Values the action replaced and wrote, for reading back and reverting. */
  before?: unknown;
  after?: unknown;
}

function jsonOrNull(value: unknown): string | null {
  if (value === undefined) return null;
  try {
    const text = JSON.stringify(value);
    return text.length > 4000 ? text.slice(0, 4000) : text;
  } catch {
    return null;
  }
}

/** The one statement that writes an audit row, for callers that batch it with
 *  the change it records (so the change and its record land together). */
export function modEventStatement(db: D1Database, actor: { id: string; username: string }, ev: ModEventRecord) {
  return db
    .prepare(
      `INSERT INTO mod_actions (id, mod_user_id, mod_name, target_user_id, target_name, action, expires_at, note,
                                created_at, target_kind, target_ref, before_json, after_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      actor.id,
      actor.username,
      ev.targetUserId ?? "",
      ev.targetName,
      ev.action,
      ev.expiresAt ?? null,
      ev.reason?.trim() ? ev.reason.trim().slice(0, 500) : null,
      Date.now(),
      ev.targetKind,
      ev.targetRef ?? null,
      jsonOrNull(ev.before),
      jsonOrNull(ev.after),
    );
}

/**
 * Record one moderator action in the audit log, then mirror it to the webhook
 * (a no-op unless MOD_WEBHOOK_URL is set). The row is written first so the
 * webhook can never claim an action the database does not hold.
 */
export async function logModEvent(
  db: D1Database,
  actor: { id: string; username: string },
  ev: ModEventRecord,
  webhookKind?: ModEventKind,
): Promise<void> {
  await modEventStatement(db, actor, ev).run();
  if (webhookKind) {
    notifyModEvent({
      kind: webhookKind,
      actor: actor.username,
      target: ev.targetName,
      detail: [ev.reason?.trim() || null, ev.after !== undefined ? jsonOrNull(ev.after) : null].filter(Boolean).join(" ") || undefined,
      expiresAt: ev.expiresAt ?? null,
    });
  }
}

/** Actions that need a written reason. Every player action does: the audit
 *  log answers "why" for each one (brief 15). */
export const REASON_REQUIRED = "Write a reason; it goes in the audit log.";

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
  if (!note || !note.trim()) return REASON_REQUIRED;
  // A flagged name gets renamed and then freed; for a name that carries owner
  // powers (godPanel.ts) that would let anyone register it and inherit them
  // (F045), so those names are never flagged from the panel.
  if (action === "flag_name" && isPowerUsername(target.username)) {
    return "This account's name carries owner tools and cannot be flagged here.";
  }

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
  await modEventStatement(db, mod, {
    action: action === "set_role" ? `set_role:${role}` : action,
    targetKind: "user",
    targetUserId: target.id,
    targetName: target.username,
    targetRef: target.id,
    reason: note,
    expiresAt: timed ? until : null,
    before: { role: target.role, muted_until: target.muted_until, banned_until: target.banned_until },
  }).run();

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
