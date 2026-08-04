"use client";

// EXPLAIN: the viewer-education layer. Telegraph arrows (with an ink dial),
// the card rule panel (side + hold bias), action callouts, and a small
// hand-sketched diagram of what the layer draws so the toggles aren't
// abstract words.

import { ARROW_COLOR_OPTIONS, RULE_HOLD_OPTIONS, RULE_SIDE_OPTIONS } from "../../clipOptions";
import { ChoiceRow, ToggleRow, type Studio } from "../controls";

/** Tiny static sketch: board corner, a knight-path arrow, a rule panel. */
function Diagram({ accent }: { accent: string }) {
  return (
    <svg
      className="clip-diagram"
      width="150"
      height="66"
      viewBox="0 0 150 66"
      aria-hidden
      role="presentation"
    >
      {/* board corner, hand-loose */}
      <g stroke="rgba(236,231,221,0.35)" strokeWidth="1" fill="none">
        <path d="M8 6 L8 60 M8 60 L74 60" />
        <path d="M8 24 h64 M8 42 h65" opacity="0.4" />
        <path d="M26 6.5 v53 M44 6 v54.5 M62 6.4 v53.8" opacity="0.4" />
      </g>
      {/* knight-hop arrow with rounded corner */}
      <path
        d="M17 51 L17 21 Q17 15 23 15 L48 15"
        stroke={accent}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M46 10 L55 15 L46 20 Z" fill={accent} />
      {/* capture ring */}
      <circle cx="53" cy="33" r="6" stroke="#e05252" strokeWidth="1.5" fill="none" />
      {/* rule panel sketch */}
      <g transform="rotate(-1.2 112 33)">
        <rect x="84" y="14" width="58" height="38" fill="rgba(16,14,11,0.9)" stroke={accent} strokeWidth="1" />
        <rect x="84" y="14" width="3" height="38" fill={accent} />
        <path d="M92 24 h30 M92 32 h42 M92 39 h38 M92 46 h24" stroke="rgba(236,231,221,0.5)" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function ExplainPanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked, accent } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <div className="clip-row">
        <span className="clip-row-label">Layer</span>
        <div className="clip-row-body">
          <Diagram accent={accent} />
        </div>
      </div>
      <ToggleRow
        label="Arrows"
        disabled={locked}
        toggles={[{ label: "Telegraph", on: opts.explainArrows, onClick: () => set("explainArrows", !opts.explainArrows) }]}
      />
      <ChoiceRow label="Arrow ink" options={ARROW_COLOR_OPTIONS} value={s.arrowColor} onPick={(v) => setStyle({ arrowColor: v })} disabled={locked || !opts.explainArrows} />
      <ToggleRow
        label="Rules"
        disabled={locked}
        toggles={[{ label: "Card rules", on: opts.explainRules, onClick: () => set("explainRules", !opts.explainRules) }]}
      />
      <ChoiceRow label="Side" options={RULE_SIDE_OPTIONS} value={s.ruleSide} onPick={(v) => setStyle({ ruleSide: v })} disabled={locked || !opts.explainRules} />
      <ChoiceRow label="Hold" options={RULE_HOLD_OPTIONS} value={s.ruleHold} onPick={(v) => setStyle({ ruleHold: v })} disabled={locked || !opts.explainRules} />
      <ToggleRow
        label="Callouts"
        disabled={locked}
        toggles={[{ label: "Action callouts", on: opts.explainCallouts, onClick: () => set("explainCallouts", !opts.explainCallouts) }]}
      />
    </div>
  );
}
