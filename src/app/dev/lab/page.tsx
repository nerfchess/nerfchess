// Dev-only Card Laboratory: verify every card individually against a real
// sandbox engine (grant, activate with targeting, force drafts, lifecycle
// state, run-all diagnostic). Never linked from production navigation; hidden
// in production unless the NEXT_PUBLIC_FX_GALLERY flag is set to "1", the
// same gate as /dev/effects.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabHarness } from "./LabHarness";

export const metadata: Metadata = { title: "Card laboratory (dev)", robots: { index: false } };

export const dynamic = "force-dynamic";

export default function DevLabPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <LabHarness />;
}
