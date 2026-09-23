import type { Metadata } from "next";
import Link from "next/link";
import { inviteMeta } from "@/lib/seoDynamic";
import { inviteSummary, INVITE_CODE_RE } from "@/lib/server/ogData";
import { InviteForward } from "./InviteForward";

// The shareable invite link (F239): nerfchess.com/c/<code>. A friend-game code
// used to travel as /friend?code=, and a query string can never carry its own
// preview, so a pasted invite unfurled as the generic lobby. This route owns
// its metadata ("Joseph challenged you to Nerf Chess, 5+3") and its preview
// card (./opengraph-image.tsx), then forwards a person to the same join flow
// /friend?code= always led to.
export async function generateMetadata(props: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await props.params;
  return inviteMeta(code);
}

function cleanCode(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {}
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export default async function InvitePage(props: { params: Promise<{ code: string }> }) {
  const { code: raw } = await props.params;
  const code = cleanCode(raw);
  const href = INVITE_CODE_RE.test(code) ? `/lobby?tab=friends&code=${encodeURIComponent(code)}` : "/lobby?tab=friends";
  const invite = INVITE_CODE_RE.test(code) ? await inviteSummary(code) : null;
  const heading = invite?.from ? `${invite.from} challenged you to Nerf Chess` : "You are invited to a game of Nerf Chess";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <InviteForward href={href} />
      <div className="text-center">
        <h1 className="text-[15px] font-semibold text-parchment-100">{heading}</h1>
        <p className="mt-2 text-[13px] text-parchment-400">
          Opening the invite.{" "}
          <Link href={href} className="text-gold-leaf hover:underline">
            Open it now
          </Link>
        </p>
      </div>
    </main>
  );
}
