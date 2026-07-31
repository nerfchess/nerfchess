"use client";

// The moderation console's control vocabulary. Every section builds from these
// so a "resolve", a "ban" and a "reset tier" read the same way wherever they
// appear, instead of each tab inventing its own `px-3 py-1 rounded-sm` variant.
//
// Three button tones, and only three, because a moderator making a decision
// should be able to tell what a control does from its colour alone:
//   default  quiet iron  — navigation and reversible actions (Dismiss, Unmute)
//   primary  gold        — the action that clears the item (Resolve, Apply)
//   danger   blood       — the action that takes something away (Ban, Flag)
// `quiet` is the fourth, non-button tone: inline text actions inside a row.

import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonTone = "default" | "primary" | "danger" | "quiet";
export type ButtonSize = "sm" | "md";

const TONE: Record<ButtonTone, string> = {
  default: "btn-ghost text-parchment-100",
  primary: "border border-gold/50 bg-gold-leaf/10 text-gold-leaf hover:bg-gold-leaf/20",
  danger: "btn-cursed",
  quiet:
    "border border-transparent text-parchment-300 hover:text-parchment-50 hover:border-white/15",
};

// Touch first: every control clears a 36/40px tap target on a phone and only
// tightens once there is a pointer, so nothing here is a coin-flip to hit.
const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 py-1.5 text-[12px] sm:min-h-0 sm:px-2.5 sm:py-1",
  md: "min-h-[40px] px-4 py-2 text-sm sm:min-h-0 sm:py-1.5",
};

function buttonClass(tone: ButtonTone, size: ButtonSize, extra?: string): string {
  return [
    "press inline-flex items-center justify-center gap-1.5 rounded-[1px] font-display transition",
    "disabled:cursor-not-allowed disabled:opacity-40",
    TONE[tone],
    SIZE[size],
    extra ?? "",
  ].join(" ");
}

export function ModButton({
  tone = "default",
  size = "md",
  className,
  children,
  ...rest
}: {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button type="button" className={buttonClass(tone, size, className)} {...rest}>
      {children}
    </button>
  );
}

/** Same shape as ModButton, for the links that behave like actions. */
export function ModLinkButton({
  href,
  tone = "default",
  size = "md",
  className,
  children,
}: {
  href: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(tone, size, className)}>
      {children}
    </Link>
  );
}

/** A real switch, not another button that says "On": the knob position carries
 *  the state even when colour is unavailable, and the label under it says what
 *  is being switched. Used by every site control. */
export function ModToggle({
  on,
  busy,
  disabled,
  onToggle,
  label,
}: {
  on: boolean | null;
  busy?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}) {
  const unknown = on === null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on === true}
      aria-label={label}
      disabled={unknown || busy || disabled}
      onClick={onToggle}
      title={unknown ? "Loading…" : on ? `${label} is on. Click to turn off.` : `${label} is off. Click to turn on.`}
      className={
        "press inline-flex shrink-0 items-center gap-2.5 rounded-[1px] border px-2.5 py-1.5 transition disabled:opacity-60 " +
        (unknown
          ? "border-white/15"
          : on
            ? "border-verdigris/50 bg-verdigris/10"
            : "border-white/15 bg-black/20")
      }
    >
      <span
        aria-hidden
        className={
          "relative h-4 w-8 rounded-full border transition-colors " +
          (unknown
            ? "border-white/20 bg-white/10"
            : on
              ? "border-verdigris/60 bg-verdigris/40"
              : "border-white/20 bg-black/40")
        }
      >
        <span
          className={
            "absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all " +
            (unknown
              ? "left-1/2 -translate-x-1/2 bg-parchment-400"
              : on
                ? "left-[calc(100%-0.875rem)] bg-verdigris-glow animate-flicker"
                : "left-[0.1875rem] bg-parchment-400")
          }
        />
      </span>
      <span
        className={
          "font-display text-xs font-semibold " +
          (unknown ? "text-parchment-400" : on ? "text-verdigris-glow" : "text-parchment-300")
        }
      >
        {unknown ? "…" : busy ? "Saving…" : on ? "On" : "Off"}
      </span>
    </button>
  );
}

/** Mutually exclusive choice, styled as one connected control rather than a row
 *  of loose buttons — so it reads as "pick one of these" at a glance. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
}: {
  value: T;
  options: { value: T; label: string; tone?: "danger" }[];
  onChange: (next: T) => void;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <div
      role="group"
      // Full width on a phone so the segments are thumb-sized, shrink-wrapped
      // once there is room for it to sit beside something else.
      className={
        "flex w-full rounded-[1px] border border-white/15 p-0.5 sm:inline-flex sm:w-auto " +
        (className ?? "")
      }
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={
              "press flex-1 rounded-[1px] text-center font-display transition sm:flex-none " +
              SIZE[size] +
              " " +
              (active
                ? opt.tone === "danger"
                  ? "bg-oxblood/25 text-oxblood-glow"
                  : "bg-gold-leaf/15 text-gold-leaf"
                : "text-parchment-300 hover:text-parchment-100")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Scope narrowing above a list (Open / All, Members / Guests). Deliberately
 *  lighter than SegmentedControl: it filters what you see, it does not choose
 *  what an action will do. */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "press rounded-[1px] border px-3 py-1 text-sm transition " +
        (active
          ? "border-gold/50 bg-gold-leaf/10 text-gold-leaf"
          : "border-white/15 text-parchment-300 hover:text-parchment-100")
      }
    >
      {children}
    </button>
  );
}

/** A count that only draws the eye when it is non-zero. */
export function CountBadge({ n, tone = "warn" }: { n: number; tone?: "warn" | "neutral" }) {
  if (!n) return null;
  return (
    <span
      className={
        "ml-auto shrink-0 rounded-[1px] px-1.5 py-px font-mono text-[10px] tabular-nums " +
        (tone === "warn" ? "bg-oxblood-glow/20 text-oxblood-glow" : "bg-white/10 text-parchment-300")
      }
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "mute" | "good" | "gold";
}) {
  const style =
    tone === "warn"
      ? "bg-oxblood-glow/20 text-oxblood-glow border-transparent"
      : tone === "mute"
        ? "bg-bruise-glow/20 text-bruise-glow border-transparent"
        : tone === "good"
          ? "bg-verdigris/15 text-verdigris-glow border-transparent"
          : tone === "gold"
            ? "border-gold/40 text-gold-leaf"
            : "border-white/15 text-parchment-300";
  return (
    <span className={`smallcaps shrink-0 rounded-[1px] border px-2 py-0.5 text-[10px] ${style}`}>
      {children}
    </span>
  );
}

export type StatItem = {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "warn" | "good";
};

function valueTone(tone?: "warn" | "good"): string {
  return tone === "warn"
    ? "text-oxblood-glow"
    : tone === "good"
      ? "text-verdigris-glow"
      : "text-parchment-50";
}

/** One number with its label. `tone` is for the numbers a moderator should
 *  react to, never for decoration. */
export function StatCard({ label, value, sub, tone }: StatItem) {
  return (
    <div className="plate p-4">
      <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
      <div className={"mt-1 font-display text-2xl tabular-nums " + valueTone(tone)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-parchment-400">{sub}</div>}
    </div>
  );
}

/** A block of numbers, laid out for the screen it is on.
 *
 *  On a phone a grid of stat cards is the wrong shape: two columns of boxes wide
 *  enough for "HUMAN GAMES, 15 MIN" to wrap three times, turning eight numbers
 *  into four screens of scrolling. So phones get a single plate with one line per
 *  number — label left, value right — which reads down the page like a table and
 *  fits the whole block in one glance. The card grid returns as soon as there is
 *  width to make it look deliberate. */
export function StatGrid({ items, cols = 4 }: { items: StatItem[]; cols?: 3 | 4 | 5 }) {
  const grid =
    cols === 5
      ? "sm:grid-cols-3 lg:grid-cols-5"
      : cols === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <>
      <div className="plate divide-y divide-white/5 sm:hidden">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="smallcaps min-w-0 text-[11px] leading-tight text-parchment-400">
              {it.label}
            </span>
            <span className="shrink-0 text-right">
              <span className={"font-display text-lg tabular-nums " + valueTone(it.tone)}>
                {it.value}
              </span>
              {it.sub && (
                <span className="block text-[10px] leading-tight text-parchment-400">{it.sub}</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className={`hidden gap-3 sm:grid ${grid}`}>
        {items.map((it) => (
          <StatCard key={it.label} {...it} />
        ))}
      </div>
    </>
  );
}

/** Heading for a block inside a section, with optional right-aligned controls.
 *
 *  `actionsInline` puts the control on the title's own row and drops the blurb
 *  beneath both. Use it for a switch that belongs to the thing being named — on
 *  a phone the default layout wraps a lone toggle under a paragraph of prose,
 *  which reads as a stray button rather than as this section's switch. */
export function SectionHead({
  title,
  blurb,
  actions,
  actionsInline,
}: {
  title: string;
  blurb?: ReactNode;
  actions?: ReactNode;
  actionsInline?: boolean;
}) {
  const heading = <h2 className="font-display text-lg text-parchment-100">{title}</h2>;
  const prose = blurb && (
    <p className="mt-1 max-w-2xl text-[12px] leading-snug text-parchment-400">{blurb}</p>
  );

  if (actionsInline) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          {heading}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {prose}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        {heading}
        {prose}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="plate px-4 py-8 text-center text-sm text-parchment-400">{children}</div>
  );
}

export function Loading({ what }: { what: string }) {
  return <p className="text-sm text-parchment-400">Loading {what}…</p>;
}

export function RoleBadge({ role }: { role: string }) {
  return <Pill tone="gold">{role === "admin" ? "Admin" : "Moderator"}</Pill>;
}

// ---------------- formatting ----------------

export function when(ts: number): string {
  return new Date(ts).toLocaleString();
}

/** The list-row timestamp. `toLocaleString()` spends 22 characters on
 *  "7/31/2026, 9:13:12 AM" — on a phone that is a whole line for a detail
 *  nobody reads to the second. This keeps the day and the minute; the full
 *  value stays available as a title attribute wherever it is used. */
export function whenShort(ts: number): string {
  const d = new Date(ts);
  const day = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

const FOREVER_MS = 50 * 365 * 24 * 60 * 60 * 1000;

export function untilLabel(ts: number | null): string {
  if (!ts || ts <= Date.now()) return "";
  return ts > Date.now() + FOREVER_MS ? "permanently" : `until ${when(ts)}`;
}

/** Expiry for a badge sitting next to a username, where the year and the
 *  seconds are noise: "until 1 Aug, 10:36". */
export function untilShort(ts: number | null): string {
  if (!ts || ts <= Date.now()) return "";
  return ts > Date.now() + FOREVER_MS ? "permanently" : `until ${whenShort(ts)}`;
}

export function fmtDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "-";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export async function postJson(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: data.error };
}
