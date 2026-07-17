import type { Metadata } from "next";
import { PlaysGallery } from "./PlaysGallery";

export const metadata: Metadata = { title: "Play signatures — dev gallery", robots: { index: false } };

export default function DevPlaysPage() {
  return <PlaysGallery />;
}
