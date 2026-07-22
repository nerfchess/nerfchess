// The HOUSE BOT chip (design system section 7): a quiet parchment-400 outline
// badge rendered beside a house account's name everywhere one shows — profile,
// leaderboard, lobby, game HUD, and spectating. House bots are engine-driven
// accounts and are always labeled as such; the label is informative, never
// decorative, so it stays small and calm.
export function HouseBotBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center border border-parchment-400/50 px-1 py-px align-middle font-display text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-parchment-400 " +
        className
      }
      title="An automated house account run by the site's chess engine"
    >
      House Bot
    </span>
  );
}
