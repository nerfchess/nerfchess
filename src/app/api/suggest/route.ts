import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { apiError, clientIp, guardJsonWrite, rateLimit, tooManyRequests } from "@/lib/server/request";
import { cleanText, codePointLength, TEXT_POLICIES } from "@/lib/textInput";
import { sendSuggestionEmail, type SuggestionEmailEnv } from "@/lib/server/suggestEmail";

export const dynamic = "force-dynamic";

// Every submitter, signed in or not, is metered per client IP first (F057):
// the per-account daily cap below never applied to anonymous posts, so a loop
// could fill rule_suggestions without limit.
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_WINDOW_MAX = 10;
const ACCOUNT_DAILY_MAX = 12;

// Accepts a nerf or buff suggestion, stores it in D1, and, when an email
// provider is configured, forwards it to the site owner through the shared
// email module (src/lib/server/suggestEmail.ts). Set two worker secrets/vars
// to enable email delivery:
//   RESEND_API_KEY     an API key from https://resend.com
//   SUGGESTIONS_EMAIL  the inbox that should receive suggestions
// EMAIL_FROM, when set, is the sender; otherwise Resend's sandbox sender.
// Without them the suggestion is still saved in the rule_suggestions table.
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;

  const name = cleanText(body.name, TEXT_POLICIES.suggestionName);
  // Cleaned one character past the cap so an over-long description is
  // refused with a message rather than silently cut.
  const description = cleanText(body.description, {
    ...TEXT_POLICIES.suggestionDescription,
    maxChars: TEXT_POLICIES.suggestionDescription.maxChars + 1,
  });
  const contact = cleanText(body.contact, TEXT_POLICIES.suggestionContact);
  // What kind of card the idea is. Legacy clients that send no kind are nerf
  // suggestions; the pool only means something for buff ideas ('buff' = Buff
  // mode draft card, 'boon' = Nerf-mode relief boon). Hexes (Nerf-mode curses)
  // are their own kind and carry no pool.
  const kind = body.kind === "buff" ? "buff" : body.kind === "hex" ? "hex" : "nerf";
  const pool = kind === "buff" ? (body.pool === "boon" ? "boon" : "buff") : null;
  const descriptionLength = codePointLength(description);
  if (descriptionLength < 10) {
    return apiError(400, "Describe the rule in at least a sentence.");
  }
  if (descriptionLength > TEXT_POLICIES.suggestionDescription.maxChars) {
    return apiError(400, "Keep the description under 1000 characters.");
  }

  const db = await getDb();
  const ip = clientIp(request);
  const perIp = await rateLimit(db, `suggest:ip:${ip ?? "unknown"}`, IP_WINDOW_MAX, IP_WINDOW_MS);
  if (!perIp.ok) {
    return tooManyRequests("You have sent a lot of suggestions. Please try again later.", perIp.retryAfterSec);
  }
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("Cookie")));

  // Per-account daily cap on top of the IP meter, so one account cannot
  // spread a flood across addresses.
  if (user) {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await db
      .prepare("SELECT COUNT(*) AS n FROM rule_suggestions WHERE user_id = ? AND created_at > ?")
      .bind(user.id, dayAgo)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= ACCOUNT_DAILY_MAX) {
      return apiError(429, "You have sent a lot of suggestions today. Please try again tomorrow.");
    }
  }

  const fallbackName =
    kind === "buff"
      ? pool === "boon"
        ? "Untitled boon"
        : "Untitled buff"
      : kind === "hex"
        ? "Untitled hex"
        : "Untitled nerf";
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO rule_suggestions (id, name, description, contact, user_id, username, created_at, kind, pool)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      name || fallbackName,
      description,
      contact || null,
      user?.id ?? null,
      user?.username ?? null,
      Date.now(),
      kind,
      pool,
    )
    .run();

  // Best-effort email; a provider outage must not lose the suggestion. Only
  // registered accounts trigger an email (F057). Anonymous and guest
  // submissions are saved to the table but never send mail: a guest is one
  // POST away (30 per 15 minutes per IP), so counting guests as accounts
  // would let a loop burn the Resend quota.
  let emailed = false;
  if (user && !user.is_guest) {
    try {
      const { env } = getCloudflareContext();
      const res = await sendSuggestionEmail(env as SuggestionEmailEnv, {
        kind,
        pool,
        name: name || fallbackName,
        description,
        contact,
        username: user.username,
      });
      emailed = res.ok;
    } catch {}
  }

  return NextResponse.json({ ok: true, emailed });
}
