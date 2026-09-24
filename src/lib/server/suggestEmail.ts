// The owner's copy of a rule suggestion (F100), sent through the shared email
// module so it follows the same provider, timeout, From and dormant-by-default
// rules as every other email: without RESEND_API_KEY it logs and sends nothing.

import { sendEmail, SANDBOX_FROM, type EmailEnv, type EmailLog, type SendResult } from "./email";
import { escapeHtml } from "../email/templates";

export type SuggestionEmailEnv = EmailEnv & { SUGGESTIONS_EMAIL?: string };

export type SuggestionForEmail = {
  kind: "nerf" | "buff" | "hex";
  pool: "buff" | "boon" | null;
  /** The submitted name, or the "Untitled ..." fallback. */
  name: string;
  description: string;
  contact: string;
  username: string;
};

export function suggestionMessage(s: SuggestionForEmail): { subject: string; text: string; html: string } {
  const kindLabel =
    s.kind === "buff"
      ? s.pool === "boon"
        ? "Boon (Nerf-mode relief)"
        : "Buff (Buff mode card)"
      : s.kind === "hex"
        ? "Hex (Nerf-mode curse)"
        : "Nerf";
  const short = s.kind === "buff" ? (s.pool === "boon" ? "Boon" : "Buff") : s.kind === "hex" ? "Hex" : "Nerf";
  const text = [
    `${kindLabel}: ${s.name}`,
    "",
    s.description,
    "",
    `From: ${s.username}${s.contact ? ` (${s.contact})` : ""}`,
  ].join("\n");
  return { subject: `${short} suggestion: ${s.name}`, text, html: `<pre>${escapeHtml(text)}</pre>` };
}

/** Sends the suggestion to SUGGESTIONS_EMAIL. Skipped (never thrown) when the
 *  inbox or the provider is not configured. */
export async function sendSuggestionEmail(
  env: SuggestionEmailEnv,
  s: SuggestionForEmail,
  opts: { log?: EmailLog; fetchImpl?: typeof fetch } = {},
): Promise<SendResult> {
  const to = env.SUGGESTIONS_EMAIL?.trim();
  if (!to) return { ok: false, skipped: true, reason: "SUGGESTIONS_EMAIL is not set" };
  return sendEmail(env, { to: [to], ...suggestionMessage(s) }, { ...opts, fromFallback: SANDBOX_FROM });
}
