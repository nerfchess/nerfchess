// Outbound notifications for moderator activity: one POST per event to a Google
// Apps Script web app, which appends a row to a spreadsheet.
//
// See docs/mod-notifications.md for the Apps Script to paste and the setup
// steps. Ships DARK: with MOD_WEBHOOK_URL unset every call here is a no-op, the
// same convention HOUSE_ENGINE_REMOTE, ARENA_INGEST_ENABLED and the Resend key
// in /api/suggest already follow.
//
// Three rules, all learned from the Resend call this is modelled on:
//   1. A moderation action must NEVER fail because Google is slow or down. The
//      POST is fired through ctx.waitUntil and wrapped in try/catch, so the
//      mod's request returns as soon as the database write lands.
//   2. It must never hang. Apps Script /exec answers with a 302 to
//      script.googleusercontent.com, which Workers follows, so the round trip is
//      two requests; an AbortSignal timeout bounds the whole thing.
//   3. It must never be the reason an action is not recorded. mod_actions is
//      still the audit trail of record; this is a convenience notification.

import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Wall-clock bound on the whole POST, redirect included. Modelled on the
 * Worker's HOUSE_ENGINE_TIMEOUT_MS: long enough for a cold Apps Script, short
 * enough that a dead endpoint cannot pile up in-flight requests. */
const TIMEOUT_MS = 5_000;

/** What happened. Kept as a small closed set so the spreadsheet's columns stay
 * stable and a sheet formula can filter on it. */
export type ModEventKind =
  // Player sanctions, straight from applyModAction.
  | "warn"
  | "mute"
  | "unmute"
  | "ban"
  | "unban"
  | "set_role"
  | "flag_name"
  | "unflag_name"
  // Queue work.
  | "report_resolved"
  | "report_dismissed"
  | "chat_flag_reviewed"
  // Configuration changes, which no other surface records anywhere.
  | "card_override_saved"
  | "card_override_cleared"
  | "house_toggled"
  | "house_games_pinned"
  | "house_skill_override"
  | "house_persona_edited"
  | "rating_set"
  | "god_panel_toggled"
  // The "Send test event" button in /mod.
  | "test";

export interface ModEvent {
  kind: ModEventKind;
  /** Who did it (username). */
  actor: string;
  /** Who or what it was done to: a username, a card id, a persona name. */
  target?: string;
  /** Free-text detail: the note a mod typed, the value a slider moved to. */
  detail?: string;
  /** Expiry for a timed sanction (ms epoch), when there is one. */
  expiresAt?: number | null;
}

/** True when a webhook is configured. Lets a route skip building an event
 * payload it would only throw away, and lets /mod show whether it is wired up. */
export function modWebhookConfigured(): boolean {
  try {
    const { env } = getCloudflareContext();
    return !!(env as { MOD_WEBHOOK_URL?: string }).MOD_WEBHOOK_URL;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget one mod event at the configured webhook.
 *
 * Never throws and never awaits the network on the caller's behalf: call it and
 * carry on. Returns true when the POST was actually scheduled, which is only
 * useful to the test-event route.
 */
export function notifyModEvent(event: ModEvent): boolean {
  let url: string | undefined;
  let token: string | undefined;
  let waitUntil: ((p: Promise<unknown>) => void) | undefined;
  try {
    const cf = getCloudflareContext();
    const env = cf.env as { MOD_WEBHOOK_URL?: string; MOD_WEBHOOK_TOKEN?: string };
    url = env.MOD_WEBHOOK_URL;
    token = env.MOD_WEBHOOK_TOKEN;
    waitUntil = cf.ctx?.waitUntil?.bind(cf.ctx);
  } catch {
    return false;
  }
  if (!url) return false;

  // The row the sheet appends. `at` is an ISO string so the spreadsheet parses
  // it as a date without a formula, and `ts` keeps the exact epoch for sorting.
  const body = JSON.stringify({
    at: new Date().toISOString(),
    ts: Date.now(),
    kind: event.kind,
    actor: event.actor,
    target: event.target ?? "",
    detail: event.detail ?? "",
    expiresAt: event.expiresAt ?? "",
    // A shared secret the Apps Script can check, so a leaked /exec URL alone is
    // not enough to write junk into the sheet.
    token: token ?? "",
  });

  const send = fetch(url, {
    method: "POST",
    // text/plain, not application/json: an Apps Script doPost receives the raw
    // body in e.postData.contents either way, and text/plain avoids the CORS
    // preflight Google's endpoint does not answer.
    headers: { "content-type": "text/plain;charset=utf-8" },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(
    () => undefined,
    () => undefined, // a dead endpoint is not the moderator's problem
  );

  if (waitUntil) waitUntil(send);
  return true;
}
