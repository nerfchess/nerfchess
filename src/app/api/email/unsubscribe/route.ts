import { getDb, getEnvVar } from "@/lib/server/db";
import { unsubscribeWithToken } from "@/lib/server/emailPrefs";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { DARK, LIGHT, escapeHtml } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// One-click unsubscribe (brief 17.3, CASL, RFC 8058).
//
//   GET  /api/email/unsubscribe?u=<user id>&t=<token>   confirmation page with one button
//   POST /api/email/unsubscribe?u=...&t=...              unsubscribes (the button, or the
//                                                        mail client's List-Unsubscribe-Post)
//
// GET never changes anything, because link scanners and mail previews fetch
// links on their own; the mail client's one-click POST and the page's button
// both land on POST. The signed token is the only credential (no session
// cookie is needed or read), so the POST is deliberately not same-origin
// checked: a mail provider sends it from its own servers.

function params(url: URL, form?: URLSearchParams): { u: string; t: string } {
  return {
    u: (url.searchParams.get("u") ?? form?.get("u") ?? "").slice(0, 128),
    t: (url.searchParams.get("t") ?? form?.get("t") ?? "").slice(0, 128),
  };
}

function page(title: string, bodyHtml: string, status = 200): Response {
  const l = LIGHT;
  const d = DARK;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(title)} · Nerf Chess</title>
<style>
body { margin: 0; background: ${d.page}; color: ${d.text}; font: 400 15px/1.55 "Noto Sans", -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
main { max-width: 440px; margin: 64px auto; padding: 0 16px; }
.box { background: ${d.panel}; border: 1px solid ${d.border}; border-radius: 7px; padding: 24px; }
h1 { margin: 0 0 12px; font-size: 20px; line-height: 1.3; color: ${d.heading}; }
p { margin: 0 0 14px; }
.brand { margin: 0 0 12px; font-weight: 700; color: ${d.heading}; }
a { color: ${d.accent}; }
button { font-family: inherit; font-weight: 600; font-size: 15px; line-height: 1.2; color: ${d.onAccent}; background: ${d.accent}; border: 0; border-radius: 3px; padding: 10px 18px; cursor: pointer; }
.muted { color: ${d.muted}; font-size: 13px; margin: 0; }
@media (prefers-color-scheme: light) {
  body { background: ${l.page}; color: ${l.text}; }
  .box { background: ${l.panel}; border-color: ${l.border}; }
  h1, .brand { color: ${l.heading}; }
  .muted { color: ${l.muted}; }
}
</style></head>
<body><main><p class="brand">Nerf Chess</p><div class="box">${bodyHtml}</div></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

const INVALID = () =>
  page(
    "Link not valid",
    `<h1>This link does not work</h1><p>It may have been copied only in part. You can turn email off in <a href="/settings">settings</a> instead.</p>`,
    400,
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { u, t } = params(url);
  const secret = getEnvVar("EMAIL_UNSUBSCRIBE_SECRET")?.trim();
  if (!secret || !(await verifyUnsubscribeToken(secret, u, t))) return INVALID();
  const action = `/api/email/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`;
  return page(
    "Unsubscribe",
    `<h1>Stop emails from Nerf Chess?</h1>
<p>You will not get any more email from us. Your account stays as it is.</p>
<form method="post" action="${escapeHtml(action)}"><p><button type="submit">Unsubscribe</button></p></form>
<p class="muted">Changed your mind later? Turn email back on in <a href="/settings">settings</a>.</p>`,
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let form: URLSearchParams | undefined;
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded")) {
    const raw = await request.text().catch(() => "");
    if (raw.length <= 2048) form = new URLSearchParams(raw);
  }
  const { u, t } = params(url, form);
  const db = await getDb();
  const outcome = await unsubscribeWithToken(db, getEnvVar("EMAIL_UNSUBSCRIBE_SECRET")?.trim(), u, t);
  if (outcome !== "unsubscribed") return INVALID();
  return page(
    "Unsubscribed",
    `<h1>You are unsubscribed</h1><p>We will not email you again. To turn email back on, use <a href="/settings">settings</a>.</p><p class="muted"><a href="/">Back to Nerf Chess</a></p>`,
  );
}
