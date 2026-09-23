// Route skeleton for /play (client navigation): the page's own static intro
// (title, tour note, Play online door) above the setup card's skeleton, the
// same card skeleton the page's Suspense boundary shows on a hard load. Both
// halves are the components the page renders, so nothing moves when the page
// chunk swaps in.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { PlayIntro } from "./PlayIntro";
import { BotSetupSkeleton } from "./PlaySkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <section className="mx-auto max-w-2xl px-6 py-5">
        <PlayIntro />
        <BotSetupSkeleton />
      </section>
    </main>
  );
}
