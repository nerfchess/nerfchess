"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BOARD_THEMES, BoardTheme, loadSettings, saveSettings, Settings } from "@/lib/settings";
import { setVolume } from "@/lib/sounds";
import { SECTIONS, type Control } from "@/components/settings/config";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingRow } from "@/components/settings/SettingRow";
import {
  FakeSelect,
  GhostButton,
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

  // Re-sync from storage each time the panel opens, matching the previous
  // behaviour where values were reloaded on open.
  useEffect(() => {
    if (open) setSettings(loadSettings());
  }, [open]);

  if (!open) return null;

  // Single write path for every live control: merge, persist, apply side
  // effects. saveSettings() already re-applies the board theme; volume needs an
  // explicit push into the audio engine.
  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...patch };
      saveSettings(merged);
      if (patch.volume != null) setVolume(merged.volume);
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
      case "boardTheme":
        return <BoardThemePicker value={settings.boardTheme} onChange={(t) => update({ boardTheme: t })} />;
      case "ph-toggle":
        return <Toggle label={label} checked={!!control.on} disabled />;
      case "ph-slider":
        return <Slider value={control.value} min={0} max={1} step={0.05} disabled format={() => "—"} />;
      case "ph-select":
        return <FakeSelect value={control.value} />;
      case "ph-swatches":
        return <Swatches colors={control.colors} />;
      case "ph-button":
        return <GhostButton label={control.label} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="plate gilt relative flex max-h-[86vh] w-full max-w-md flex-col"
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

        {/* Scrollable body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {SECTIONS.map((section) => (
            <SettingsSection key={section.id} title={section.title} icon={section.icon}>
              {section.rows.map((row) => (
                <SettingRow
                  key={row.id}
                  label={row.label}
                  hint={row.hint}
                  comingSoon={row.comingSoon}
                  stacked={row.control.kind === "boardTheme"}
                  control={renderControl(row.control, row.label)}
                />
              ))}
            </SettingsSection>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The board-theme swatch grid — the one live control that spans a full row. */
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
            <span className="grid h-7 w-7 grid-cols-2 grid-rows-2 overflow-hidden rounded-sm">
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
