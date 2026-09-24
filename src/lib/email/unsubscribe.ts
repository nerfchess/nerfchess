// Signed one-click unsubscribe links (brief 17.3, CASL).
//
// The token is HMAC-SHA256("unsub:v1:" + userId) under EMAIL_UNSUBSCRIBE_SECRET,
// base64url encoded. It never expires (CASL wants the link to keep working for
// at least 60 days, and an old email must still be able to opt out) and it only
// grants one thing: turning email off for that one account. Web Crypto only, so
// it runs in the worker, in route handlers and in Node tests.

const PREFIX = "unsub:v1:";

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function unsubscribeToken(secret: string, userId: string): Promise<string> {
  return toBase64Url(await hmac(secret, PREFIX + userId));
}

/** Constant-time check of a token from a link. False for any malformed input. */
export async function verifyUnsubscribeToken(secret: string, userId: string, token: string): Promise<boolean> {
  if (!secret || !userId || !token || token.length > 128 || userId.length > 128) return false;
  const expected = await unsubscribeToken(secret, userId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export async function unsubscribeUrl(siteUrl: string, secret: string, userId: string): Promise<string> {
  const t = await unsubscribeToken(secret, userId);
  return `${siteUrl.replace(/\/$/, "")}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${t}`;
}

/** RFC 2369 and RFC 8058 headers: mail clients show their own unsubscribe
 *  button and POST "List-Unsubscribe=One-Click" to the URL. */
export function listUnsubscribeHeaders(url: string, mailto?: string): Record<string, string> {
  const targets = [`<${url}>`];
  if (mailto) targets.push(`<mailto:${mailto}?subject=unsubscribe>`);
  return {
    "List-Unsubscribe": targets.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
