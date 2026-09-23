/// <reference types="@cloudflare/workers-types" />

// Email preference reads and writes, shared by /api/email/prefs (the settings
// toggle), /api/email/unsubscribe (the signed link) and the tests. Takes the
// D1 handle so it runs outside a Next request too.

import { ensureEmailSchema } from "./emailSchema";
import { verifyUnsubscribeToken } from "../email/unsubscribe";

export type EmailPrefs = {
  /** The address on file, masked (j***@example.com), or null. */
  email: string | null;
  hasEmail: boolean;
  /** False once the player unsubscribed or turned email off. */
  subscribed: boolean;
};

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  return `${local[0]}${"*".repeat(Math.min(3, Math.max(1, local.length - 1)))}${email.slice(at)}`;
}

export async function getEmailPrefs(db: D1Database, userId: string): Promise<EmailPrefs | null> {
  await ensureEmailSchema(db);
  const row = await db
    .prepare(`SELECT email, email_opt_out FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ email: string | null; email_opt_out: number | null }>();
  if (!row) return null;
  const email = row.email?.trim() || null;
  return { email: email ? maskEmail(email) : null, hasEmail: !!email, subscribed: !row.email_opt_out };
}

export async function setEmailSubscribed(db: D1Database, userId: string, subscribed: boolean): Promise<boolean> {
  await ensureEmailSchema(db);
  const res = await db
    .prepare(`UPDATE users SET email_opt_out = ? WHERE id = ?`)
    .bind(subscribed ? 0 : 1, userId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export type UnsubscribeOutcome = "unsubscribed" | "invalid" | "unavailable";

/** Applies a one-click unsubscribe from a signed link. "unavailable" when the
 *  signing secret is not configured (no link could have been issued). */
export async function unsubscribeWithToken(
  db: D1Database,
  secret: string | undefined,
  userId: string,
  token: string,
): Promise<UnsubscribeOutcome> {
  if (!secret) return "unavailable";
  if (!(await verifyUnsubscribeToken(secret, userId, token))) return "invalid";
  await setEmailSubscribed(db, userId, false);
  // A valid token for a deleted account still reports success: there is
  // nothing left to mail, and the answer must not reveal whether it exists.
  return "unsubscribed";
}
