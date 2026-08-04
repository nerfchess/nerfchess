"use client";

// Clip sharing modal, rebuilt as a TikTok-ready exporter. A deterministic
// canvas scene (clipScene.ts) replays the last plies with energy scenes,
// captions, and branding; encoding picks the best of three tiers
// (clipEncoder.ts): offline WebCodecs + mediabunny MP4, realtime
// MediaRecorder, or an honest "unsupported". No backend involved; the result
// is offered as a download and through the Web Share API where available.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardState, Color, Move } from "@/engine/types";
import type { GameResult } from "@/engine/game";
import {
  PIECE_THEMES,
  boardColors,
  loadSettings,
  resolvePieceTheme,
  sanitizeHexColor,
} from "@/lib/settings";
import { buildClipTimeline } from "./clipReplay";
import {
  biggestClipCard,
  buildClipScene,
  clipLayout,
  loadClipPieceImages,
  type CaptionStyle,
  type ClipAspect,
  type ClipScene,
  type ClipVerdict,
  type EmojiLevel,
  type PieceImageSource,
} from "./clipScene";
import {
  detectEncodeSupport,
  encodeClipOffline,
  recordClipRealtime,
  type EncodeSupport,
} from "./clipEncoder";
import { ClipRenderer, type ClipRendererHandle } from "./ClipRenderer";
import { useModalChrome } from "@/lib/useModalChrome";
import { Button } from "@/components/ui/Button";

const LENGTH_OPTIONS = [4, 6, 10] as const;
const ASPECTS: { id: ClipAspect; label: string }[] = [
  { id: "tiktok", label: "9:16" },
  { id: "square", label: "1:1" },
  { id: "classic", label: "Classic" },
];
const CAPTION_STYLES: { id: CaptionStyle; label: string }[] = [
  { id: "pop", label: "Word pop" },
  { id: "static", label: "Static" },
  { id: "off", label: "Off" },
];
const EMOJI_LEVELS: { id: EmojiLevel; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "tasteful", label: "Tasteful" },
  { id: "brainrot", label: "Brainrot" },
];
const HOOK_PRESETS = [
  "Wait for the last move",
  "He never saw it coming",
  "This card should be illegal",
  "Chess but with cards",
];

interface ClipOptionsState {
  aspect: ClipAspect;
  zoomPunch: boolean;
  screenShake: boolean;
  speedRamp: boolean;
  freezeStamp: boolean;
  momentumBar: boolean;
  moveCounter: boolean;
  captionStyle: CaptionStyle;
  emojiLevel: EmojiLevel;
  sound: boolean;
  watermarkOn: boolean;
  handle: string;
  endCard: boolean;
}

// "TikTok mode": the default preset, everything on.
const TIKTOK_MODE: ClipOptionsState = {
  aspect: "tiktok",
  zoomPunch: true,
  screenShake: true,
  speedRamp: true,
  freezeStamp: true,
  momentumBar: true,
  moveCounter: true,
  captionStyle: "pop",
  emojiLevel: "tasteful",
  sound: true,
  watermarkOn: true,
  handle: "nerfchess.com",
  endCard: true,
};

interface Props {
  open: boolean;
  onClose: () => void;
  moves: Move[];
  /** Per-ply board snapshots from the game page (history-review cache). */
  snapshots: ReadonlyMap<number, BoardState>;
  historyDiverged: boolean;
  /** Buff ids of signature plays keyed by history length at fire time. */
  signatureIds?: ReadonlyMap<number, string>;
  orientation: Color;
  playerNames: Record<Color, string>;
  result?: GameResult | null;
}

/** Small square-dot toggle built on the sanctioned Button primitive. */
function Chip({
  label,
  on,
  onClick,
  disabled,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      tone="ghost"
      size="xs"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={on ? "text-gold-leaf" : "text-parchment-300"}
    >
      <span
        aria-hidden
        className={"h-1.5 w-1.5 shrink-0 " + (on ? "bg-gold-leaf" : "bg-white/25")}
      />
      {label}
    </Button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="smallcaps mb-1 mt-3 text-[10px] text-parchment-400">{children}</p>;
}

export function ClipModal({
  open,
  onClose,
  moves,
  snapshots,
  historyDiverged,
  signatureIds,
  orientation,
  playerNames,
  result,
}: Props) {
  const chrome = useModalChrome(open, onClose);
  const [plies, setPlies] = useState<number>(6);
  const [opts, setOpts] = useState<ClipOptionsState>(TIKTOK_MODE);
  const [hook, setHook] = useState<string | null>(null); // null = auto default
  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const [support, setSupport] = useState<EncodeSupport | null>(null);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [clip, setClip] = useState<{
    url: string;
    blob: Blob;
    container: "mp4" | "webm";
    tier: 1 | 2;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const rendererRef = useRef<ClipRendererHandle | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const clipUrlRef = useRef<string | null>(null);

  // Board colors and piece sprites follow the player's settings so the clip
  // looks like THEIR board: custom board hexes come through boardColors, and
  // inline piece themes (plus custom piece colors) rasterize the site's own
  // SVG silhouettes rather than swapping to a lichess set.
  const { colors, pieceSource } = useMemo(() => {
    const s = loadSettings();
    let source: PieceImageSource;
    if (s.pieceTheme === "custom") {
      source = {
        kind: "inline",
        wFill: sanitizeHexColor(s.customPieceWFill, "#f2ead8"),
        wStroke: sanitizeHexColor(s.customPieceWStroke, "#3b332a"),
        bFill: sanitizeHexColor(s.customPieceBFill, "#2b2b31"),
        bStroke: sanitizeHexColor(s.customPieceBStroke, "#d8c9a8"),
      };
    } else {
      const t = PIECE_THEMES[resolvePieceTheme(s)] ?? PIECE_THEMES.classic;
      source = t.assetSet
        ? { kind: "asset", set: t.assetSet }
        : { kind: "inline", wFill: t.wFill, wStroke: t.wStroke, bFill: t.bFill, bStroke: t.bStroke };
    }
    return { colors: boardColors(s), pieceSource: source };
    // Re-read when the modal reopens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fonts and accent resolved once from the document's CSS variables.
  const { fonts, accent } = useMemo(() => {
    const fallback = {
      fonts: { display: "system-ui, sans-serif", body: "system-ui, sans-serif" },
      accent: "#d4a017", // gold literal, mirrors --accent-gold (canvas can't read CSS vars)
    };
    if (typeof document === "undefined") return fallback;
    const read = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const font = (name: string, fb: string) => {
      const v = read(name);
      return v ? `${v}, ${fb}` : fb;
    };
    return {
      fonts: {
        display: font("--font-display", "system-ui, sans-serif"),
        body: font("--font-body", "system-ui, sans-serif"),
      },
      accent: read("--accent-hi") || read("--accent") || fallback.accent,
    };
  }, []);

  const timeline = useMemo(
    () =>
      open
        ? buildClipTimeline({ moves, snapshots, historyDiverged, plies, signatureIds })
        : null,
    [open, moves, snapshots, historyDiverged, plies, signatureIds],
  );

  const bigCard = useMemo(() => (timeline ? biggestClipCard(timeline) : null), [timeline]);

  const hookSuggestion = bigCard ? `${bigCard.name} is broken` : HOOK_PRESETS[0];
  const hookText = hook ?? hookSuggestion;

  const verdict = useMemo<ClipVerdict | null>(() => {
    const coversEnd =
      !!timeline && timeline.startPly + timeline.segments.length >= moves.length;
    if (result && coversEnd) {
      if (result.winner === "draw") return { main: "DRAW", sub: result.reason };
      if (result.winner === "w" || result.winner === "b") {
        const name = playerNames[result.winner];
        if (result.reason === "no legal moves" || result.reason === "king captured") {
          return { main: "CHECKMATE", sub: `${name} wins` };
        }
        return {
          main: name.toLowerCase() === "you" ? "YOU WIN" : `${name.toUpperCase()} WINS`,
          sub: result.reason,
        };
      }
      return { main: "GAME OVER", sub: null };
    }
    if (bigCard) return { main: bigCard.name.toUpperCase(), sub: "signature play" };
    return { main: "TO BE CONTINUED", sub: null };
  }, [result, timeline, moves.length, playerNames, bigCard]);

  const scene = useMemo<ClipScene | null>(() => {
    if (!timeline) return null;
    return buildClipScene({
      timeline,
      orientation,
      colors,
      names: playerNames,
      aspect: opts.aspect,
      hookText,
      captionStyle: opts.captionStyle,
      emojiLevel: opts.emojiLevel,
      zoomPunch: opts.zoomPunch,
      screenShake: opts.screenShake,
      speedRamp: opts.speedRamp,
      freezeStamp: opts.freezeStamp,
      momentumBar: opts.momentumBar,
      moveCounter: opts.moveCounter,
      watermark: opts.watermarkOn ? opts.handle.trim() || "nerfchess.com" : null,
      endCard: opts.endCard,
      verdict,
      fonts,
      accent,
    });
  }, [timeline, orientation, colors, playerNames, opts, hookText, verdict, fonts, accent]);

  const discardClip = useCallback(() => {
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    clipUrlRef.current = null;
    setClip(null);
    setShared(false);
  }, []);

  // Piece sprites, loaded once per source (the modal mounts fresh per open,
  // so the initial null state already covers the loading readout).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadClipPieceImages(pieceSource).then((loaded) => {
      if (!cancelled) setImages(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [open, pieceSource]);

  // Which encode tier this browser gets, for the readout and the record path.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const L = clipLayout(opts.aspect);
    detectEncodeSupport(L.W, L.H, opts.sound).then((s) => {
      if (!cancelled) setSupport(s);
    });
    return () => {
      cancelled = true;
    };
  }, [open, opts.aspect, opts.sound]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Every option change invalidates the recorded take (frame 0 is burned into
  // the file, so even a caption edit means a re-record).
  const set = useCallback(
    <K extends keyof ClipOptionsState>(key: K, value: ClipOptionsState[K]) => {
      setOpts((o) => ({ ...o, [key]: value }));
      setError(null);
      discardClip();
    },
    [discardClip],
  );
  const editHook = useCallback(
    (value: string | null) => {
      setHook(value);
      discardClip();
    },
    [discardClip],
  );

  const record = async () => {
    if (!scene || !images || recording || !support) return;
    if (support.tier === 3) {
      setError("Recording isn't supported in this browser.");
      return;
    }
    discardClip();
    setError(null);
    setRecording(true);
    setProgress(support.tier === 1 ? 0 : null);
    try {
      let res: { blob: Blob; container: "mp4" | "webm"; tier: 1 | 2 };
      if (support.tier === 1) {
        res = await encodeClipOffline(scene, images, support, opts.sound, (f) =>
          setProgress(f),
        );
      } else {
        const canvas = rendererRef.current?.canvas;
        if (!canvas) throw new Error("no canvas");
        const rec = recordClipRealtime(canvas, scene, support, opts.sound);
        stopRef.current = rec.stop;
        // Restart the timeline in sync with the recorder; stop shortly after
        // the run completes so the final frame lands in the file.
        rendererRef.current?.restart(() => {
          window.setTimeout(() => rec.stop(), 250);
        });
        res = await rec.done;
        stopRef.current = null;
      }
      const url = URL.createObjectURL(res.blob);
      clipUrlRef.current = url;
      setClip({ url, blob: res.blob, container: res.container, tier: res.tier });
      // Surfaced for automated tests / debugging.
      console.log(`nerfchess clip recorded: ${res.blob.size} bytes`);
    } catch {
      setError("Recording failed in this browser. Try again or switch format.");
    }
    setRecording(false);
    setProgress(null);
  };

  const clipFile = useMemo(
    () =>
      clip
        ? new File([clip.blob], `nerfchess-clip.${clip.container}`, {
            type: clip.blob.type || `video/${clip.container}`,
          })
        : null,
    [clip],
  );
  const canShare =
    !!clipFile &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare &&
    navigator.canShare({ files: [clipFile] });

  const share = async () => {
    if (!clipFile) return;
    try {
      await navigator.share({ files: [clipFile], title: "Nerf Chess clip" });
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // User dismissed the share sheet; ignore.
    }
  };

  if (!open) return null;

  const durationSec = scene ? Math.round(scene.durationMs / 100) / 10 : null;
  const ready = !!scene && !!images && !!support;
  const previewMax =
    opts.aspect === "tiktok" ? "max-w-[15rem]" : opts.aspect === "square" ? "max-w-[20rem]" : "max-w-[22rem]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share a clip of the final moves"
      data-clip-modal
      data-clip-bytes={clip?.blob.size ?? 0}
      className="fixed inset-0 z-[60] grid place-items-center bg-[#0f0d0a]/70 px-4 py-6 backdrop-blur-sm"
      onPointerDown={chrome.onBackdropPointerDown}
    >
      <div
        className="plate plate-raised gilt relative w-[min(94vw,36rem)] max-h-[calc(100dvh-3rem)] overflow-y-auto p-5 shadow-2xl sm:p-6"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="card-corner tl" />
        <span className="card-corner tr" />
        <span className="card-corner bl" />
        <span className="card-corner br" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="smallcaps text-[10px] text-parchment-400">Clip the finish</p>
            <h2 className="mt-0.5 font-display text-2xl font-bold text-parchment">
              Share a replay clip
            </h2>
          </div>
          <Button
            tone="ghost"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center text-parchment-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
        <p className="mt-1 text-xs leading-snug text-parchment-400">
          A stylized replay of the last moves, cut for the feed: energy scenes on card
          plays, captions, and a verdict stamp, drawn in the clip&apos;s own look.
        </p>

        {timeline && scene ? (
          <>
            <div className="mt-4">
              <ClipRenderer
                ref={rendererRef}
                scene={scene}
                images={images}
                className={`mx-auto block w-full ${previewMax} border border-white/10 shadow-plate`}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-parchment-400">
                {timeline.segments.length < plies
                  ? `${timeline.segments.length} replayable plies`
                  : durationSec
                    ? `~${durationSec}s`
                    : ""}
              </span>
              <span className="text-[11px] text-parchment-400" data-clip-tier={support?.tier ?? 0}>
                {support ? support.detail : "Checking encoder..."}
              </span>
            </div>

            <GroupLabel>Format</GroupLabel>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1" role="group" aria-label="Aspect">
                {ASPECTS.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.label}
                    on={opts.aspect === a.id}
                    onClick={() => set("aspect", a.id)}
                    disabled={recording}
                  />
                ))}
              </div>
              <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
              <div className="flex items-center gap-1" role="group" aria-label="Clip length">
                <span className="smallcaps text-[10px] text-parchment-400">Last</span>
                {LENGTH_OPTIONS.map((num) => (
                  <Chip
                    key={num}
                    label={String(num)}
                    on={plies === num}
                    onClick={() => {
                      setPlies(num);
                      setError(null);
                      discardClip();
                    }}
                    disabled={recording}
                  />
                ))}
                <span className="smallcaps text-[10px] text-parchment-400">plies</span>
              </div>
              <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
              <Button
                tone="ghost"
                size="xs"
                disabled={recording}
                onClick={() => {
                  setOpts(TIKTOK_MODE);
                  editHook(null);
                }}
                className="text-parchment-300"
              >
                TikTok mode
              </Button>
            </div>

            <GroupLabel>Energy</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Zoom punch" on={opts.zoomPunch} onClick={() => set("zoomPunch", !opts.zoomPunch)} disabled={recording} />
              <Chip label="Shake" on={opts.screenShake} onClick={() => set("screenShake", !opts.screenShake)} disabled={recording} />
              <Chip label="Speed ramp" on={opts.speedRamp} onClick={() => set("speedRamp", !opts.speedRamp)} disabled={recording} />
              <Chip label="Verdict stamp" on={opts.freezeStamp} onClick={() => set("freezeStamp", !opts.freezeStamp)} disabled={recording} />
              <Chip label="Momentum bar" on={opts.momentumBar} onClick={() => set("momentumBar", !opts.momentumBar)} disabled={recording} />
              <Chip label="Move counter" on={opts.moveCounter} onClick={() => set("moveCounter", !opts.moveCounter)} disabled={recording} />
            </div>

            <GroupLabel>Captions</GroupLabel>
            <input
              type="text"
              value={hookText}
              maxLength={80}
              disabled={recording}
              onChange={(e) => editHook(e.target.value)}
              aria-label="Hook caption"
              placeholder="Hook text burned at the top"
              className="w-full border border-white/15 bg-white/[0.03] px-2.5 py-1.5 font-display text-sm text-parchment placeholder:text-parchment-400 focus:border-gold/60 focus:outline-none"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[hookSuggestion, ...HOOK_PRESETS.filter((p) => p !== hookSuggestion)].slice(0, 5).map((preset) => (
                <Chip
                  key={preset}
                  label={preset}
                  on={hookText === preset}
                  onClick={() => editHook(preset)}
                  disabled={recording}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="smallcaps text-[10px] text-parchment-400">Style</span>
              {CAPTION_STYLES.map((cs) => (
                <Chip
                  key={cs.id}
                  label={cs.label}
                  on={opts.captionStyle === cs.id}
                  onClick={() => set("captionStyle", cs.id)}
                  disabled={recording}
                />
              ))}
              <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
              <span className="smallcaps text-[10px] text-parchment-400">Emoji</span>
              {EMOJI_LEVELS.map((el) => (
                <Chip
                  key={el.id}
                  label={el.label}
                  on={opts.emojiLevel === el.id}
                  onClick={() => set("emojiLevel", el.id)}
                  disabled={recording}
                />
              ))}
            </div>

            <GroupLabel>Sound</GroupLabel>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Game sound" on={opts.sound} onClick={() => set("sound", !opts.sound)} disabled={recording} />
            </div>

            <GroupLabel>Branding</GroupLabel>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip label="Watermark" on={opts.watermarkOn} onClick={() => set("watermarkOn", !opts.watermarkOn)} disabled={recording} />
              <input
                type="text"
                value={opts.handle}
                maxLength={40}
                disabled={recording || !opts.watermarkOn}
                onChange={(e) => set("handle", e.target.value)}
                aria-label="Watermark handle"
                className="min-w-0 flex-1 border border-white/15 bg-white/[0.03] px-2.5 py-1 font-display text-xs text-parchment placeholder:text-parchment-400 focus:border-gold/60 focus:outline-none disabled:opacity-40"
              />
              <Chip label="End card" on={opts.endCard} onClick={() => set("endCard", !opts.endCard)} disabled={recording} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <Button
                tone={recording ? "ghost" : "leaf"}
                onClick={record}
                disabled={recording || !ready}
                data-clip-record
                className={"font-semibold " + (recording ? "opacity-80 cursor-default" : "")}
              >
                {recording ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 animate-pulse rounded-full bg-oxblood-glow"
                    />
                    {progress !== null
                      ? `Rendering ${Math.round(progress * 100)}%`
                      : "Recording..."}
                  </span>
                ) : !ready ? (
                  "Loading..."
                ) : clip ? (
                  "Re-record"
                ) : (
                  "Record clip"
                )}
              </Button>
            </div>

            {error && (
              <p role="alert" className="mt-2 text-xs text-oxblood-glow">
                {error}
              </p>
            )}

            {clip && (
              <div className="mt-3 border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="smallcaps text-[10px] text-parchment-400">
                    Clip ready · {(clip.blob.size / 1024).toFixed(0)} KB · {clip.container} ·
                    tier {clip.tier}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <a
                    href={clip.url}
                    download={`nerfchess-clip.${clip.container}`}
                    data-clip-download
                    className="btn-leaf inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[1px] px-4 py-2 font-display text-sm font-semibold"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </a>
                  {canShare ? (
                    <Button tone="ghost" onClick={share} className="px-4 py-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      {shared ? "Shared" : "Share"}
                    </Button>
                  ) : (
                    <span className="inline-flex min-h-[44px] items-center justify-center px-2 text-center text-[11px] text-parchment-400">
                      Sharing files isn&apos;t available here
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 border border-white/10 bg-white/[0.02] p-4 text-sm text-parchment-300">
            This game&apos;s final positions can&apos;t be replayed for a clip: a card rewrote
            the board and no stored positions cover these moves.
          </div>
        )}
      </div>
    </div>
  );
}
