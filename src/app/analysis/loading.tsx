// Route skeleton for /analysis: the board column (eval bar beside a square
// board and the move-navigation row) with the analysis rail to its right.
//
// The analysis page ships the board, the move list, and the engine bridge, so
// the chunk is one of the heavier ones on the site. Without this the route sat
// on a blank screen and then dropped a full board into it.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { AnalysisBodySkeleton } from "./_components/AnalysisSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <AnalysisBodySkeleton />
    </main>
  );
}
