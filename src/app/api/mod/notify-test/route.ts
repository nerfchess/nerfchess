import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { modWebhookConfigured, notifyModEvent } from "@/lib/server/modWebhook";

export const dynamic = "force-dynamic";

// GET: is a mod webhook configured? Lets /mod show whether notifications are
// wired up without exposing the URL itself (it is a write endpoint, and a mod
// panel is not a place to leak one).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({ configured: modWebhookConfigured() });
}

// POST: fire one test event at the webhook so a moderator can confirm the sheet
// is receiving rows without having to ban somebody to find out.
//
// Deliberately reports only whether the POST was SCHEDULED, not whether Google
// accepted it: the send runs through ctx.waitUntil precisely so no moderator
// action ever waits on a third party, and that means the result is not available
// by the time this responds. The moderator checks the spreadsheet, which is the
// only end-to-end proof that matters anyway.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  if (!modWebhookConfigured()) {
    return NextResponse.json(
      { error: "No webhook configured. Set MOD_WEBHOOK_URL (see docs/mod-notifications.md)." },
      { status: 400 },
    );
  }
  notifyModEvent({
    kind: "test",
    actor: guard.mod.username,
    detail: "Test event from the mod panel. If you can read this in the sheet, it works.",
  });
  return NextResponse.json({ sent: true });
}
