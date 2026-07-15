// Data-driven description of the settings menu. Adding a new setting is a
// matter of editing the SECTIONS array below; the panel renders whatever it
// finds here. Every control is live and bound to real functionality, either
// through the `setting` key into the Settings model or a dedicated picker kind.

import {
  Accessibility,
  Gamepad2,
  Grid3x3,
  Palette,
  SlidersHorizontal,
  UserRound,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { AnimationSpeed, Settings, SoundTheme } from "@/lib/settings";

// Setting keys that hold a boolean (valid targets for a live toggle) and those
// that hold a number (valid targets for a live slider), derived from the model
// so a rename in Settings is caught here at compile time.
type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

export type Control =
  | { kind: "toggle"; setting: BoolKey }
  | { kind: "slider"; setting: NumKey; min: number; max: number; step: number; format?: (v: number) => string }
  | { kind: "animationSpeed"; options: Array<{ value: AnimationSpeed; label: string }> }
  | { kind: "siteTheme" }
  | { kind: "soundTheme"; options: Array<{ value: SoundTheme; label: string }> }
  | { kind: "accentColor" }
  | { kind: "customBg" }
  | { kind: "boardTheme" }
  | { kind: "pieceTheme" }
  | { kind: "account" }
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
        id: "premovesEnabled",
        label: "Premoves",
        hint: "Queue your next move during the opponent's turn",
        control: { kind: "toggle", setting: "premovesEnabled" },
      },
      {
        id: "confirmMove",
        label: "Move confirmation",
        hint: "Require a confirm tap before each move is sent, for slower time controls",
        control: { kind: "toggle", setting: "confirmMove" },
      },
      {
        id: "showLegalMoves",
        label: "Show legal moves",
        hint: "Mark the squares a selected piece can move to",
        control: { kind: "toggle", setting: "showLegalMoves" },
      },
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
        id: "confirmResign",
        label: "Confirm resign",
        hint: "Ask before resigning a game",
        control: { kind: "toggle", setting: "confirmResign" },
      },
      {
        id: "confirmDrawOffer",
        label: "Confirm draw offers",
        hint: "Ask before sending a draw offer",
        control: { kind: "toggle", setting: "confirmDrawOffer" },
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
    ],
  },
  {
    id: "board",
    title: "Board & Pieces",
    icon: Grid3x3,
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
        id: "boardSize",
        label: "Board size",
        control: { kind: "slider", setting: "boardSize", min: 0.8, max: 1.1, step: 0.05, format: pct },
      },
      {
        id: "largerPieces",
        label: "Larger pieces",
        hint: "Draw pieces bigger inside their squares",
        control: { kind: "toggle", setting: "largerPieces" },
      },
      {
        id: "flipBoard",
        label: "Flip board",
        hint: "View the board from the opponent's side",
        control: { kind: "toggle", setting: "flipBoard" },
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
      {
        id: "checkHighlight",
        label: "Check highlight",
        hint: "Tint the checked king's square red",
        control: { kind: "toggle", setting: "checkHighlight" },
      },
      {
        id: "animationSpeed",
        label: "Move animations",
        control: {
          kind: "animationSpeed",
          options: [
            { value: "off", label: "Off" },
            { value: "fast", label: "Fast" },
            { value: "normal", label: "Normal" },
          ],
        },
      },
      {
        id: "fxDuration",
        label: "Card effect duration",
        hint: "How long card-use animations play, from snappy to lingering",
        control: { kind: "slider", setting: "fxDuration", min: 0.5, max: 2, step: 0.1, format: pct },
      },
    ],
  },
  {
    id: "audio",
    title: "Sound",
    icon: Volume2,
    rows: [
      {
        id: "soundEnabled",
        label: "All sounds",
        hint: "Master switch for every game sound",
        control: { kind: "toggle", setting: "soundEnabled" },
      },
      {
        id: "volume",
        label: "Volume",
        control: { kind: "slider", setting: "volume", min: 0, max: 1, step: 0.05, format: pct },
      },
      {
        id: "soundTheme",
        label: "Sound set",
        hint: "Lichess standard sounds, or the classic synth clicks",
        control: {
          kind: "soundTheme",
          options: [
            { value: "lichess", label: "Lichess" },
            { value: "classic", label: "Classic" },
          ],
        },
      },
      {
        id: "moveSound",
        label: "Move sound",
        control: { kind: "toggle", setting: "moveSound" },
      },
      {
        id: "captureSound",
        label: "Capture sound",
        control: { kind: "toggle", setting: "captureSound" },
      },
      {
        id: "checkSound",
        label: "Check sound",
        control: { kind: "toggle", setting: "checkSound" },
      },
      {
        id: "gameEndSound",
        label: "Game end sound",
        control: { kind: "toggle", setting: "gameEndSound" },
      },
      {
        id: "uiSounds",
        label: "UI sounds",
        hint: "Interface blips like piece selection",
        control: { kind: "toggle", setting: "uiSounds" },
      },
      {
        id: "lowTimeWarning",
        label: "Low-time warning",
        hint: "Ticking alert when your clock runs low",
        control: { kind: "toggle", setting: "lowTimeWarning" },
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
    rows: [
      {
        id: "siteTheme",
        label: "Theme",
        hint: "Full site palettes: pick a mood",
        control: { kind: "siteTheme" },
      },
      {
        id: "accentColor",
        label: "Accent color",
        control: { kind: "accentColor" },
      },
      {
        id: "customBg",
        label: "Custom background",
        hint: "Upload an image or paste an http(s) URL, with an adjustable dim",
        control: { kind: "customBg" },
      },
      {
        id: "uiScale",
        label: "UI scale",
        control: { kind: "slider", setting: "uiScale", min: 0.85, max: 1.15, step: 0.05, format: pct },
      },
      {
        id: "compactMode",
        label: "Compact mode",
        hint: "Tighter interface density",
        control: { kind: "toggle", setting: "compactMode" },
      },
      {
        id: "reducedMotion",
        label: "Reduced motion",
        hint: "Minimize animations and transitions",
        control: { kind: "toggle", setting: "reducedMotion" },
      },
      {
        id: "perfMode",
        label: "Performance mode",
        hint: "Drops heavy blur/grain effects for smoother play on low-end devices",
        control: { kind: "toggle", setting: "perfMode" },
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    icon: UserRound,
    rows: [
      {
        id: "account",
        label: "Account",
        control: { kind: "account" },
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
        hint: "Brighter text and firmer borders",
        control: { kind: "toggle", setting: "highContrast" },
      },
      {
        id: "largerPiecesA11y",
        label: "Larger pieces",
        hint: "Also available under Board & Pieces",
        control: { kind: "toggle", setting: "largerPieces" },
      },
      {
        id: "largerText",
        label: "Larger text",
        hint: "Scales the whole interface (same as UI scale)",
        control: { kind: "slider", setting: "uiScale", min: 0.85, max: 1.15, step: 0.05, format: pct },
      },
      {
        id: "reducedMotionA11y",
        label: "Reduced motion",
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
