// Dev-only harness for the buff-draft overlay: opens the real component with a
// fabricated offer so its layout can be eyeballed and screenshotted without
// playing five moves of a live game. Hidden in production unless the
// NEXT_PUBLIC_FX_GALLERY flag is set to "1" (same gate as the other galleries).

import { notFound } from "next/navigation";
import { DraftGallery } from "./DraftGallery";

export const dynamic = "force-dynamic";

export default function DraftGalleryPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <DraftGallery />;
}
