// Dev-only harness for the board-wide splash (BoardSplash): pushes fabricated
// "Against you" rows so the queue, its timing and its motion-off state can be
// driven and filmed without waiting for an opponent to land a constraint.
// Hidden in production unless NEXT_PUBLIC_FX_GALLERY is "1" (same gate as the
// other galleries).

import { notFound } from "next/navigation";
import { SplashHarness } from "./SplashHarness";

export const dynamic = "force-dynamic";

export default function SplashHarnessPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <SplashHarness />;
}
