// Route skeleton for /login: the heading, the Sign in / Register pair, and the
// form plate with two labelled fields and the submit button.
//
// The default tab is Sign in, which is the two-field form, so the skeleton is
// sized to that rather than to the taller Register form. Guessing the larger
// one would leave a gap under the button on the far commoner path.

import { SkeletonHeader } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <section className="mx-auto max-w-md px-6 py-8">
        {/* Heights are the real form's, measured at 360 and 1280 (wave 2
            account 7): the 44px tabs, 18px labels over 44px inputs, the 40px
            submit, the "or" rule and the 45.5px Google link. The plate used
            to stop at the submit, so it grew by about 70px on handover. */}
        <div className="skeleton h-[27px] w-48" />
        <div className="plate mt-6 grid grid-cols-2 gap-1 p-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-[44px]" />
          ))}
        </div>
        <div className="plate mt-4 space-y-4 p-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 flex h-[18px] items-center">
                <div className="skeleton h-3 w-32" />
              </div>
              <div className="skeleton h-[44px] w-full" />
            </div>
          ))}
          <div className="skeleton h-[40px] w-full" />
          <div className="flex h-[18px] items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-[color:var(--bg-raised)]" />
            <span className="text-[12px] text-parchment-400">or</span>
            <div className="h-px flex-1 bg-[color:var(--bg-raised)]" />
          </div>
          <div className="skeleton h-[45.5px] w-full" />
        </div>
      </section>
    </main>
  );
}
