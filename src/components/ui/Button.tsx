"use client";

// The one button.
//
// Buttons carried their material in a global .btn-* class and their geometry in
// a Tailwind string copy-pasted at every call-site, which meant the shape of a
// button was a convention rather than a thing. Two costs: `min-h-[44px]
// rounded-sm px-4 py-2 font-display text-sm inline-flex items-center
// justify-center gap-2` appeared verbatim hundreds of times, and 156 buttons
// skipped the material classes entirely and hand-rolled a border and a fill.
//
// That second group is why this exists now rather than as a tidy-up. Each
// flagship theme owns its own button material, authored once against .btn-*
// (see the material contract in globals.css). A button that hand-rolls
// `border border-white/15 bg-white/[0.03]` is invisible to that and keeps the
// old theme's look in all five rooms.
//
// This component emits ONLY the material class and geometry utilities. It never
// emits a colour — every colour comes from the theme's own tokens, which is
// what lets one <Button tone="leaf"> be volcanic glass in Obsidian and a glazed
// tile in Porcelain with no branch here.
//
// The tone set is docs/design-system.md §7 and is closed. A new visual variant
// is a new token value in the material contract, not a new tone.

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonTone =
  /** Secondary. The workhorse: dark iron, no energy until hovered. */
  | "ghost"
  /** Primary. One per view region — the accent slab with a lit core. */
  | "leaf"
  /** Hero primary. `leaf` with depth: sits on a base edge and lifts on hover. */
  | "cta"
  /** Emotional-peak commit (draft confirm, lock-in). Glass over iron. */
  | "glass"
  /** The same commit when it is THE action: accent core inside the glass. */
  | "primary"
  /** Destructive: Resign, Delete, Leave, Decline, Remove. */
  | "danger"
  /** Reward and prestige: claim, rank reveal. Never a routine action. */
  | "gold"
  /** Caller-supplied energy via --slab-rgb. */
  | "slab"
  /** Inline text action inside a row. Not a slab — no fill, no rim. */
  | "quiet";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

const TONE: Record<ButtonTone, string> = {
  ghost: "btn-ghost",
  leaf: "btn-leaf",
  cta: "btn-leaf btn-cta",
  glass: "btn-glass",
  primary: "btn-glass btn-glass--primary",
  danger: "btn-cursed",
  gold: "btn-gold",
  slab: "btn-slab",
  quiet:
    "border border-transparent text-parchment-300 hover:border-white/15 hover:text-parchment-50",
};

// Touch first: every size clears a 44px tap target on a phone (the hit-area
// floor in docs/design-system.md §10) and only tightens once there is a
// pointer. `xs` is the exception and is for dense data rows only — it clears
// 36px, never 44, so it is not allowed to be the only way to do something.
const SIZE: Record<ButtonSize, string> = {
  xs: "min-h-[36px] gap-1 px-2 py-1 text-[12px] sm:min-h-0",
  sm: "min-h-[44px] gap-1.5 px-3 py-1.5 text-[13px] sm:min-h-[36px] sm:py-1",
  md: "min-h-[44px] gap-2 px-4 py-2 text-sm sm:min-h-[36px] sm:py-1.5",
  lg: "min-h-[48px] gap-2 px-6 py-2.5 text-base",
};

/** Square, so an icon-only control is a target rather than a sliver. */
const ICON_SIZE: Record<ButtonSize, string> = {
  xs: "min-h-[36px] min-w-[36px] p-1 text-[12px] sm:min-h-0 sm:min-w-0",
  sm: "min-h-[44px] min-w-[44px] p-1.5 text-[13px] sm:min-h-[36px] sm:min-w-[36px]",
  md: "min-h-[44px] min-w-[44px] p-2 text-sm sm:min-h-[36px] sm:min-w-[36px]",
  lg: "min-h-[48px] min-w-[48px] p-2.5 text-base",
};

interface Shape {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Fill the container. */
  block?: boolean;
  /** No label — pass an aria-label. */
  iconOnly?: boolean;
  /** `.press` physics. On by default; every button in the product presses. */
  press?: boolean;
  className?: string;
}

function shapeClass({
  tone = "ghost",
  size = "md",
  block,
  iconOnly,
  press = true,
  className,
}: Shape): string {
  return [
    "inline-flex items-center justify-center rounded-[1px] font-display transition",
    "disabled:cursor-not-allowed disabled:opacity-40",
    press ? "press" : "",
    TONE[tone],
    iconOnly ? ICON_SIZE[size] : SIZE[size],
    block ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = Shape & {
  /** Shows the shared loader in place of any leading icon and blocks input.
   *  Does not change the label: a control that says "Publish" keeps saying it,
   *  so the button does not resize mid-action. */
  loading?: boolean;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  tone,
  size,
  block,
  iconOnly,
  press,
  className,
  loading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      // Default to "button": a bare <button> inside a <form> submits it, which
      // is almost never what a call-site converted from an onClick handler
      // wants. Pass type="submit" explicitly where it is.
      type="button"
      className={shapeClass({
        tone,
        size,
        block,
        iconOnly,
        press,
        className: [loading ? "btn-busy" : "", className ?? ""].filter(Boolean).join(" "),
      })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="rune-loader" aria-hidden />}
      {children}
    </button>
  );
}

export type LinkButtonProps = Shape & {
  href: string;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href">;

/** Navigation that is dressed as a control. Same material and geometry as
 *  Button, but it is a link: it routes, opens in a new tab on middle-click, and
 *  announces as a link. If the thing does not have a destination, it is a
 *  Button. */
export function LinkButton({
  href,
  tone,
  size,
  block,
  iconOnly,
  press,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={shapeClass({ tone, size, block, iconOnly, press, className }) + " no-underline"}
      {...rest}
    >
      {children}
    </Link>
  );
}
