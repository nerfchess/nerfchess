"use client";

import { Fragment, useState } from "react";
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
import "./SettingsPanel.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);

  // Re-sync from storage each time the panel opens, matching the previous
  // behaviour where values were reloaded on open. Also start back on the
  // first tab so the panel always opens in the same place. Handled on the
  // open transition during render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSettings(loadSettings());
      setActiveTab(SECTIONS[0].id);
    }
  }

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

  // Pickers span a full row; simple controls sit inline on the right. Sliders
  // grow into the free row width instead of hugging a fixed size.
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
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="plate plate-raised dgn-slab settings-slab relative flex max-h-[88dvh] w-full max-w-[40rem] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Iron rivets in the slab corners, as an overlay so the carved-stone
            background layers underneath survive. Decorative only. */}
        <div aria-hidden className="dgn-rivets pointer-events-none absolute inset-0 z-10" />

        {/* Header: chiselled crown with an ember seam under it. */}
        <div className="settings-crown flex shrink-0 items-center justify-between border-b border-[color:var(--edge)] py-2.5 pl-5 pr-2.5">
          <h2 className="settings-title font-display text-xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="nav-icon-btn relative z-20 grid min-h-[44px] min-w-[44px] place-items-center text-parchment-400 hover:text-parchment"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: sconce rail (left on desktop, chip row on mobile) + the
            scrolling content pane. The pane height is fixed per viewport so
            the slab never jumps between tabs. */}
        <div className="flex min-h-0 flex-col sm:flex-row">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[color:var(--edge)] px-2 py-2 sm:w-44 sm:flex-col sm:gap-0.5 sm:overflow-x-hidden sm:overflow-y-auto sm:border-b-0 sm:border-r sm:py-2.5"
          >
            {SECTIONS.map((section) => {
              const selected = section.id === activeTab;
              return (
                <button
                  key={section.id}
                  id={`settings-tab-${section.id}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls="settings-tabpanel"
                  onClick={() => setActiveTab(section.id)}
                  className="settings-tab flex min-h-[44px] shrink-0 items-center gap-2 px-3 font-display text-[14px] sm:w-full sm:text-[13px]"
                >
                  <section.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{section.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active tab's rows, grouped under small eyebrow sub-headers where
              the config declares groups. Fixed height (viewport-aware) so
              switching tabs doesn't resize the slab; scrolls when a tab
              outgrows it. Native selects escape no container, so nothing
              clips. */}
          <div
            role="tabpanel"
            id="settings-tabpanel"
            aria-labelledby={`settings-tab-${activeSection.id}`}
            className="h-[min(32rem,60dvh)] min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 sm:px-5"
          >
            {activeSection.rows.map((row, i) => {
              const prevGroup = activeSection.rows[i - 1]?.group;
              const opensGroup = row.group != null && row.group !== prevGroup;
              return (
                <Fragment key={row.id}>
                  {opensGroup && (
                    <div className={"flex items-center gap-2.5 pb-1 " + (i === 0 ? "pt-2.5" : "pt-4")}>
                      <span className="eyebrow">{row.group}</span>
                      <span aria-hidden className="h-px flex-1 bg-[color:var(--edge)]" />
                    </div>
                  )}
                  <div className={!opensGroup && i > 0 ? "border-t border-[color:var(--edge)]" : ""}>
                    <SettingRow
                      label={row.label}
                      hint={row.hint}
                      stacked={isStacked(row.control)}
                      grow={row.control.kind === "slider"}
                      control={renderControl(row.control, row.label)}
                    />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A small gem set into a picker card's corner when it is the chosen one. */
function SelectedGem() {
  return (
    <span
      aria-hidden
      className="absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 rotate-45 bg-gold-leaf shadow-[0_0_6px_1px_rgb(var(--accent-hi-rgb)/0.6)]"
    />
  );
}

/** Shared treasure treatment for picker cards: gold ring + faint glow when
 *  selected, a firmer edge on hover otherwise. */
const pickerCardClass = (selected: boolean) =>
  selected
    ? "border-gold/80 bg-gold/10 shadow-[0_0_16px_-8px_rgb(var(--accent-hi-rgb)/0.55)]"
    : "border-[color:var(--edge)] hover:border-[color:var(--edge-strong)] hover:bg-white/[0.03]";

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
              "group press relative overflow-hidden rounded-[1px] border text-left transition-colors " +
              pickerCardClass(selected)
            }
          >
            {selected && <SelectedGem />}
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
              <span className="block font-display text-[13px] leading-tight text-parchment">
                {t.label}
              </span>
              <span className="block text-[12px] leading-tight text-parchment-400">{t.hint}</span>
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

  // Track external changes (reset, server sync); adjust on the change during
  // render rather than in an effect.
  const [prevUrl, setPrevUrl] = useState(url);
  if (prevUrl !== url) {
    setPrevUrl(url);
    setDraft(url);
    setInvalid(false);
  }

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
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-ghost press relative min-h-[36px] cursor-pointer rounded-[1px] px-3 py-1.5 font-display text-[13px]">
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
              className="h-8 w-12 shrink-0 rounded-[2px] border border-[color:var(--edge-strong)] bg-cover bg-center"
              style={{ backgroundImage: `url("${data}")` }}
            />
            <GhostButton label="Remove" onClick={() => onApply({ customBgData: "" })} />
          </>
        )}
      </div>
      {uploadError && <p className="text-[12px] text-oxblood-glow">{uploadError}</p>}
      {data && (
        <p className="text-[12px] text-parchment-400">
          Uploaded backgrounds stay on this device and override the URL below.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
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
          className="input-rune min-h-[36px] w-full min-w-0 flex-1 basis-40 rounded-[1px] px-3 py-1.5 text-[13px]"
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
        <p className="text-[12px] text-oxblood-glow">Use a direct http(s) image link.</p>
      )}
      <div className="flex min-h-[36px] items-center justify-between gap-3">
        <span className="text-[12px] text-parchment-400">Dim</span>
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
            aria-pressed={selected}
            className={
              "press relative flex min-h-[44px] items-center gap-2.5 rounded-[1px] border p-2 transition-colors " +
              pickerCardClass(selected)
            }
          >
            {selected && <SelectedGem />}
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
            aria-pressed={selected}
            className={
              "press relative flex min-h-[44px] items-center gap-2.5 rounded-[1px] border p-2 transition-colors " +
              pickerCardClass(selected)
            }
          >
            {selected && <SelectedGem />}
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
      <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.02] p-2.5">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-parchment-100">Profile</div>
          <p className="text-[12px] text-parchment-400">Avatar, bio, and game history</p>
        </div>
        <Link
          href="/profile"
          className="btn-ghost press min-h-[36px] shrink-0 rounded-[1px] px-3 py-1.5 font-display text-[13px]"
        >
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
          className="flex min-h-[44px] items-center justify-between gap-3 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.01] p-2.5 opacity-70"
        >
          <div className="text-[13px] font-medium text-parchment-300">{item.label}</div>
          <span
            className="rune-badge shrink-0"
            style={{ ["--badge-rgb" as string]: "152 145 127" }}
          >
            {item.hint}
          </span>
        </div>
      ))}
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="btn-cursed press min-h-[44px] w-full rounded-[1px] px-3 py-2 font-display text-[13px] font-semibold"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
