// Cloudflare Turnstile server-side verification for the signup form.
//
// The frontend renders the widget with NEXT_PUBLIC_TURNSTILE_SITEKEY and sends
// the resulting token to the register route, which calls siteverify here with
// the matching secret. Leave TURNSTILE_SECRET_KEY unset to disable the check
// (same "empty to disable" convention as Google sign-in).

import { getEnvVar } from "./db";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Whether Turnstile is configured on this deployment. */
export function turnstileEnabled(): boolean {
  return Boolean(getEnvVar("TURNSTILE_SECRET_KEY"));
}

/**
 * Verifies a Turnstile token against Cloudflare siteverify. Returns true when
 * the token is valid, or when Turnstile is not configured (check disabled).
 */
export async function verifyTurnstile(token: string, remoteIp?: string | null): Promise<boolean> {
  const secret = getEnvVar("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not configured -> nothing to enforce
  if (!token) return false;

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
