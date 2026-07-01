// Data-driven description of the settings menu. Adding a new setting — or a new
// "Coming soon" placeholder — is a matter of editing the SECTIONS array below;
// the panel renders whatever it finds here. The `live` controls are wired to
// real functionality (via the `setting` key into the Settings model, or a
// dedicated picker kind); everything prefixed `ph-` is a disabled placeholder
// for a future feature.

import {
  Accessibility,
  Gamepad2,
  Palette,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { Settings } from "@/lib/settings";

// Setting keys that hold a boolean (valid targets for a live toggle) and those
// that hold a number (valid targets for a live slider), derived from the model
// so a rename in Settings is caught here at compile time.
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

export type Control =
  // Live, functional controls — bound to the persisted Settings object.
  | { kind: "toggle"; setting: BoolKey }
  | { kind: "slider"; setting: NumKey; min: number; max: number; step: number; format?: (v: number) => string }
  | { kind: "boardTheme" }
  | { kind: "pieceTheme" }
  // Placeholder controls — purely visual, always disabled.
  | { kind: "ph-toggle"; on?: boolean }
  | { kind: "ph-slider"; value: number }
  | { kind: "ph-select"; value: string }
  | { kind: "ph-swatches"; colors: string[] }
  | { kind: "ph-button"; label: string };

export interface RowConfig {
  id: string;
  label: string;
  hint?: string;
  comingSoon?: boolean;
  control: Control;
}

export interface SectionConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  rows: RowConfig[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SECTIONS: SectionConfig[] = [
  {
    id: "gameplay",
    title: "Gameplay",
    icon: Gamepad2,
    rows: [
      {
        id: "moveRiskWarnings",
        label: "Move risk warnings",
        hint: "Tint move dots yellow (self-loss) or red (into check)",
        control: { kind: "toggle", setting: "moveRiskWarnings" },
      },
      {
        id: "autoQueen",
        label: "Auto-queen promotions",
        hint: "Skip the piece picker and always promote to queen",
        control: { kind: "toggle", setting: "autoQueen" },
      },
      {
        id: "hideOpponentReveal",
        label: "Keep opponent's rule hidden",
        hint: "Never reveal their rule to you — no mid-game peek, no reveal at the end",
        control: { kind: "toggle", setting: "hideOpponentReveal" },
      },
      {
        id: "confirmResign",
        label: "Confirm resign",
        comingSoon: true,
        control: { kind: "ph-toggle", on: true },
      },
      {
        id: "confirmRestart",
        label: "Confirm restart",
        comingSoon: true,
        control: { kind: "ph-toggle" },
      },
      {
        id: "showCoordinates",
        label: "Show coordinates",
        comingSoon: true,
        control: { kind: "ph-toggle", on: true },
      },
      {
        id: "highlightLastMove",
        label: "Highlight last move",
        comingSoon: true,
        control: { kind: "ph-toggle", on: true },
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
    rows: [
      {
        id: "boardTheme",
        label: "Board theme",
        control: { kind: "boardTheme" },
      },
      {
        id: "pieceTheme",
        label: "Piece set",
        control: { kind: "pieceTheme" },
      },
      {
        id: "uiScale",
        label: "UI scale",
        comingSoon: true,
        control: { kind: "ph-slider", value: 0.5 },
      },
      {
        id: "accentColor",
        label: "Accent color",
        comingSoon: true,
        control: { kind: "ph-swatches", colors: ["#d8b56e", "#5a9b7a", "#7c7aa3", "#b54641"] },
      },
      {
        id: "animationSpeed",
        label: "Animation speed",
        comingSoon: true,
        control: { kind: "ph-select", value: "Normal" },
      },
    ],
  },
  {
    id: "audio",
    title: "Audio",
    icon: Volume2,
    rows: [
      {
        id: "volume",
        label: "Master volume",
        control: { kind: "slider", setting: "volume", min: 0, max: 1, step: 0.05, format: pct },
      },
      {
        id: "musicVolume",
        label: "Music volume",
        comingSoon: true,
        control: { kind: "ph-slider", value: 0.6 },
      },
      {
        id: "uiSounds",
        label: "UI sounds",
        comingSoon: true,
        control: { kind: "ph-toggle", on: true },
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    icon: Accessibility,
    rows: [
      {
        id: "highContrast",
        label: "High contrast",
        comingSoon: true,
        control: { kind: "ph-toggle" },
      },
      {
        id: "reducedMotion",
        label: "Reduced motion",
        hint: "Minimize animations and transitions",
        comingSoon: true,
        control: { kind: "ph-toggle" },
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    icon: SlidersHorizontal,
    rows: [
      {
        id: "fpsCounter",
        label: "FPS counter",
        comingSoon: true,
        control: { kind: "ph-toggle" },
      },
      {
        id: "resetSettings",
        label: "Reset settings",
        hint: "Restore every option to its default",
        comingSoon: true,
        control: { kind: "ph-button", label: "Reset" },
      },
    ],
  },
];
