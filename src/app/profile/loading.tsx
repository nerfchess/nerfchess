// Route skeleton for /profile. The route forwards every account to
// /u/<name>, so it shows the profile skeleton that page shows (F021): the
// hand-off from here to the profile is one picture, not two.

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
