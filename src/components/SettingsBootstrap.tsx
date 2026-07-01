"use client";

import { useEffect } from "react";
import { applyBoardTheme, applyPieceTheme, loadSettings } from "@/lib/settings";
import { setVolume } from "@/lib/sounds";

export function SettingsBootstrap() {
  useEffect(() => {
    const s = loadSettings();
    applyBoardTheme(s.boardTheme);
    applyPieceTheme(s.pieceTheme);
    setVolume(s.volume);
  }, []);
  return null;
}
