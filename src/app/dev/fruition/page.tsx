// Dev-only gallery for the fx-event layers: fruition pulses (clamp / receive /
// ward / expire / frame), the nerf heartbeat, and the clock-raid choreography,
// all triggerable by hand on a mini board with two fake clock pills. Hidden in
// production unless NEXT_PUBLIC_FX_GALLERY is "1".

import { notFound } from "next/navigation";
import FruitionGallery from "./FruitionGallery";

export const dynamic = "force-dynamic";

export default function FruitionGalleryPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FX_GALLERY === "1";
  if (!enabled) notFound();
  return <FruitionGallery />;
}
