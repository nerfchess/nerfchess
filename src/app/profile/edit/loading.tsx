// Route skeleton for /profile/edit: the back control beside the title, then
// the same four sections the page draws while the account loads
// (EditProfileSections), so the route skeleton, the page's in-flight state
// and the settled form are one geometry (F012).

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { EditProfileSections } from "./EditProfileSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <section className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="skeleton h-[44px] w-[44px] shrink-0" />
          <h1 className="page-title">Edit profile</h1>
        </div>
        <EditProfileSections />
      </section>
    </main>
  );
}
