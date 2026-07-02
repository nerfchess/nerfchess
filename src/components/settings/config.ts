// Data-driven description of the settings menu. Adding a new setting is a
// matter of editing the SECTIONS array below; the panel renders whatever it
// finds here. Every control is live and bound to real functionality, either
// through the `setting` key into the Settings model or a dedicated picker kind.

import {
  Accessibility,
  Gamepad2,
  Palette,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { AnimationSpeed, Settings } from "@/lib/settings";

// Setting keys that hold a boolean (valid targets for a live toggle) and those
// that hold a number (valid targets for a live slider), derived from the model
// so a rename in Settings is caught here at compile time.
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

export type Control =
  | { kind: "toggle"; setting: BoolKey }
  | { kind: "slider"; setting: NumKey; min: number; max: number; step: number; format?: (v: number) => string }
  | { kind: "animationSpeed"; options: Array<{ value: AnimationSpeed; label: string }> }
  | { kind: "accentColor" }
  | { kind: "boardTheme" }
  | { kind: "pieceTheme" }
  | { kind: "reset" };

export interface RowConfig {
  id: string;
  label: string;
  hint?: string;
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
        hint: "Never reveal their rule to you: no mid-game peek, no reveal at the end",
        control: { kind: "toggle", setting: "hideOpponentReveal" },
      },
      {
        id: "muteChat",
        label: "Mute chat",
        hint: "Hide in-game chat messages from opponents",
        control: { kind: "toggle", setting: "muteChat" },
      },
      {
        id: "confirmResign",
        label: "Confirm resign",
        hint: "Ask before resigning a game",
        control: { kind: "toggle", setting: "confirmResign" },
      },
      {
        id: "showCoordinates",
        label: "Show coordinates",
        control: { kind: "toggle", setting: "showCoordinates" },
      },
      {
        id: "highlightLastMove",
        label: "Highlight last move",
        control: { kind: "toggle", setting: "highlightLastMove" },
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
        id: "accentColor",
        label: "Accent color",
        control: { kind: "accentColor" },
      },
      {
        id: "uiScale",
        label: "UI scale",
        control: { kind: "slider", setting: "uiScale", min: 0.85, max: 1.15, step: 0.05, format: pct },
      },
      {
        id: "animationSpeed",
        label: "Animation speed",
        control: {
          kind: "animationSpeed",
          options: [
            { value: "off", label: "Off" },
            { value: "fast", label: "Fast" },
            { value: "normal", label: "Normal" },
          ],
        },
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
        id: "uiSounds",
        label: "UI sounds",
        hint: "Interface blips like piece selection",
        control: { kind: "toggle", setting: "uiSounds" },
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
        control: { kind: "toggle", setting: "highContrast" },
      },
      {
        id: "reducedMotion",
        label: "Reduced motion",
        hint: "Minimize animations and transitions",
        control: { kind: "toggle", setting: "reducedMotion" },
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
        control: { kind: "toggle", setting: "fpsCounter" },
      },
      {
        id: "resetSettings",
        label: "Reset settings",
        hint: "Restore every option to its default",
        control: { kind: "reset" },
      },
    ],
  },
];
