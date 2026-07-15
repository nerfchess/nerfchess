// Dev-only gallery of every passive visual, grouped by family, on a local mini
// board (no engine). Controls: spawn / aura / pulse / exit, reduced-motion
// toggle, tier filter, and search. Hidden in production unless the
// NEXT_PUBLIC_FX_GALLERY flag is set to "1".

import { notFound } from "next/navigation";
import EffectsGallery from "./EffectsGallery";

export const dynamic = "force-dynamic";

export default function EffectsGalleryPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <EffectsGallery />;
}
