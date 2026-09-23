// Cross-site refusal for the auth writes (F046, SECURITY).
//
// The session cookie is SameSite=Lax, and login, register and guest do not
// need a cookie at all to set one, so a page on another site could sign a
// visitor into an attacker's account with a plain form POST (login CSRF), or
// sign them out. Browsers label every request with Sec-Fetch-Site and send
// Origin on every POST, so a forged one is recognisable. Requests with
// neither header are not from a browser (scripts, tests) and carry no ambient
// cookie to abuse, so they pass.
//
// The same rule as assertSameOrigin in slice F's src/lib/server/request.ts;
// kept local to the auth routes until that module lands, then these routes
// should switch to it (REQUESTS in docs/polish-pass/slices/A.md).

import { NextResponse } from "next/server";

export function refuseCrossSite(request: Request): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site) {
    if (site === "same-origin" || site === "same-site" || site === "none") return null;
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  let originHost = "";
  try {
    originHost = origin === "null" ? "" : new URL(origin).host.toLowerCase();
  } catch {}
  const hosts = new Set<string>();
  const hostHeader = request.headers.get("host");
  if (hostHeader) hosts.add(hostHeader.toLowerCase());
  try {
    hosts.add(new URL(request.url).host.toLowerCase());
  } catch {}
  if (originHost && hosts.has(originHost)) return null;
  return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
}
