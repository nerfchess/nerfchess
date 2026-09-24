// Preview for an invite link /c/[code], the most shared card on the site:
// "<name> challenged you to Nerf Chess, 5+3", with the mode, stakes and an
// accept button, on a board seen from the invitee's side.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { inviteImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { code: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `An invitation to play Nerf Chess with code ${String(params.code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}` }];
}

export default async function OgImage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  return inviteImage(code);
}
