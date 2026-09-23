// The messages the Google sign-in routes may send back to /login as
// ?oauthError=. The page only ever shows one of these: any other value is
// replaced with the generic one, so a crafted link cannot put arbitrary text
// ("your account is locked, call ...") inside the sign-in form.

export const OAUTH_ERRORS = {
  notSetUp: "Google sign-in is not set up on this server.",
  expired: "Google sign-in expired. Please try again.",
  cancelled: "Google sign-in was cancelled.",
  failed: "Google sign-in failed. Please try again.",
  emailTaken:
    "That Google email already belongs to an account. Sign in with its password, then use Google sign-in to link it.",
  conflict: "Google sign-in hit a conflict. Please try again.",
  closed: "This account has been closed by moderation.",
} as const;

const KNOWN = new Set<string>(Object.values(OAUTH_ERRORS));

export function oauthErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return KNOWN.has(raw) ? raw : OAUTH_ERRORS.failed;
}
