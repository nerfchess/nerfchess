import type { Metadata } from "next";
import { ChestGallery } from "./ChestGallery";

export const metadata: Metadata = { title: "Treasure chests — dev gallery", robots: { index: false } };

export default function DevChestPage() {
  return <ChestGallery />;
}
