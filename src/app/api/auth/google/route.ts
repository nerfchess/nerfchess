import { NextResponse } from "next/server";
import { getEnvVar, requestIsSecure } from "@/lib/server/db";
import { OAUTH_STATE_COOKIE } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Kicks off Google sign-in: redirects to Google's consent screen with a
// random state value stored in a short-lived cookie (CSRF protection for the
// OAuth round trip). Requires the GOOGLE_CLIENT_ID var and the
// GOOGLE_CLIENT_SECRET secret; see docs/google-sign-in.md.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = getEnvVar("GOOGLE_CLIENT_ID");
  if (!clientId || !getEnvVar("GOOGLE_CLIENT_SECRET")) {
    return NextResponse.redirect(
      new URL(`/login?oauthError=${encodeURIComponent("Google sign-in is not set up on this server.")}`, url.origin),
    );
  }

  // Where to land after sign-in: same-site paths only (no open redirects).
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = [...stateBytes].map((b) => b.toString(16).padStart(2, "0")).join("");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${url.origin}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  const secure = requestIsSecure(request) ? "; Secure" : "";
  response.headers.set(
    "Set-Cookie",
    `${OAUTH_STATE_COOKIE}=${state}:${encodeURIComponent(next)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
  );
  return response;
}
