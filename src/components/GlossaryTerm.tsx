"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A single inline glossary chip: a term carrying a subtle dotted underline that
 * reveals a one-line definition on hover, keyboard focus, or tap.
 *
 * Design law: 1px corners, no gradient / glow / shadow, a hairline border, and
 * a sun-accent underline on hover. The only motion is a colour transition on
 * the trigger, gated behind motion-safe so reduced-motion users get a still,
 * instant reveal. Accessible: the trigger is focusable, exposes the definition
 * through aria-describedby while open and a title as the no-JS fallback, and
 * closes on outside tap or Escape (touch has no mouse-leave).
 */
export function GlossaryTerm({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline">
      <span
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        // title is the graceful fallback when styling or JS is unavailable; it
        // does not fire on touch, hence the tap-toggled popover below.
        title={definition}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // A tap on the term must not click through to a parent card button.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="cursor-help underline decoration-dotted decoration-parchment-400/60 underline-offset-2 outline-none hover:decoration-sun/80 focus-visible:decoration-sun/80 motion-safe:transition-colors motion-safe:duration-150"
      >
        {term}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 block w-56 max-w-[min(16rem,80vw)] rounded-[1px] border border-white/15 bg-ink-800 px-3 py-2 text-left text-[12px] font-body font-normal normal-case leading-snug text-parchment-100"
        >
          {definition}
        </span>
      )}
    </span>
  );
}
