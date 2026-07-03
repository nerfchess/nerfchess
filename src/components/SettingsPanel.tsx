"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import {
  ACCENT_THEMES,
  AccentColor,
  BOARD_THEMES,
  BoardTheme,
  DEFAULT_SETTINGS,
  PIECE_THEMES,
  PieceTheme,
  loadSettings,
  saveSettings,
  Settings,
} from "@/lib/settings";
import { setUiSounds, setVolume } from "@/lib/sounds";
import { Piece } from "@/components/Pieces";
import { SECTIONS, type Control } from "@/components/settings/config";
import { SettingRow } from "@/components/settings/SettingRow";
import {
  GhostButton,
  Select,
  Slider,
  Swatches,
  Toggle,
} from "@/components/settings/controls";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);

  // Re-sync from storage each time the panel opens, matching the previous
  // behaviour where values were reloaded on open. Also start back on the
  // first tab so the panel always opens in the same place.
  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setActiveTab(SECTIONS[0].id);
    }
  }, [open]);

  if (!open) return null;

  // Single write path for every live control: merge, persist, apply side
  // effects. saveSettings() already re-applies the themes and UI preferences;
  // audio needs an explicit push into the sound engine.
  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...patch };
      saveSettings(merged);
      if (patch.volume != null) setVolume(merged.volume);
      if (patch.uiSounds != null) setUiSounds(merged.uiSounds);
      return merged;
    });
  };

  const renderControl = (control: Control, label: string) => {
    switch (control.kind) {
      case "toggle":
        return (
          <Toggle
            label={label}
            checked={settings[control.setting]}
            onChange={(v) => update({ [control.setting]: v } as Partial<Settings>)}
          />
        );
      case "slider":
        return (
          <Slider
            label={label}
            value={settings[control.setting]}
            min={control.min}
            max={control.max}
            step={control.step}
            format={control.format}
            onChange={(v) => update({ [control.setting]: v } as Partial<Settings>)}
          />
        );
      case "animationSpeed":
        return (
          <Select
            label={label}
            value={settings.animationSpeed}
            options={control.options}
            onChange={(v) => update({ animationSpeed: v })}
          />
        );
      case "accentColor":
        return (
          <Swatches
            colors={(Object.keys(ACCENT_THEMES) as AccentColor[]).map((id) => ({
              id,
              color: ACCENT_THEMES[id].accent,
              label: ACCENT_THEMES[id].label,
            }))}
            selected={settings.accentColor}
            onSelect={(id) => update({ accentColor: id as AccentColor })}
          />
        );
      case "boardTheme":
        return <BoardThemePicker value={settings.boardTheme} onChange={(t) => update({ boardTheme: t })} />;
      case "pieceTheme":
        return <PieceThemePicker value={settings.pieceTheme} onChange={(t) => update({ pieceTheme: t })} />;
      case "reset":
        return (
          <GhostButton
            label="Reset"
            onClick={() => {
              update({ ...DEFAULT_SETTINGS });
              setVolume(DEFAULT_SETTINGS.volume);
              setUiSounds(DEFAULT_SETTINGS.uiSounds);
            }}
          />
        );
    }
  };

  // Pickers span a full row; simple controls sit inline on the right.
  const isStacked = (control: Control) =>
    control.kind === "boardTheme" || control.kind === "pieceTheme";

  const activeSection = SECTIONS.find((s) => s.id === activeTab) ?? SECTIONS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="plate gilt relative flex max-h-[86vh] w-full max-w-[34rem] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="font-display text-xl text-parchment">Settings</div>
          <button
            onClick={onClose}
            className="rounded p-1 text-parchment-400 transition-colors hover:bg-white/5 hover:text-parchment"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar — one tab per section; the active pane renders below. */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex gap-0.5 overflow-x-auto border-b border-white/10 px-2 pt-2"
        >
          {SECTIONS.map((section) => {
            const selected = section.id === activeTab;
            return (
              <button
                key={section.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(section.id)}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-t border-b-2 px-2 py-2 font-display text-[12.5px] transition-colors " +
                  (selected
                    ? "border-gold text-gold-leaf"
                    : "border-transparent text-parchment-400 hover:bg-white/[0.04] hover:text-parchment")
                }
              >
                <section.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Active tab's rows. Fixed height so switching tabs doesn't resize
            the panel; the pane scrolls when a tab outgrows it. */}
        <div role="tabpanel" className="h-[24rem] max-h-[60vh] overflow-y-auto px-5 py-3">
          <div className="divide-y divide-white/[0.06]">
            {activeSection.rows.map((row) => (
              <SettingRow
                key={row.id}
                label={row.label}
                hint={row.hint}
                stacked={isStacked(row.control)}
                control={renderControl(row.control, row.label)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The board-theme swatch grid — a live control that spans a full row. */
function BoardThemePicker({
  value,
  onChange,
}: {
  value: BoardTheme;
  onChange: (theme: BoardTheme) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((k) => {
        const t = BOARD_THEMES[k];
        const selected = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              "flex items-center gap-2.5 rounded border p-2 transition-colors " +
              (selected
                ? "border-gold/70 bg-gold/10"
                : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]")
            }
          >
            <span className="grid h-7 w-7 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-sm">
              <span style={{ background: t.light }} />
              <span style={{ background: t.dark }} />
              <span style={{ background: t.dark }} />
              <span style={{ background: t.light }} />
            </span>
            <span className="font-display text-[13px] text-parchment">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The piece-set swatch grid — a live control that spans a full row. */
function PieceThemePicker({
  value,
  onChange,
}: {
  value: PieceTheme;
  onChange: (theme: PieceTheme) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(PIECE_THEMES) as PieceTheme[]).map((k) => {
        const t = PIECE_THEMES[k];
        const selected = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              "flex items-center gap-2.5 rounded border p-2 transition-colors " +
              (selected
                ? "border-gold/70 bg-gold/10"
                : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]")
            }
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-ink-700"
              style={
                {
                  "--piece-w-fill": t.wFill,
                  "--piece-w-stroke": t.wStroke,
                  "--piece-b-fill": t.bFill,
                  "--piece-b-stroke": t.bStroke,
                } as CSSProperties
              }
            >
              {t.assetSet ? (
                <>
                  <span
                    className="h-4 w-4 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("/piece/lichess/${t.assetSet}/wN.svg")` }}
                  />
                  <span
                    className="-ml-1 h-4 w-4 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("/piece/lichess/${t.assetSet}/bN.svg")` }}
                  />
                </>
              ) : (
                <>
                  <Piece type="n" color="w" size={16} />
                  <Piece type="n" color="b" size={16} className="-ml-1" />
                </>
              )}
            </span>
            <span className="font-display text-[13px] text-parchment">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
