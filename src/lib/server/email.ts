// Email provider layer (brief section 17.1).
//
// One small interface (EmailProvider.send) and one implementation: Resend over
// plain fetch, which works the same in a Next route handler, the worker's
// scheduled() handler and Node test scripts. Nothing here reads
// getCloudflareContext: callers pass the env they already hold, so the daily
// cron (which runs outside any Next request) can use it too (F098).
//
// Dormant by default (integrator decision Q21-Q23): with RESEND_API_KEY or a
// From address missing, emailProviderFromEnv returns a provider that logs one
// line and sends nothing, so no caller has to special-case an unconfigured
// deploy.

export type EmailEnv = {
  RESEND_API_KEY?: string;
  /** Verified From address, for example "Nerf Chess <hello@nerfchess.com>". */
  EMAIL_FROM?: string;
  /** Optional Reply-To (defaults to none, replies go to EMAIL_FROM). */
  EMAIL_REPLY_TO?: string;
};

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Overrides EMAIL_FROM for this message (the suggestion form uses this). */
  from?: string;
  replyTo?: string;
  /** Extra MIME headers, for example List-Unsubscribe. */
  headers?: Record<string, string>;
  /** Sent as Resend's Idempotency-Key, so a retried request cannot mail twice. */
  idempotencyKey?: string;
};

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; status: number | null; error: string; retryable: boolean };

export interface EmailProvider {
  readonly enabled: boolean;
  /** Why a disabled provider sends nothing (for logs and the job report). */
  readonly disabledReason?: string;
  send(message: EmailMessage): Promise<SendResult>;
}

export type EmailLog = Pick<Console, "log" | "warn">;

/** Resend's shared sandbox sender: only delivers to the account owner. */
export const SANDBOX_FROM = "Nerf Chess <onboarding@resend.dev>";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8000;

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

export function isSendableAddress(address: string): boolean {
  return address.length <= 254 && EMAIL_RE.test(address);
}

/** Splits a comma or semicolon separated env list into valid addresses. */
export function parseAddressList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const a = part.trim();
    if (a && isSendableAddress(a) && !out.includes(a.toLowerCase())) out.push(a.toLowerCase());
  }
  return out;
}

/** A provider that never sends; every call reports why. */
export function disabledProvider(reason: string, log: EmailLog = console): EmailProvider {
  let warned = false;
  return {
    enabled: false,
    disabledReason: reason,
    async send(message) {
      if (!warned) {
        warned = true;
        log.warn(`[email] not sent (${reason}): "${message.subject}"`);
      }
      return { ok: false, skipped: true, reason };
    },
  };
}

export function resendProvider(
  opts: { apiKey: string; from: string; replyTo?: string },
  fetchImpl: typeof fetch = fetch,
): EmailProvider {
  return {
    enabled: true,
    async send(message) {
      const to = message.to.filter(isSendableAddress);
      if (to.length === 0) return { ok: false, skipped: true, reason: "no valid recipient" };
      const headers: Record<string, string> = {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      };
      if (message.idempotencyKey) headers["Idempotency-Key"] = message.idempotencyKey.slice(0, 256);
      const replyTo = message.replyTo ?? opts.replyTo;
      const body: Record<string, unknown> = {
        from: message.from ?? opts.from,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      };
      if (replyTo) body.reply_to = replyTo;
      if (message.headers && Object.keys(message.headers).length) body.headers = message.headers;
      let res: Response;
      try {
        res = await fetchImpl(RESEND_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          // A slow provider must not hold a request or the cron open.
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
      } catch (err) {
        return { ok: false, skipped: false, status: null, error: errText(err), retryable: true };
      }
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { id?: unknown } | null;
        return { ok: true, id: typeof data?.id === "string" ? data.id : null };
      }
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        skipped: false,
        status: res.status,
        error: `HTTP ${res.status} ${detail.slice(0, 200)}`.trim(),
        // 429 and 5xx clear up on their own; other 4xx (bad address, bad
        // domain) will fail the same way tomorrow.
        retryable: res.status === 429 || res.status >= 500,
      };
    },
  };
}

/**
 * The provider for this environment: Resend when RESEND_API_KEY and a From
 * address are set, otherwise a logging no-op. `fromFallback` lets a caller that
 * predates EMAIL_FROM (the suggestion form) keep using the sandbox sender.
 */
export function emailProviderFromEnv(
  env: EmailEnv,
  opts: { fromFallback?: string; log?: EmailLog; fetchImpl?: typeof fetch } = {},
): EmailProvider {
  const log = opts.log ?? console;
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim() || opts.fromFallback;
  if (!apiKey) return disabledProvider("RESEND_API_KEY is not set", log);
  if (!from) return disabledProvider("EMAIL_FROM is not set", log);
  return resendProvider({ apiKey, from, replyTo: env.EMAIL_REPLY_TO?.trim() || undefined }, opts.fetchImpl);
}

/** One-shot convenience: build the provider from env and send one message. */
export async function sendEmail(
  env: EmailEnv,
  message: EmailMessage,
  opts: { fromFallback?: string; log?: EmailLog; fetchImpl?: typeof fetch } = {},
): Promise<SendResult> {
  return emailProviderFromEnv(env, opts).send(message);
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.name === "TimeoutError" ? "timed out" : err.message.slice(0, 200);
  return String(err).slice(0, 200);
}
