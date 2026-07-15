import { HOUSE_PFP_PREFIX } from "@/lib/avatars";

// House-bot detection + label. House-player accounts never hold a real preset,
// star, or uploaded avatar: they wear either a "_flower" preset twin or a
// "house_pfp:<name>" scenic id, and isAvatarId rejects both so a human account
// can never claim one. That makes the avatar id itself the reliable, already
// exposed flag for "this is a house bot" on every surface a name renders, per
// the design system's House Bot labeling contract (section 7 / 12).
export function isHouseBotAvatar(avatar: string | null | undefined): boolean {
  if (typeof avatar !== "string") return false;
  return avatar.startsWith(HOUSE_PFP_PREFIX) || /_flower$/.test(avatar);
}

// The HOUSE BOT chip: a quiet parchment-outline badge (design system section 7),
// sentence-cased label kept in allcaps like the sanctioned LIVE badge. Sized at
// the 12px caption floor.
export function HouseBotBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-none tracking-[0.08em] text-parchment-400 " +
        className
      }
      style={{ border: "1px solid var(--edge-strong)" }}
    >
      HOUSE BOT
    </span>
  );
}
