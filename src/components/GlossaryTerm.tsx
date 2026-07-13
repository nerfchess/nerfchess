"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { glossaryHref, lookupEntry } from "@/lib/glossary";

/**
 * A single inline glossary chip: a term carrying a subtle dotted underline that
 * reveals its definition on hover, keyboard focus, or tap — and pins open on
 * click into a richer popover (one-liner, detail, example, and a "read more"
 * link into the glossary page anchor).
 *
 * Design law: 1px corners, no gradient / glow / shadow, a hairline border, and
 * a coral-accent colour on hover (the term itself tints coral, plus its
 * underline) so it clearly reads as interactive. The only motion is a colour
 * transition on the trigger, gated behind motion-safe so reduced-motion users
 * get a still, instant reveal.
 *
 * Interaction model: hovering opens a transient popover that closes on mouse
 * leave; clicking (or Enter / Space) PINS it open so the pointer can travel
 * into the popover and follow the read-more link. Escape, an outside tap, or
 * focus leaving the whole chip closes a pinned popover. Accessible: the
 * trigger is focusable, exposes expanded state via aria-expanded /
 * aria-controls, describes itself through aria-describedby while open, and
 * keeps a title as the no-JS fallback.
 */
export function GlossaryTerm({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  // The rich entry behind the matched text (resolves aliases and plurals).
  // Data-only import, so the client bundle stays free of server code.
  const entry = lookupEntry(term);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline"
      // React's onBlur is focusout under the hood, so it bubbles here from the
      // trigger AND the popover link: close only when focus leaves the chip
      // entirely, so tabbing into "read more" never slams the popover shut.
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setPinned(false);
        }
      }}
    >
      <span
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-describedby={open ? id : undefined}
        // title is the graceful fallback when styling or JS is unavailable; it
        // does not fire on touch, hence the tap-toggled popover below.
        title={definition}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onClick={(e) => {
          // A tap on the term must not click through to a parent card button.
          e.stopPropagation();
          // Unpinned (closed or hover-open): pin the popover open. Pinned:
          // close and release it.
          const next = !pinned;
          setPinned(next);
          setOpen(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const next = !pinned;
            setPinned(next);
            setOpen(next);
          }
        }}
        className="cursor-help underline decoration-dotted decoration-parchment-400/60 underline-offset-2 outline-none hover:text-coral hover:decoration-coral/80 focus-visible:text-coral focus-visible:decoration-coral/80 motion-safe:transition-colors motion-safe:duration-150"
      >
        {term}
      </span>
      {open && (
        <span
          id={id}
          className="absolute left-0 top-full z-50 mt-1 block w-72 max-w-[min(20rem,85vw)] rounded-[1px] border border-white/15 bg-ink-800 px-3 py-2.5 text-left text-[12px] font-body font-normal normal-case leading-snug text-parchment-100"
        >
          {entry && (
            <span className="block font-display text-[13px] tracking-wide text-parchment">
              {entry.term}
            </span>
          )}
          <span className={entry ? "mt-1 block" : "block"}>{definition}</span>
          {entry?.detail && (
            <span className="mt-1.5 block text-parchment-200/85">{entry.detail}</span>
          )}
          {entry?.example && (
            <span className="mt-1.5 block italic text-parchment-400">{entry.example}</span>
          )}
          {entry && (
            <Link
              href={glossaryHref(entry)}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 block text-coral/90 hover:text-coral hover:underline"
            >
              Read more in the glossary →
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
