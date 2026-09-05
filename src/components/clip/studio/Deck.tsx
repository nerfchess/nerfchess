"use client";

// The studio DECK: preset swatch chips pinned on top (each with a 3-color
// palette strip sampled from its grade), then the smallcaps tab rail and the
// active panel. The rail scrolls horizontally on narrow phones.
//
// Wave 5 adds ownership to the preset row: saved presets (localStorage only,
// rendered with their own palette strips, x-chip delete), the Save-preset
// naming flow, compact JSON share codes moved by copy/paste, and the A/B
// Compare toggle with per-chip pin affordances.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  STYLE_DEFAULTS,
  STYLE_PRESETS,
  gradeSwatch,
  type ClipStyle,
  type StylePreset,
} from "../clipStyles";
import type { SavedClipPreset } from "../clipPresets";
import type { Studio } from "./controls";
import { StylePanel } from "./panels/StylePanel";
import { CamPanel } from "./panels/CamPanel";
import { FxPanel } from "./panels/FxPanel";
import { PacePanel } from "./panels/PacePanel";
import { GradePanel } from "./panels/GradePanel";
import { TextPanel } from "./panels/TextPanel";
import { StickerPanel } from "./panels/StickerPanel";
import { AudioPanel } from "./panels/AudioPanel";
import { ExplainPanel } from "./panels/ExplainPanel";
import { BrandPanel } from "./panels/BrandPanel";
import { FormatPanel } from "./panels/FormatPanel";

const TABS = [
  "STYLE", "CAM", "FX", "PACE", "GRADE", "TEXT", "STICKER", "AUDIO", "EXPLAIN", "BRAND", "FORMAT",
] as const;
export type DeckTab = (typeof TABS)[number];

const PANELS: Record<DeckTab, (props: { studio: Studio }) => React.ReactNode> = {
  STYLE: StylePanel,
  CAM: CamPanel,
  FX: FxPanel,
  PACE: PacePanel,
  GRADE: GradePanel,
  TEXT: TextPanel,
  STICKER: StickerPanel,
  AUDIO: AudioPanel,
  EXPLAIN: ExplainPanel,
  BRAND: BrandPanel,
  FORMAT: FormatPanel,
};

function Swatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="clip-swatch" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

interface Props {
  studio: Studio;
  presetId: string | null;
  applyPreset: (p: StylePreset) => void;
  surpriseMe: () => void;
  saved: SavedClipPreset[];
  applySaved: (p: SavedClipPreset) => void;
  deleteSaved: (id: string) => void;
  savePreset: (name: string) => void;
  exportCode: () => string;
  importCode: (code: string) => boolean;
  compareOn: boolean;
  toggleCompare: () => void;
  pinStyle: (name: string, style: ClipStyle) => void;
  pinnedName: string | null;
}

export function Deck({
  studio,
  presetId,
  applyPreset,
  surpriseMe,
  saved,
  applySaved,
  deleteSaved,
  savePreset,
  exportCode,
  importCode,
  compareOn,
  toggleCompare,
  pinStyle,
  pinnedName,
}: Props) {
  const [tab, setTab] = useState<DeckTab>("STYLE");
  const [naming, setNaming] = useState(false);
  const [nameVal, setNameVal] = useState("My style");
  const [shareOpen, setShareOpen] = useState(false);
  const [importVal, setImportVal] = useState("");
  const [importErr, setImportErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const { accent, opts, locked } = studio;
  const Panel = PANELS[tab];

  const copyCode = async () => {
    const code = exportCode();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API blocked: fall back to a transient selection.
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        ta.remove();
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const runImport = () => {
    const ok = importCode(importVal);
    setImportErr(!ok);
    if (ok) {
      setImportVal("");
      setShareOpen(false);
    }
  };

  /** The pin affordance beside a chip while Compare is on. */
  const pinBtn = (label: string, style: ClipStyle) =>
    compareOn ? (
      <Button
        tone="quiet"
        size="xs"
        press={false}
        onClick={() => pinStyle(label, style)}
        disabled={locked}
        aria-pressed={pinnedName === label}
        aria-label={`Pin ${label} for compare`}
        data-clip-pin={label}
        className={"clip-pin " + (pinnedName === label ? "text-gold-leaf" : "text-parchment-400")}
        title={`Pin ${label} on the right side of the seam`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 3 v10" />
          <path d="M7 13 h10" />
          <path d="M12 13 v8" />
        </svg>
      </Button>
    ) : null;

  return (
    <div data-clip-deck>
      <div className="clip-presets" role="group" aria-label="Style presets">
        {STYLE_PRESETS.map((p) => {
          const grade = p.style.grade ?? STYLE_DEFAULTS.grade;
          return (
            <span key={p.id} className="clip-preset-slot">
              <Button
                tone="ghost"
                size="xs"
                onClick={() => applyPreset(p)}
                disabled={locked}
                aria-pressed={presetId === p.id}
                className={
                  "shrink-0 " + (presetId === p.id ? "text-gold-leaf" : "text-parchment-300")
                }
              >
                <Swatch colors={gradeSwatch(grade, accent, opts.style.duotoneA, opts.style.duotoneB)} />
                {p.label}
              </Button>
              {pinBtn(p.label, { ...STYLE_DEFAULTS, ...p.style, seed: opts.style.seed })}
            </span>
          );
        })}
        <Button
          tone="ghost"
          size="xs"
          onClick={surpriseMe}
          disabled={locked}
          aria-pressed={presetId === "surprise"}
          className={
            "shrink-0 " + (presetId === "surprise" ? "text-gold-leaf" : "text-parchment-300")
          }
        >
          <Swatch
            colors={gradeSwatch(opts.style.grade, accent, opts.style.duotoneA, opts.style.duotoneB)}
          />
          Surprise me
        </Button>
        {/* Saved presets: the creator's own row, palette strips sampled from
            their stored grades, x-chip delete. localStorage only. */}
        {saved.map((p) => (
          <span key={p.id} className="clip-preset-slot" data-clip-saved={p.name}>
            <Button
              tone="ghost"
              size="xs"
              onClick={() => applySaved(p)}
              disabled={locked}
              aria-pressed={presetId === p.id}
              className={
                "shrink-0 " + (presetId === p.id ? "text-gold-leaf" : "text-parchment-300")
              }
            >
              <Swatch colors={gradeSwatch(p.style.grade, accent, p.style.duotoneA, p.style.duotoneB)} />
              {p.name}
            </Button>
            <Button
              tone="quiet"
              size="xs"
              press={false}
              iconOnly
              onClick={() => deleteSaved(p.id)}
              disabled={locked}
              aria-label={`Delete preset ${p.name}`}
              data-clip-saved-delete={p.name}
              className="clip-pin text-parchment-500"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
            {pinBtn(p.name, p.style)}
          </span>
        ))}
      </div>

      {/* Ownership tools: save, share codes, A/B compare. */}
      <div className="clip-preset-tools" role="group" aria-label="Preset tools">
        {naming ? (
          <>
            <input
              type="text"
              value={nameVal}
              maxLength={24}
              autoFocus
              aria-label="Preset name"
              data-clip-preset-name
              className="clip-input clip-name-input"
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  savePreset(nameVal);
                  setNaming(false);
                } else if (e.key === "Escape") {
                  setNaming(false);
                }
              }}
            />
            <Button
              tone="ghost"
              size="xs"
              onClick={() => {
                savePreset(nameVal);
                setNaming(false);
              }}
              data-clip-preset-save-confirm
              className="text-gold-leaf"
            >
              Save
            </Button>
            <Button tone="quiet" size="xs" press={false} onClick={() => setNaming(false)} className="text-parchment-400">
              Cancel
            </Button>
          </>
        ) : (
          <Button
            tone="ghost"
            size="xs"
            onClick={() => {
              setNameVal("My style");
              setNaming(true);
            }}
            disabled={locked || saved.length >= 12}
            data-clip-preset-save
            className="text-parchment-300"
            title={saved.length >= 12 ? "12 saved presets max; delete one first" : "Save the current style as your own chip"}
          >
            Save preset
          </Button>
        )}
        <Button
          tone="ghost"
          size="xs"
          onClick={() => {
            setShareOpen((v) => !v);
            setImportErr(false);
          }}
          aria-pressed={shareOpen}
          data-clip-share-toggle
          className={shareOpen ? "text-gold-leaf" : "text-parchment-300"}
          title="Copy this style as a code, or paste one in"
        >
          Code
        </Button>
        <Button
          tone="ghost"
          size="xs"
          onClick={toggleCompare}
          disabled={locked}
          aria-pressed={compareOn}
          data-clip-compare-toggle
          className={compareOn ? "text-gold-leaf" : "text-parchment-300"}
          title="Split the viewport: current style left, pinned style right"
        >
          Compare
        </Button>
        {compareOn && (
          <span className="clip-tools-note">
            pin a chip for the right side{pinnedName ? ` (${pinnedName})` : ""}
          </span>
        )}
      </div>
      {shareOpen && (
        <div className="clip-share" data-clip-share>
          <Button tone="ghost" size="xs" onClick={() => void copyCode()} data-clip-code-copy className="text-parchment-300">
            {copied ? "Copied" : "Copy code"}
          </Button>
          <input
            type="text"
            value={importVal}
            aria-label="Paste a style code"
            placeholder="Paste a style code"
            data-clip-code-input
            className="clip-input"
            spellCheck={false}
            onChange={(e) => {
              setImportVal(e.target.value);
              setImportErr(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") runImport();
            }}
          />
          <Button
            tone="ghost"
            size="xs"
            onClick={runImport}
            disabled={locked || !importVal.trim()}
            data-clip-code-import
            className="text-parchment-300"
          >
            Import
          </Button>
          {importErr && <span className="clip-tools-note hot">not a style code</span>}
        </div>
      )}

      <div className="clip-deck-tabs" role="tablist" aria-label="Control deck">
        {TABS.map((id) => (
          <Button
            key={id}
            tone="quiet"
            size="xs"
            press={false}
            role="tab"
            aria-selected={tab === id}
            data-clip-tab={id}
            onClick={() => setTab(id)}
            className="clip-deck-tab"
          >
            {id}
          </Button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab} data-clip-panel={tab}>
        <Panel studio={studio} />
      </div>
    </div>
  );
}
