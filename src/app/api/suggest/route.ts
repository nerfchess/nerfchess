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
  // mode draft card, 'boon' = Nerf-mode relief boon).
  const kind = body.kind === "buff" ? "buff" : "nerf";
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

  const fallbackName = kind === "buff" ? "Untitled buff" : "Untitled nerf";
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
    if (apiKey && to) {
      const kindLabel =
        kind === "buff"
          ? `Buff (${pool === "boon" ? "Nerf-mode boon" : "Buff mode card"})`
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
          subject: `${kind === "buff" ? "Buff" : "Nerf"} suggestion: ${name || fallbackName}`,
          text: lines.join("\n"),
        }),
      });
      emailed = res.ok;
    }
  } catch {}

  return NextResponse.json({ ok: true, emailed });
}
