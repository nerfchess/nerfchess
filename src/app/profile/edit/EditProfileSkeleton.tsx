// The /profile/edit form while the account loads (F012).
//
// One picture for both loading paths: the route's loading.tsx draws it under
// the back control and title, and the page draws it in place of the form
// until /api/auth/me answers. The section labels are the real ones and the
// tile rows have the real tile counts, so the rows wrap where the settled
// form's do; the plates carry the same padding as the form.

import { AVATAR_PICKER_IDS } from "@/lib/avatars";
import { FLAIR_EMOJI } from "@/lib/flair";

function Tiles({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="skeleton h-[46px] w-[46px]" />
      ))}
    </div>
  );
}

function HelpLines() {
  return (
    <div className="mt-3 space-y-1.5">
      <span className="skeleton block h-3.5 w-full" />
      <span className="skeleton block h-3.5 w-2/3" />
    </div>
  );
}

export function EditProfileSections() {
  return (
    <div aria-busy="true">
      <div className="mt-8">
        <div className="rule-ornament mb-4">
          <span className="font-display">Profile picture</span>
        </div>
        <div className="plate p-4 sm:p-5">
          <Tiles count={AVATAR_PICKER_IDS.length + 1} />
          <HelpLines />
        </div>
      </div>
      <div className="mt-8">
        <div className="rule-ornament mb-4">
          <span className="font-display">Flair</span>
        </div>
        <div className="plate p-4 sm:p-5">
          <Tiles count={FLAIR_EMOJI.length + 1} />
          <div className="mt-4 flex items-center gap-3 border-t border-[color:var(--edge)] pt-4">
            <span className="skeleton h-[46px] w-[46px] shrink-0" />
            <span className="skeleton block h-3.5 w-2/3" />
          </div>
          <HelpLines />
        </div>
      </div>
      <div className="mt-8">
        <div className="rule-ornament mb-4">
          <span className="font-display">Bio</span>
        </div>
        <div className="plate p-4 sm:p-5">
          <span className="skeleton block h-[60px] w-full" />
          <div className="mt-2 flex items-center">
            <span className="skeleton block h-[40px] w-24" />
          </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="rule-ornament mb-4">
          <span className="font-display">Privacy</span>
        </div>
        <div className="plate divide-y divide-[color:var(--edge)] p-1">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <span className="skeleton block h-4 w-56 max-w-full" />
                <span className="skeleton mt-2 block h-3.5 w-full" />
              </div>
              <span className="skeleton h-[24px] w-[44px] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
