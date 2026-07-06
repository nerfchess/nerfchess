import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Accepts a nerf or buff suggestion, stores it in D1, and, when an email
// provider is configured, forwards it to the site owner. Set two worker
// secrets/vars to enable email delivery:
//   RESEND_API_KEY     an API key from https://resend.com
//   SUGGESTIONS_EMAIL  the inbox that should receive suggestions
// Without them the suggestion is still saved in the rule_suggestions table.
export async function POST(request: Request) {
  let body: {
    name?: unknown;
    description?: unknown;
    contact?: unknown;
    kind?: unknown;
    pool?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 120) : "";
  // What kind of card the idea is. Legacy clients that send no kind are nerf
  // suggestions; the pool only means something for buff ideas ('buff' = Buff
  // mode draft card, 'boon' = Nerf-mode relief boon). Hexes (Nerf-mode curses)
  // are their own kind and carry no pool.
  const kind = body.kind === "buff" ? "buff" : body.kind === "hex" ? "hex" : "nerf";
  const pool = kind === "buff" ? (body.pool === "boon" ? "boon" : "buff") : null;
  if (description.length < 10) {
    return NextResponse.json(
      { error: "Describe the rule in at least a sentence." },
      { status: 400 },
    );
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: "Keep the description under 1000 characters." }, { status: 400 });
  }

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("Cookie")));

  // Throttle: without this the endpoint can be flooded, spamming the
  // rule_suggestions table and burning the outbound email quota (unlike
  // /api/report, which caps 5/day). Cap any session-bearing submitter at a
  // sane daily rate. Anonymous submissions are still accepted and saved, but
  // (below) they do not trigger an outbound email, so the Resend quota cannot
  // be burned by a loop of anonymous POSTs.
  if (user) {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = await db
      .prepare("SELECT COUNT(*) AS n FROM rule_suggestions WHERE user_id = ? AND created_at > ?")
      .bind(user.id, dayAgo)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= 12) {
      return NextResponse.json(
        { error: "You have sent a lot of suggestions today. Please try again tomorrow." },
        { status: 429 },
      );
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

  // Best-effort email; a provider outage must not lose the suggestion.
  let emailed = false;
  try {
    const { env } = getCloudflareContext();
    const apiKey = (env as { RESEND_API_KEY?: string }).RESEND_API_KEY;
    const to = (env as { SUGGESTIONS_EMAIL?: string }).SUGGESTIONS_EMAIL;
    // Only email for session-bearing submitters (throttled above). Anonymous
    // submissions are saved to the table but never trigger outbound email, so a
    // loop of anonymous POSTs cannot burn the Resend quota.
    if (apiKey && to && user) {
      const kindLabel =
        kind === "buff"
          ? pool === "boon"
            ? "Boon (Nerf-mode relief)"
            : "Buff (Buff mode card)"
          : kind === "hex"
            ? "Hex (Nerf-mode curse)"
            : "Nerf";
      const lines = [
        `${kindLabel}: ${name || fallbackName}`,
        "",
        description,
        "",
        `From: ${user?.username ?? "anonymous"}${contact ? ` (${contact})` : ""}`,
      ];
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "NerfChess <onboarding@resend.dev>",
          to: [to],
          subject: `${
            kind === "buff" ? (pool === "boon" ? "Boon" : "Buff") : kind === "hex" ? "Hex" : "Nerf"
          } suggestion: ${name || fallbackName}`,
          text: lines.join("\n"),
        }),
      });
      emailed = res.ok;
    }
  } catch {}

  return NextResponse.json({ ok: true, emailed });
}
