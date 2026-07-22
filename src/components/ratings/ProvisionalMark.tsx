/* Small labelled marker for provisional ratings. Replaces the bare trailing
   "?" that used to be appended to usernames/ratings, which read as if the
   name itself were uncertain. Renders next to the rating with an accessible
   label and a hover tooltip explaining what it means. */
export function ProvisionalMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center border border-parchment-400/40 bg-white/[0.04] align-middle text-[9px] font-bold leading-none text-parchment-400 " +
        className
      }
      title="Provisional rating: still settling after a few more rated games"
      aria-label="Provisional rating"
      role="img"
    >
      ?
    </span>
  );
}
