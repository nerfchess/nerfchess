"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import {
  ACCENT_THEMES,
  AccentColor,
  BOARD_THEMES,
  BoardTheme,
  CUSTOM_BG_DATA_MAX,
  CUSTOM_BG_URL_MAX,
  DEFAULT_SETTINGS,
  PIECE_THEMES,
  PieceTheme,
  SITE_THEMES,
  SiteTheme,
  loadSettings,
  sanitizeCustomBgUrl,
  saveSettings,
  Settings,
} from "@/lib/settings";
import { fileToDataUrl } from "@/lib/imageUpload";
import { configureSoundPrefs, playMove as playMoveSample, setUiSounds, setVolume } from "@/lib/sounds";
import Link from "next/link";
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
      configureSoundPrefs({
        enabled: merged.soundEnabled,
        move: merged.moveSound,
        capture: merged.captureSound,
        check: merged.checkSound,
        gameEnd: merged.gameEndSound,
        theme: merged.soundTheme,
      });
      // Audition the new set so the choice is audible immediately.
      if (patch.soundTheme != null || patch.volume != null) playMoveSample();
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
      case "siteTheme":
        return <SiteThemePicker value={settings.siteTheme} onChange={(t) => update({ siteTheme: t })} />;
      case "soundTheme":
        return (
          <Select
            label={label}
            value={settings.soundTheme}
            options={control.options}
            onChange={(v) => update({ soundTheme: v })}
          />
        );
      case "account":
        return <AccountSettings />;
      case "accentColor":
        return (
          <Swatches
            colors={[
              {
                // "Auto" follows whichever theme is active (its swatch shows
                // the current theme's own accent).
                id: "auto",
                color: (SITE_THEMES[settings.siteTheme] ?? SITE_THEMES.dark).accent.accent,
                label: "Theme",
              },
              ...(Object.keys(ACCENT_THEMES) as Exclude<AccentColor, "auto">[]).map((id) => ({
                id: id as string,
                color: ACCENT_THEMES[id].accent,
                label: ACCENT_THEMES[id].label,
              })),
            ]}
            selected={settings.accentColor}
            onSelect={(id) => update({ accentColor: id as AccentColor })}
          />
        );
      case "customBg":
        return (
          <CustomBackgroundControl
            url={settings.customBgUrl}
            data={settings.customBgData}
            dim={settings.customBgDim}
            onApply={(patch) => update(patch)}
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
    control.kind === "boardTheme" ||
    control.kind === "pieceTheme" ||
    control.kind === "siteTheme" ||
    control.kind === "account" ||
    control.kind === "customBg";

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
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded text-parchment-400 transition-colors hover:bg-white/5 hover:text-parchment"
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

/** Full-site theme picker: a swatch card per theme showing the page background,
 *  a floating panel chip, and the theme's glow color — so each mood previews at
 *  a glance before it's applied. */
function SiteThemePicker({
  value,
  onChange,
}: {
  value: SiteTheme;
  onChange: (theme: SiteTheme) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(Object.keys(SITE_THEMES) as SiteTheme[]).map((k) => {
        const t = SITE_THEMES[k];
        const selected = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            aria-pressed={selected}
            className={
              "group overflow-hidden rounded border text-left transition-colors " +
              (selected
                ? "border-gold/70 bg-gold/10"
                : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]")
            }
          >
            {/* Miniature page: background wash, a panel chip, a glow dot. */}
            <span
              className="relative block h-12 w-full"
              style={{ background: t.swatch.bg }}
              aria-hidden
            >
              <span
                className="absolute left-2 top-2 h-5 w-9 rounded-[2px] border border-white/10"
                style={{ background: t.swatch.panel }}
              />
              <span
                className="absolute bottom-2 right-2 h-2 w-2 rounded-full"
                style={{ background: t.swatch.glow, boxShadow: `0 0 8px 1px ${t.swatch.glow}` }}
              />
            </span>
            <span className="block px-2 py-1.5">
              <span className="block font-display text-[12.5px] leading-tight text-parchment">
                {t.label}
              </span>
              <span className="block text-[10px] leading-tight text-parchment-500">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Custom background: upload an image (stored device-local as a data URL) or
 *  paste an http(s) URL, plus a dim slider. Both inputs are validated before
 *  anything persists, so the page background always degrades to the theme
 *  default. An upload wins over the URL until it's removed. */
function CustomBackgroundControl({
  url,
  data,
  dim,
  onApply,
}: {
  url: string;
  data: string;
  dim: number;
  onApply: (patch: Partial<Settings>) => void;
}) {
  const [draft, setDraft] = useState(url);
  const [invalid, setInvalid] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Track external changes (reset, server sync) while the panel is open.
  useEffect(() => {
    setDraft(url);
    setInvalid(false);
  }, [url]);

  const apply = () => {
    const clean = sanitizeCustomBgUrl(draft);
    if (draft.trim() && !clean) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onApply({ customBgUrl: clean });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const dataUrl = await fileToDataUrl(file, { maxDim: 1920, maxChars: CUSTOM_BG_DATA_MAX });
      onApply({ customBgData: dataUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read that image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="btn-ghost relative cursor-pointer rounded px-3 py-1.5 font-display text-[12px]">
          {uploading ? "Reading…" : data ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            aria-label="Upload a background image"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </label>
        {data && (
          <>
            <span
              aria-hidden
              className="h-8 w-12 shrink-0 rounded-[2px] border border-white/15 bg-cover bg-center"
              style={{ backgroundImage: `url("${data}")` }}
            />
            <GhostButton label="Remove" onClick={() => onApply({ customBgData: "" })} />
          </>
        )}
      </div>
      {uploadError && <p className="text-[11px] text-oxblood-glow">{uploadError}</p>}
      {data && (
        <p className="text-[11px] text-parchment-500">
          Uploaded backgrounds stay on this device and override the URL below.
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={draft}
          maxLength={CUSTOM_BG_URL_MAX}
          placeholder="https://example.com/image.jpg"
          aria-label="Background image URL"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          className="w-full rounded border border-white/15 bg-ink-900/60 px-2.5 py-1.5 text-[12px] text-parchment placeholder:text-parchment-500 focus:border-gold/60 focus:outline-none"
        />
        <GhostButton label="Apply" onClick={apply} />
        {url && (
          <GhostButton
            label="Clear"
            onClick={() => {
              setDraft("");
              setInvalid(false);
              onApply({ customBgUrl: "" });
            }}
          />
        )}
      </div>
      {invalid && (
        <p className="text-[11px] text-oxblood-glow">Use a direct http(s) image link.</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-parchment-500">Dim</span>
        <Slider
          label="Background dim"
          value={dim}
          min={0}
          max={0.6}
          step={0.05}
          disabled={!url && !data}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => onApply({ customBgDim: v })}
        />
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

/** Account section: live actions where the platform supports them today,
 *  clearly-labelled placeholders for the rest so the section is ready to grow. */
function AccountSettings() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded border border-white/10 bg-white/[0.02] p-2.5">
        <div>
          <div className="text-[13px] font-medium text-parchment">Profile</div>
          <p className="text-[11px] text-parchment-500">Avatar, bio, and game history</p>
        </div>
        <Link href="/profile" className="btn-ghost rounded px-3 py-1.5 text-[12px] font-display">
          Edit profile
        </Link>
      </div>
      {[
        { label: "Change username", hint: "Not available yet" },
        { label: "Change password", hint: "Not available yet" },
        { label: "Email preferences", hint: "Coming soon" },
        { label: "Log out of all devices", hint: "Coming soon" },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-3 rounded border border-white/5 bg-white/[0.01] p-2.5 opacity-60"
        >
          <div className="text-[13px] font-medium text-parchment-300">{item.label}</div>
          <span className="shrink-0 border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-500">
            {item.hint}
          </span>
        </div>
      ))}
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="w-full rounded border border-oxblood/40 bg-oxblood/10 px-3 py-2 text-[12px] font-display font-semibold text-oxblood-glow transition hover:bg-oxblood/20"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
