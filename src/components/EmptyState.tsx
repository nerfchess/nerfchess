import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// A warm, human empty state. Blank panels are exactly where a restrained dark
// app reads coldest, so this answers What / Why / Next in one flat plate: a
// monochrome line icon tuned to the ink palette, a plain-spoken line, and a
// single accent CTA (never a wall of options). Stays square and quiet — depth
// comes from the ink ladder and the warm hairline, not shadow or rounding.

type Action =
  | { href: string; label: string }
  | { onClick: () => void; label: string };

export function EmptyState({
  icon: Icon,
  glyph = "♞",
  title,
  body,
  action,
  secondary,
  className = "",
}: {
  /** Optional line icon; when absent the piece glyph renders instead (the
   *  design-system default accent for empty states). */
  icon?: LucideIcon;
  /** Chess piece glyph used when no icon is supplied. */
  glyph?: string;
  title: string;
  body: string;
  action?: Action;
  secondary?: Action;
  className?: string;
}) {
  return (
    <div
      className={
        "plate relative flex flex-col items-center gap-3 px-6 py-10 text-center " +
        className
      }
    >
      <span
        aria-hidden
        className="grid h-12 w-12 place-items-center bg-[color:var(--bg-zebra)] text-parchment-400"
        style={{ border: "1px solid var(--edge)" }}
      >
        {Icon ? <Icon size={22} strokeWidth={1.6} /> : <span className="text-[26px] leading-none">{glyph}</span>}
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold text-parchment-50">{title}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-parchment-300">
          {body}
        </p>
      </div>
      {(action || secondary) && (
        <div className="mt-1 flex flex-col items-center gap-2 sm:flex-row">
          {action && <ActionButton action={action} primary />}
          {secondary && <ActionButton action={secondary} />}
        </div>
      )}
    </div>
  );
}

function ActionButton({ action, primary = false }: { action: Action; primary?: boolean }) {
  const cls =
    (primary ? "btn-leaf" : "btn-ghost") +
    " press px-5 py-2.5 font-display text-sm font-semibold inline-flex items-center justify-center";
  return "href" in action ? (
    <Link href={action.href} className={cls}>
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  );
}
