"use client";

import { Fragment, type ReactNode } from "react";
import { GLOSSARY_REGEX, lookupTerm } from "@/lib/glossary";
import { GlossaryTerm } from "@/components/GlossaryTerm";

interface Props {
  /** A plain description string. Glossary terms inside it get a hover/tap gloss. */
  text: string;
  /** Optional class forwarded to the wrapping element (kept as a plain span). */
  className?: string;
}

/**
 * The term-wrapping helper: renders a description string with the first
 * occurrence of each known glossary term wrapped in <GlossaryTerm> (a subtle
 * dotted underline plus a hover / focus / tap definition). Degrades to plain
 * text when no terms are found, and never alters the surrounding copy.
 *
 * Used as a component (not a bare function) so it is safe to drop inside Server
 * Components: <GlossaryText text={card.description} />. The term rendering lives
 * in GlossaryTerm; this file only does the scan.
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

  if (last === 0) return className ? <span className={className}>{text}</span> : <>{text}</>;
  if (last < text.length) nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);

  return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
}
