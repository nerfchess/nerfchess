"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  BOARD_THEMES,
  BoardTheme,
  PIECE_THEMES,
  PieceTheme,
  loadSettings,
  saveSettings,
} from "@/lib/settings";
import { setVolume } from "@/lib/sounds";
import { Piece } from "@/components/Pieces";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: Props) {
  const [theme, setTheme] = useState<BoardTheme>("wood");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("classic");
  const [vol, setVol] = useState(0.8);
  const [moveRiskWarnings, setMoveRiskWarnings] = useState(true);
  const [autoQueen, setAutoQueen] = useState(false);
  const [hideOpponentReveal, setHideOpponentReveal] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setTheme(s.boardTheme);
    setPieceTheme(s.pieceTheme);
    setVol(s.volume);
    setMoveRiskWarnings(s.moveRiskWarnings);
    setAutoQueen(s.autoQueen);
    setHideOpponentReveal(s.hideOpponentReveal);
  }, [open]);

  if (!open) return null;

  const update = (next: {
    boardTheme?: BoardTheme;
    pieceTheme?: PieceTheme;
    volume?: number;
    moveRiskWarnings?: boolean;
    autoQueen?: boolean;
    hideOpponentReveal?: boolean;
  }) => {
    const merged = {
      boardTheme: next.boardTheme ?? theme,
      pieceTheme: next.pieceTheme ?? pieceTheme,
      volume: next.volume ?? vol,
      moveRiskWarnings: next.moveRiskWarnings ?? moveRiskWarnings,
      autoQueen: next.autoQueen ?? autoQueen,
      hideOpponentReveal: next.hideOpponentReveal ?? hideOpponentReveal,
    };
    saveSettings(merged);
    if (next.boardTheme) setTheme(next.boardTheme);
    if (next.pieceTheme) setPieceTheme(next.pieceTheme);
    if (next.volume != null) {
      setVol(next.volume);
      setVolume(next.volume);
    }
    if (next.moveRiskWarnings != null) setMoveRiskWarnings(next.moveRiskWarnings);
    if (next.autoQueen != null) setAutoQueen(next.autoQueen);
    if (next.hideOpponentReveal != null) setHideOpponentReveal(next.hideOpponentReveal);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="plate gilt p-6 w-full max-w-md relative max-h-[86vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="font-display text-2xl font-bold text-parchment-100">Settings</div>
          <button
            onClick={onClose}
            className="text-parchment-400 hover:text-parchment text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-7">
          <Section title="Board">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((k) => {
                const t = BOARD_THEMES[k];
                const selected = theme === k;
                return (
                  <button
                    key={k}
                    onClick={() => update({ boardTheme: k })}
                    className={
                      "flex items-center gap-3 p-2 border transition " +
                      (selected
                        ? "border-gold/70 bg-gold/10"
                        : "border-white/10 hover:border-white/25")
                    }
                  >
                    <span className="grid grid-cols-2 grid-rows-2 w-8 h-8 overflow-hidden shrink-0">
                      <span style={{ background: t.light }} />
                      <span style={{ background: t.dark }} />
                      <span style={{ background: t.dark }} />
                      <span style={{ background: t.light }} />
                    </span>
                    <span className="text-sm text-parchment-100">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Pieces">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PIECE_THEMES) as PieceTheme[]).map((k) => {
                const t = PIECE_THEMES[k];
                const selected = pieceTheme === k;
                return (
                  <button
                    key={k}
                    onClick={() => update({ pieceTheme: k })}
                    className={
                      "flex items-center gap-3 p-2 border transition " +
                      (selected
                        ? "border-gold/70 bg-gold/10"
                        : "border-white/10 hover:border-white/25")
                    }
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 shrink-0 bg-ink-700"
                      style={
                        {
                          "--piece-w-fill": t.wFill,
                          "--piece-w-stroke": t.wStroke,
                          "--piece-b-fill": t.bFill,
                          "--piece-b-stroke": t.bStroke,
                        } as CSSProperties
                      }
                    >
                      <Piece type="n" color="w" size={17} />
                      <Piece type="n" color="b" size={17} className="-ml-1" />
                    </span>
                    <span className="text-sm text-parchment-100">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Sound">
            <div className="flex items-center justify-between mb-2">
              <span className="smallcaps text-[11px] text-parchment-400">Volume</span>
              <span className="font-mono text-[11px] text-parchment-300">{Math.round(vol * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => update({ volume: parseFloat(e.target.value) })}
              className="w-full accent-gold-leaf"
            />
          </Section>

          <Section title="Gameplay">
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="smallcaps text-[11px] text-parchment-400">
                  Move risk warnings
                  <span className="block normal-case text-[11px] text-parchment-500 mt-0.5">
                    Tint move dots yellow (self-loss) or red (into check)
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={moveRiskWarnings}
                  onChange={(e) => update({ moveRiskWarnings: e.target.checked })}
                  className="accent-gold-leaf w-4 h-4 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="smallcaps text-[11px] text-parchment-400">
                  Auto-queen promotions
                  <span className="block normal-case text-[11px] text-parchment-500 mt-0.5">
                    Skip the piece picker and always promote to queen
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={autoQueen}
                  onChange={(e) => update({ autoQueen: e.target.checked })}
                  className="accent-gold-leaf w-4 h-4 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="smallcaps text-[11px] text-parchment-400">
                  Keep opponent's rule hidden
                  <span className="block normal-case text-[11px] text-parchment-500 mt-0.5">
                    Never reveal their rule to you — no mid-game peek, no reveal at the end
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={hideOpponentReveal}
                  onChange={(e) => update({ hideOpponentReveal: e.target.checked })}
                  className="accent-gold-leaf w-4 h-4 shrink-0"
                />
              </label>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="rule-ornament mb-3">
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
