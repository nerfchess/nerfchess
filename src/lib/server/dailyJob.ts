/// <reference types="@cloudflare/workers-types" />

// The daily scheduled job (brief section 17.2), run by the worker's
// scheduled() handler on the "0 13 * * *" cron in wrangler.jsonc (9am EDT,
// 8am EST; integrator decision Q23).
//
// It takes the worker env directly instead of going through getDb() or pgAll,
// which need a Next request context that a cron does not have (F098).
//
// Two jobs, each exactly-once through the email_sends table (the key is claimed
// with INSERT OR IGNORE before anything is sent, so a retried or double-fired
// cron finds the claim and skips):
//
//  1. Welcome email to every account that became registered in the window and
//     has an email, has not opted out, and has never been welcomed. CASL: not
//     sent at all unless EMAIL_MAILING_ADDRESS and EMAIL_UNSUBSCRIBE_SECRET are
//     set, so every welcome carries the sender's address and a working signed
//     one-click unsubscribe (List-Unsubscribe headers plus a footer link).
//  2. The founders' daily report to FOUNDER_REPORT_EMAILS.
//
// With RESEND_API_KEY or EMAIL_FROM unset the provider is a logging no-op and
// the job claims nothing, so turning email on later still welcomes everyone
// inside the window (integrator decision Q21: ships dormant).

import { emailProviderFromEnv, parseAddressList, type EmailEnv, type EmailLog, type EmailProvider } from "./email";
import { ensureEmailSchema } from "./emailSchema";
import { listUnsubscribeHeaders, unsubscribeUrl } from "../email/unsubscribe";
import { renderFounderReport, renderWelcomeEmail, type ReportRow } from "../email/templates";

export type DailyJobEnv = EmailEnv & {
  DB: D1Database;
  HYPERDRIVE?: Hyperdrive;
  /** Comma separated founders' report recipients. */
  FOUNDER_REPORT_EMAILS?: string;
  /** CASL: the sender's postal or mailing address, printed in every email. */
  EMAIL_MAILING_ADDRESS?: string;
  /** Contact shown in the footer (defaults to the reply-to or From address). */
  EMAIL_CONTACT?: string;
  /** HMAC key for the one-click unsubscribe links. */
  EMAIL_UNSUBSCRIBE_SECRET?: string;
};

export type DailyJobOptions = {
  now?: number;
  provider?: EmailProvider;
  log?: EmailLog;
  siteUrl?: string;
  /** Pause between welcome sends (Resend's default limit is 2 requests a second). */
  sendGapMs?: number;
  /** Counts games from the archive; defaults to Hyperdrive when bound, else D1. */
  archive?: ArchiveQuery;
};

export type DailyJobReport = {
  ranAt: number;
  welcome: { status: "sent" | "skipped"; reason?: string; candidates: number; sent: number; failed: number; alreadyClaimed: number };
  report: { status: "sent" | "skipped" | "failed" | "already-sent"; reason?: string; recipients: number };
};

export const SITE_URL = "https://nerfchess.com";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** How far back a registration still gets its welcome. Wider than the 24 hours
 *  between runs so one failed or skipped run is caught up by the next; the
 *  send log keeps it to one email per account either way. */
export const WELCOME_WINDOW_MS = 48 * HOUR_MS;
/** Upper bound per run, so a backlog cannot turn one cron into a mass mailing. */
export const WELCOME_MAX_PER_RUN = 300;

// Human filter, the exclusion rule of INTEGRATOR DECISIONS Q5 (same rule as
// src/lib/server/metrics.ts): house bots (hp_), the seeded leaderboard (seed_)
// and local test accounts (polish_ usernames) are not people.
const HUMAN_USER = `(u.id NOT LIKE 'hp\\_%' ESCAPE '\\'
  AND u.id NOT LIKE 'seed\\_%' ESCAPE '\\'
  AND u.username_lower NOT LIKE 'polish\\_%' ESCAPE '\\')`;

function humanSeat(col: string): string {
  return `(${col} IS NOT NULL AND ${col} NOT LIKE 'hp\\_%' ESCAPE '\\' AND ${col} NOT LIKE 'seed\\_%' ESCAPE '\\')`;
}

export type ArchiveQuery = <T>(sql: string, params: unknown[]) => Promise<T[]>;

/** Archive reads: Postgres through Hyperdrive when bound (where finished games
 *  are written), otherwise the D1 games table. */
export function archiveQueryFor(env: DailyJobEnv): ArchiveQuery {
  return async <T,>(sql: string, params: unknown[]): Promise<T[]> => {
    if (env.HYPERDRIVE) {
      const { default: postgres } = await import("postgres");
      const client = postgres(env.HYPERDRIVE.connectionString, { max: 1, fetch_types: false, connect_timeout: 5 });
      try {
        let i = 0;
        const rows = await client.unsafe(sql.replace(/\?/g, () => `$${++i}`), params as never[]);
        return rows as unknown as T[];
      } finally {
        await client.end({ timeout: 5 }).catch(() => {});
      }
    }
    const res = await env.DB.prepare(sql).bind(...params).all<T>();
    return res.results ?? [];
  };
}

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

function contactFor(env: DailyJobEnv): string {
  const raw = env.EMAIL_CONTACT?.trim() || env.EMAIL_REPLY_TO?.trim() || env.EMAIL_FROM?.trim() || "";
  const m = /<([^>]+)>/.exec(raw);
  return (m ? m[1] : raw) || `${SITE_URL}/contact`;
}

/** Claims a send key. True when this caller now owns the send. */
async function claim(db: D1Database, key: string, kind: string, userId: string | null, now: number): Promise<boolean> {
  const res = await db
    .prepare(`INSERT OR IGNORE INTO email_sends (send_key, kind, user_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)`)
    .bind(key, kind, userId, now)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

async function markSent(db: D1Database, key: string, providerId: string | null, now: number): Promise<void> {
  await db
    .prepare(`UPDATE email_sends SET status = 'sent', sent_at = ?, provider_id = ?, error = NULL WHERE send_key = ?`)
    .bind(now, providerId, key)
    .run();
}

async function release(db: D1Database, key: string): Promise<void> {
  await db.prepare(`DELETE FROM email_sends WHERE send_key = ? AND status = 'pending'`).bind(key).run();
}

async function markFailed(db: D1Database, key: string, error: string): Promise<void> {
  await db.prepare(`UPDATE email_sends SET status = 'failed', error = ? WHERE send_key = ?`).bind(error.slice(0, 300), key).run();
}

export async function runDailyJob(env: DailyJobEnv, opts: DailyJobOptions = {}): Promise<DailyJobReport> {
  const now = opts.now ?? Date.now();
  const log = opts.log ?? console;
  const provider = opts.provider ?? emailProviderFromEnv(env, { log });
  const siteUrl = (opts.siteUrl ?? SITE_URL).replace(/\/$/, "");
  const db = env.DB;
  await ensureEmailSchema(db);

  const out: DailyJobReport = {
    ranAt: now,
    welcome: { status: "skipped", candidates: 0, sent: 0, failed: 0, alreadyClaimed: 0 },
    report: { status: "skipped", recipients: 0 },
  };

  // ------------------------------------------------------------ welcome
  const mailing = env.EMAIL_MAILING_ADDRESS?.trim();
  const secret = env.EMAIL_UNSUBSCRIBE_SECRET?.trim();
  if (!provider.enabled) out.welcome.reason = provider.disabledReason ?? "email provider not configured";
  else if (!mailing) out.welcome.reason = "EMAIL_MAILING_ADDRESS is not set (CASL)";
  else if (!secret) out.welcome.reason = "EMAIL_UNSUBSCRIBE_SECRET is not set (no working unsubscribe)";
  else {
    const rows =
      (
        await db
          .prepare(
            `SELECT u.id, u.username, u.email FROM users u
              WHERE u.is_guest = 0
                AND u.email IS NOT NULL AND u.email <> ''
                AND u.email_opt_out = 0
                AND u.registered_at >= ?
                AND (u.banned_until IS NULL OR u.banned_until < ?)
                AND ${HUMAN_USER}
                AND NOT EXISTS (SELECT 1 FROM email_sends s WHERE s.send_key = 'welcome:' || u.id)
              ORDER BY u.registered_at ASC
              LIMIT ?`,
          )
          .bind(now - WELCOME_WINDOW_MS, now, WELCOME_MAX_PER_RUN)
          .all<{ id: string; username: string; email: string }>()
      ).results ?? [];
    out.welcome.status = "sent";
    out.welcome.candidates = rows.length;
    const contact = contactFor(env);
    for (const row of rows) {
      const key = `welcome:${row.id}`;
      if (!(await claim(db, key, "welcome", row.id, now))) {
        out.welcome.alreadyClaimed++;
        continue;
      }
      // Re-read the opt-out after claiming: a player who unsubscribed from the
      // settings page a moment ago must not get the email.
      const fresh = await db
        .prepare(`SELECT email, email_opt_out FROM users WHERE id = ?`)
        .bind(row.id)
        .first<{ email: string | null; email_opt_out: number }>();
      if (!fresh?.email || fresh.email_opt_out) {
        await db.prepare(`UPDATE email_sends SET status = 'skipped', error = 'opted out' WHERE send_key = ?`).bind(key).run();
        continue;
      }
      const unsub = await unsubscribeUrl(siteUrl, secret, row.id);
      const email = renderWelcomeEmail({
        username: row.username,
        siteUrl,
        footer: {
          reason: `You got this because you just made the Nerf Chess account ${row.username}. It is the only email we send unless you ask for more.`,
          mailingAddress: mailing,
          contact,
          unsubscribeUrl: unsub,
          settingsUrl: `${siteUrl}/settings`,
        },
      });
      const res = await provider.send({
        to: [fresh.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: listUnsubscribeHeaders(unsub),
        idempotencyKey: key,
      });
      if (res.ok) {
        await markSent(db, key, res.id, Date.now());
        out.welcome.sent++;
      } else {
        out.welcome.failed++;
        const why = res.skipped ? res.reason : res.error;
        log.warn(`[daily] welcome to ${row.id} failed: ${why}`);
        // A transient failure is released so the next run retries (inside the
        // window); a permanent one (bad address) is kept so it never repeats.
        if (!res.skipped && !res.retryable) await markFailed(db, key, why);
        else await release(db, key);
      }
      await sleep(opts.sendGapMs ?? 600);
    }
  }

  // ----------------------------------------------------- founders' report
  const recipients = parseAddressList(env.FOUNDER_REPORT_EMAILS);
  out.report.recipients = recipients.length;
  const dateLabel = new Date(now).toISOString().slice(0, 10);
  if (!provider.enabled) out.report.reason = provider.disabledReason ?? "email provider not configured";
  else if (recipients.length === 0) out.report.reason = "FOUNDER_REPORT_EMAILS is not set";
  else {
    const key = `report:${dateLabel}`;
    if (!(await claim(db, key, "report", null, now))) {
      out.report.status = "already-sent";
    } else {
      try {
        const data = await collectReport(env, now, opts.archive ?? archiveQueryFor(env), out, log);
        const email = renderFounderReport({
          dateLabel,
          siteUrl,
          ...data,
          footer: {
            reason: "Internal daily report for the Nerf Chess founders. Recipients are set by FOUNDER_REPORT_EMAILS.",
            mailingAddress: mailing || "mailing address not set",
            contact: contactFor(env),
          },
        });
        const res = await provider.send({
          to: recipients,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey: key,
        });
        if (res.ok) {
          await markSent(db, key, res.id, Date.now());
          out.report.status = "sent";
        } else {
          out.report.status = "failed";
          out.report.reason = res.skipped ? res.reason : res.error;
          await release(db, key);
        }
      } catch (err) {
        out.report.status = "failed";
        out.report.reason = err instanceof Error ? err.message : String(err);
        await release(db, key);
      }
    }
  }

  log.log(`[daily] ${JSON.stringify(out)}`);
  return out;
}

type CountRow = { n: number | string | null };
const num = (r: CountRow | null | undefined) => Number(r?.n ?? 0) || 0;

async function collectReport(
  env: DailyJobEnv,
  now: number,
  archive: ArchiveQuery,
  run: DailyJobReport,
  log: EmailLog,
) {
  const db = env.DB;
  const since = now - DAY_MS;
  const first = <T,>(sql: string, ...params: unknown[]) => db.prepare(sql).bind(...params).first<T>();
  const problems: string[] = [];

  const signupRows =
    (
      await db
        .prepare(
          `SELECT u.username FROM users u WHERE u.is_guest = 0 AND u.registered_at >= ? AND ${HUMAN_USER}
            ORDER BY u.registered_at ASC`,
        )
        .bind(since)
        .all<{ username: string }>()
    ).results ?? [];
  const shown = signupRows.slice(0, 50).map((r) => r.username);

  const [registered, guests, guestsNew, withEmail, optedOut, seen, seenRegistered, openReports, flagged] =
    await Promise.all([
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.is_guest = 0 AND ${HUMAN_USER}`),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.is_guest = 1`),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.is_guest = 1 AND u.created_at >= ?`, since),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.is_guest = 0 AND u.email IS NOT NULL AND u.email <> '' AND ${HUMAN_USER}`),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.email_opt_out = 1`),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.last_seen_at >= ? AND ${HUMAN_USER}`, since),
      first<CountRow>(`SELECT COUNT(*) AS n FROM users u WHERE u.is_guest = 0 AND u.last_seen_at >= ? AND ${HUMAN_USER}`, since),
      first<CountRow>(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`),
      first<CountRow>(`SELECT COUNT(*) AS n FROM chat_flags WHERE reviewed = 0`).catch(() => null),
    ]);

  let games: ReportRow[] = [];
  try {
    const [all, humans, active] = await Promise.all([
      archive<CountRow>(`SELECT COUNT(*) AS n FROM games WHERE completed_at >= ?`, [since]),
      archive<CountRow>(
        `SELECT COUNT(*) AS n FROM games WHERE completed_at >= ? AND (${humanSeat("white_user_id")} OR ${humanSeat("black_user_id")})`,
        [since],
      ),
      archive<CountRow>(
        `SELECT COUNT(DISTINCT uid) AS n FROM (
           SELECT white_user_id AS uid FROM games WHERE completed_at >= ? AND ${humanSeat("white_user_id")}
           UNION ALL
           SELECT black_user_id AS uid FROM games WHERE completed_at >= ? AND ${humanSeat("black_user_id")}
         ) seats`,
        [since, since],
      ),
    ]);
    games = [
      { label: "Games finished", value: num(all[0]), note: "all archived online games, house filler included" },
      { label: "Games with a human player", value: num(humans[0]) },
      { label: "Daily active players", value: num(active[0]), note: "accounts that finished a game in the last 24 hours" },
    ];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`[daily] archive query failed: ${msg}`);
    problems.push(`Game archive could not be read: ${msg.slice(0, 160)}`);
  }

  const failedSends = await first<CountRow>(`SELECT COUNT(*) AS n FROM email_sends WHERE status = 'failed' AND created_at >= ?`, since);
  if (run.welcome.failed) problems.push(`${run.welcome.failed} welcome emails failed to send this run (they retry tomorrow unless the address was refused).`);
  if (num(failedSends)) problems.push(`${num(failedSends)} emails were refused by the provider in the last 24 hours.`);
  if (run.welcome.status === "skipped" && run.welcome.reason) problems.push(`Welcome emails are off: ${run.welcome.reason}.`);
  problems.push("Error counts from the logs are not collected yet (proposal P-err-count); check Workers Logs.");

  return {
    newSignups: { count: signupRows.length, usernames: shown, more: Math.max(0, signupRows.length - shown.length) },
    sections: [
      {
        title: "Players",
        rows: [
          { label: "Seen on the site", value: num(seen), note: "accounts with a visit in the last 24 hours, guests included" },
          { label: "Registered accounts seen", value: num(seenRegistered) },
          ...games.filter((g) => g.label === "Daily active players"),
          { label: "New guests", value: num(guestsNew) },
        ],
      },
      { title: "Games", rows: games.filter((g) => g.label !== "Daily active players") },
      {
        title: "Totals",
        rows: [
          { label: "Registered accounts", value: num(registered), note: "house bots and test accounts left out" },
          { label: "With an email address", value: num(withEmail) },
          { label: "Opted out of email", value: num(optedOut) },
          { label: "Guest accounts", value: num(guests) },
        ],
      },
      {
        title: "Moderation",
        rows: [
          { label: "Open reports", value: num(openReports) },
          ...(flagged ? [{ label: "Unreviewed chat flags", value: num(flagged) }] : []),
        ],
      },
    ],
    problems,
  };
}
