// Dev-only harness for the chrome motion primitives and the Tier A components
// slice I owns (board notices, dock rows, eval bars, presence dot, tour
// spotlight): each has a button so a frame strip can film its enter, exit and
// state change at every data-anim setting without playing a game to reach it.
// Hidden in production unless NEXT_PUBLIC_FX_GALLERY is "1" (same gate as the
// other galleries).

import { notFound } from "next/navigation";
import { MotionHarness } from "./MotionHarness";

export const dynamic = "force-dynamic";

export default function MotionHarnessPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <MotionHarness />;
}
