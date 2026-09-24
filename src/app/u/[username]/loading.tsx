// Route skeleton for /u/[username]: the shared ProfileSkeleton (F021), the
// same picture the page's own fallback and in-flight state draw, built from
// the real shell's grid, rail and plate.
//
// heading={false}: the page's own ProfileSkeleton carries the sr-only h1 and
// mounts alongside this fallback on arrival, so a second one here would put
// two headings live at once. The page's heading also covers client-side
// navigation, where this file never renders.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <SkeletonHeader />
      <ProfileSkeleton heading={false} />
    </main>
  );
}
