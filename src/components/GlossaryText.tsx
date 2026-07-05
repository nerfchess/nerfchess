"use client";

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY_REGEX, lookupTerm } from "@/lib/glossary";

interface Props {
  /** A plain description string. Glossary terms inside it get a hover/tap gloss. */
  text: string;
  /** Optional class forwarded to the wrapping element (kept as a plain span). */
  className?: string;
}

/**
 * Renders a description string, underlining the first occurrence of each known
 * glossary term with a subtle dotted underline and a hover (desktop) / tap
 * (mobile) definition. Degrades to plain text when no terms are found, and
 * never alters the surrounding text or its wrapping.
 */
export function GlossaryText({ text, className }: Props) {
  const nodes: ReactNode[] = [];
  const used = new Set<string>();
  let last = 0;
  let key = 0;

  // Fresh scan each render: lastIndex is stateful on a shared regex.
  GLOSSARY_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GLOSSARY_REGEX.exec(text)) !== null) {
    const matched = m[0];
    const norm = matched.toLowerCase();
    const definition = lookupTerm(matched);

    // Only underline the first time a term appears, to avoid clutter.
    if (definition && !used.has(norm)) {
      used.add(norm);
      if (m.index > last) nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
      nodes.push(<GlossaryTerm key={key++} term={matched} definition={definition} />);
      last = m.index + matched.length;
    }
    // Guard against zero-length matches looping forever.
    if (GLOSSARY_REGEX.lastIndex === m.index) GLOSSARY_REGEX.lastIndex++;
  }

  if (last === 0) return <>{text}</>;
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);

  return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
}

function GlossaryTerm({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  // Close the tap-popover on outside tap or Escape (desktop hover closes on
  // mouse-leave, which does not fire on touch).
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
        // title is the graceful fallback if JS/styling is unavailable, but does
        // not work on touch, hence the tap popover below.
        title={definition}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Do not let a tap on the term also click through to a card button.
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="cursor-help underline decoration-dotted decoration-parchment-400/60 underline-offset-2 transition-colors hover:decoration-gold/70"
      >
        {term}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 block w-56 max-w-[min(16rem,80vw)] rounded-md border border-white/15 bg-ink-800 px-3 py-2 text-left text-[12px] font-body font-normal normal-case leading-snug text-parchment-100 shadow-lg"
        >
          {definition}
        </span>
      )}
    </span>
  );
}
