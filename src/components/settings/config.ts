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
  | { kind: "customBg" }
  | { kind: "boardTheme" }
  | { kind: "pieceTheme" }
  | { kind: "account" }
  | { kind: "reset" };

export interface RowConfig {
  id: string;
  label: string;
  hint?: string;
  /** Optional sub-header: consecutive rows sharing a group render under one
   *  small eyebrow label, so long sections stay scannable. */
  group?: string;
  control: Control;
}

export interface SectionConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  /** One short line on the drill-down home card: what lives in this section.
   *  Written as content, not a sales pitch; keep it under ~8 words. */
  blurb: string;
  rows: RowConfig[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SECTIONS: SectionConfig[] = [
  {
    id: "gameplay",
    title: "Gameplay",
    blurb: "Moves, confirmations, opponent",
    icon: Gamepad2,
    rows: [
      {
        id: "premovesEnabled",
        label: "Premoves",
        hint: "Queue your next move during the opponent's turn",
        group: "Moves",
        control: { kind: "toggle", setting: "premovesEnabled" },
      },
      {
        id: "confirmMove",
        label: "Move confirmation",
        hint: "Require a confirm tap before each move is sent, for slower time controls",
        group: "Moves",
        control: { kind: "toggle", setting: "confirmMove" },
      },
      {
        id: "showLegalMoves",
        label: "Show legal moves",
        hint: "Mark the squares a selected piece can move to",
        group: "Moves",
        control: { kind: "toggle", setting: "showLegalMoves" },
      },
      {
        id: "moveRiskWarnings",
        label: "Move risk warnings",
        hint: "Tint move dots yellow (self-loss) or red (into check)",
        group: "Moves",
        control: { kind: "toggle", setting: "moveRiskWarnings" },
      },
      {
        id: "autoQueen",
        label: "Auto-queen promotions",
        hint: "Skip the piece picker and always promote to queen",
        group: "Moves",
        control: { kind: "toggle", setting: "autoQueen" },
      },
      {
        id: "confirmResign",
        label: "Confirm resign",
        group: "Confirmations",
        control: { kind: "toggle", setting: "confirmResign" },
      },
      {
        id: "confirmDrawOffer",
        label: "Confirm draw offers",
        group: "Confirmations",
        control: { kind: "toggle", setting: "confirmDrawOffer" },
      },
      {
        id: "hideOpponentReveal",
        label: "Keep opponent's rule hidden",
        hint: "Never reveal their rule to you: no mid-game peek, no reveal at the end",
        group: "Opponent",
        control: { kind: "toggle", setting: "hideOpponentReveal" },
      },
      {
        id: "muteChat",
        label: "Mute chat",
        group: "Opponent",
        control: { kind: "toggle", setting: "muteChat" },
      },
    ],
  },
  {
    id: "board",
    title: "Board & Pieces",
    blurb: "Board and piece themes, layout",
    icon: Grid3x3,
    rows: [
      {
        id: "boardTheme",
        label: "Board theme",
        group: "Themes",
        control: { kind: "boardTheme" },
      },
      {
        id: "pieceTheme",
        label: "Piece set",
        group: "Themes",
        control: { kind: "pieceTheme" },
      },
      {
        id: "boardSize",
        label: "Board size",
        group: "Layout",
        control: { kind: "slider", setting: "boardSize", min: 0.8, max: 1.1, step: 0.05, format: pct },
      },
      {
        id: "largerPieces",
        label: "Larger pieces",
        group: "Layout",
        control: { kind: "toggle", setting: "largerPieces" },
      },
      {
        id: "flipBoard",
        label: "Flip board",
        group: "Layout",
        control: { kind: "toggle", setting: "flipBoard" },
      },
      {
        id: "showCoordinates",
        label: "Show coordinates",
        group: "Layout",
        control: { kind: "toggle", setting: "showCoordinates" },
      },
      {
        id: "highlightLastMove",
        label: "Highlight last move",
        group: "Highlights",
        control: { kind: "toggle", setting: "highlightLastMove" },
      },
      {
        id: "checkHighlight",
        label: "Check highlight",
        hint: "Tint the checked king's square red",
        group: "Highlights",
        control: { kind: "toggle", setting: "checkHighlight" },
      },
      {
        id: "animationSpeed",
        label: "Move animations",
        group: "Motion",
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
        group: "Motion",
        control: { kind: "slider", setting: "fxDuration", min: 0.5, max: 2, step: 0.1, format: pct },
      },
    ],
  },
  {
    id: "audio",
    title: "Sound",
    blurb: "Volume, game and interface sounds",
    icon: Volume2,
    rows: [
      {
        id: "soundEnabled",
        label: "All sounds",
        group: "Master",
        control: { kind: "toggle", setting: "soundEnabled" },
      },
      {
        id: "volume",
        label: "Volume",
        group: "Master",
        control: { kind: "slider", setting: "volume", min: 0, max: 1, step: 0.05, format: pct },
      },
      {
        id: "soundTheme",
        label: "Sound set",
        hint: "Lichess standard sounds, or the classic synth clicks",
        group: "Master",
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
        group: "Game sounds",
        control: { kind: "toggle", setting: "moveSound" },
      },
      {
        id: "captureSound",
        label: "Capture sound",
        group: "Game sounds",
        control: { kind: "toggle", setting: "captureSound" },
      },
      {
        id: "checkSound",
        label: "Check sound",
        group: "Game sounds",
        control: { kind: "toggle", setting: "checkSound" },
      },
      {
        id: "gameEndSound",
        label: "Game end sound",
        group: "Game sounds",
        control: { kind: "toggle", setting: "gameEndSound" },
      },
      {
        id: "uiSounds",
        label: "UI sounds",
        hint: "Piece-select blips",
        group: "Interface",
        control: { kind: "toggle", setting: "uiSounds" },
      },
      {
        id: "lowTimeWarning",
        label: "Low-time warning",
        hint: "Ticks when your clock runs low",
        group: "Interface",
        control: { kind: "toggle", setting: "lowTimeWarning" },
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    blurb: "Site theme, background, motion",
    icon: Palette,
    rows: [
      {
        id: "siteTheme",
        label: "Theme",
        group: "Theme",
        control: { kind: "siteTheme" },
      },
      {
        id: "zenMode",
        label: "Zen mode",
        hint: "During a game, hide everything but the board, clocks and moves. Press z to toggle.",
        group: "Theme",
        control: { kind: "toggle", setting: "zenMode" },
      },
      {
        id: "customBg",
        label: "Custom background",
        hint: "Upload an image or paste an http(s) URL, with an adjustable dim",
        group: "Background",
        control: { kind: "customBg" },
      },
      {
        id: "reducedMotion",
        label: "Reduced motion",
        group: "Motion",
        control: { kind: "toggle", setting: "reducedMotion" },
      },
      {
        id: "followSystemMotion",
        label: "Follow system motion",
        hint: "Follow your device's reduce-motion setting. Off by default so card plays stay visible; turning it on is not recommended.",
        group: "Motion",
        control: { kind: "toggle", setting: "followSystemMotion" },
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    blurb: "Profile and sign-in",
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
    blurb: "Motion",
    icon: Accessibility,
    rows: [
      {
        id: "reducedMotionA11y",
        label: "Reduced motion",
        control: { kind: "toggle", setting: "reducedMotion" },
      },
      {
        id: "followSystemMotionA11y",
        label: "Follow system motion",
        hint: "Follow your device's reduce-motion setting. Off by default so card plays stay visible; turning it on is not recommended.",
        control: { kind: "toggle", setting: "followSystemMotion" },
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    blurb: "Resets",
    icon: SlidersHorizontal,
    rows: [
      {
        id: "resetSettings",
        label: "Reset settings",
        hint: "Restore every option to its default",
        control: { kind: "reset" },
      },
    ],
  },
];
