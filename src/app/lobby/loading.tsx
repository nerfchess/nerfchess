// Route skeleton for /lobby (client navigation): the same lobby skeleton the
// page's Suspense boundary paints on a hard load, under the header skeleton.
// One component for both, laid out like the lobby's first client render, so
// the page chunk swaps in without anything jumping.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { LobbySkeletonBody } from "./LobbySkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <SkeletonHeader />
      <LobbySkeletonBody />
    </main>
  );
}
