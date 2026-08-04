// Dev-only treasure-chest gallery. Never linked from production navigation;
// hidden in production unless the NEXT_PUBLIC_FX_GALLERY flag is set to "1",
// the same gate as /dev/lab and /dev/effects.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChestGallery } from "./ChestGallery";

export const metadata: Metadata = { title: "Treasure chests (dev gallery)", robots: { index: false } };

export const dynamic = "force-dynamic";

export default function DevChestPage() {
  const enabled =
    process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <ChestGallery />;
}
