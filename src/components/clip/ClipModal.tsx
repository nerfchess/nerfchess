"use client";

// Clip sharing modal: live canvas preview of a stylized replay of the last
// few plies, recorded client-side to a webm via canvas.captureStream +
// MediaRecorder. No backend involved; the result is offered as a download
// and through the Web Share API where files are shareable.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardState, Color, Move } from "@/engine/types";
import type { GameResult } from "@/engine/game";
import {
  BOARD_THEMES,
  PIECE_THEMES,
  loadSettings,
  resolveBoardTheme,
  resolvePieceTheme,
} from "@/lib/settings";
import { buildClipTimeline } from "./clipReplay";
import { ClipRenderer, clipTimings, type ClipRendererHandle } from "./ClipRenderer";
import { useModalChrome } from "@/lib/useModalChrome";

const LENGTH_OPTIONS = [4, 6, 10] as const;

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

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
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
  // Scroll lock, Escape, and the ghost-click guard on the backdrop.
  const chrome = useModalChrome(open, onClose);
  const [plies, setPlies] = useState<number>(6);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const rendererRef = useRef<ClipRendererHandle | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const clipUrlRef = useRef<string | null>(null);

  // Board colors / piece sprites follow the player's settings so the clip
  // looks like THEIR board. Loaded once per open (settings rarely change
  // mid-session and the modal is short-lived).
  const { colors, pieceSet } = useMemo(() => {
    const s = loadSettings();
    // Resolve through the same path the live board uses: on "auto" the
    // board is the theme's, and a clip that ignored that would export a
    // different board than the one the player just watched.
    const theme = BOARD_THEMES[resolveBoardTheme(s)] ?? BOARD_THEMES.wood;
    return {
      colors: { light: theme.light, dark: theme.dark },
      pieceSet: PIECE_THEMES[resolvePieceTheme(s)]?.assetSet ?? "cburnett",
    };
    // Re-read when the modal reopens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const timeline = useMemo(
    () =>
      open
        ? buildClipTimeline({ moves, snapshots, historyDiverged, plies, signatureIds })
        : null,
    [open, moves, snapshots, historyDiverged, plies, signatureIds],
  );

  const endText = useMemo(() => {
    if (!result || !timeline || timeline.startPly + timeline.segments.length < moves.length) {
      return null;
    }
    return result.winner === "draw"
      ? "Draw"
      : result.winner === "w"
      ? "White wins"
      : result.winner === "b"
      ? "Black wins"
      : "Game aborted";
  }, [result, timeline, moves.length]);

  const discardClip = useCallback(() => {
    if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    clipUrlRef.current = null;
    setClip(null);
    setShared(false);
  }, []);

  // A new length invalidates the recorded take (handled in the length
  // buttons' onClick; closing unmounts the modal entirely).
  const selectPlies = useCallback(
    (n: number) => {
      setPlies(n);
      setError(null);
      discardClip();
    },
    [discardClip],
  );

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
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

  const record = () => {
    const handle = rendererRef.current;
    const canvas = handle?.canvas;
    if (!handle || !canvas || recording) return;
    const mimeType = pickMimeType();
    if (!mimeType || typeof canvas.captureStream !== "function") {
      setError("Recording isn't supported in this browser.");
      return;
    }
    discardClip();
    setError(null);
    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        setRecording(false);
        for (const track of stream.getTracks()) track.stop();
        const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
        if (blob.size === 0) {
          setError("Recording produced no data. Try again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        clipUrlRef.current = url;
        setClip({ url, blob });
        // Surfaced for automated tests / debugging.
        console.log(`nerfchess clip recorded: ${blob.size} bytes`);
      };
      recorderRef.current = recorder;
      setRecording(true);
      recorder.start(250);
      // Restart the timeline in sync with the recorder; stop shortly after
      // the run completes so the final frame lands in the file.
      handle.restart(() => {
        window.setTimeout(() => {
          if (recorderRef.current === recorder && recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 250);
      });
    } catch {
      setRecording(false);
      recorderRef.current = null;
      setError("Recording failed to start in this browser.");
    }
  };

  const clipFile = useMemo(
    () =>
      clip
        ? new File([clip.blob], "nerfchess-clip.webm", { type: clip.blob.type || "video/webm" })
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

  const durationSec = timeline ? Math.round(clipTimings(timeline).durationMs / 100) / 10 : null;

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
        className="plate plate-raised gilt relative w-[min(94vw,30rem)] max-h-[calc(100dvh-3rem)] overflow-y-auto p-5 shadow-2xl sm:p-6"
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center btn-ghost text-parchment-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="mt-1 text-xs leading-snug text-parchment-400">
          A stylized replay of the last moves: captures, spawns, and signature plays are
          re-drawn in the clip&apos;s own look, not the full in-game effects.
        </p>

        {timeline ? (
          <>
            <div className="mt-4">
              <ClipRenderer
                ref={rendererRef}
                timeline={timeline}
                orientation={orientation}
                colors={colors}
                pieceSet={pieceSet}
                names={playerNames}
                endText={endText}
                onReady={() => setReady(true)}
                className="mx-auto block w-full max-w-[24rem] border border-white/10 shadow-plate"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="group" aria-label="Clip length">
                <span className="smallcaps mr-1 text-[10px] text-parchment-400">Last</span>
                {LENGTH_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => selectPlies(n)}
                    disabled={recording}
                    aria-pressed={plies === n}
                    className={
                      "min-h-[36px] border px-3 py-1 font-display text-xs font-semibold transition " +
                      (plies === n
                        ? "border-gold/60 bg-gold/15 text-gold-leaf"
                        : "border-white/15 bg-white/[0.03] text-parchment-300 hover:border-white/30")
                    }
                  >
                    {n}
                  </button>
                ))}
                <span className="smallcaps ml-1 text-[10px] text-parchment-400">plies</span>
              </div>
              <span className="text-[11px] text-parchment-400">
                {timeline.segments.length < plies
                  ? `${timeline.segments.length} replayable`
                  : durationSec
                  ? `~${durationSec}s`
                  : ""}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={record}
                disabled={recording || !ready}
                data-clip-record
                className={
                  "min-h-[44px] rounded-sm px-5 py-2.5 font-display font-semibold " +
                  (recording ? "btn-ghost opacity-80 cursor-default" : "btn-leaf")
                }
              >
                {recording ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 animate-pulse rounded-full bg-oxblood-glow"
                    />
                    Recording…
                  </span>
                ) : !ready ? (
                  "Loading pieces…"
                ) : clip ? (
                  "Re-record"
                ) : (
                  "Record clip"
                )}
              </button>
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
                    Clip ready · {(clip.blob.size / 1024).toFixed(0)} KB · webm
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <a
                    href={clip.url}
                    download="nerfchess-clip.webm"
                    data-clip-download
                    className="btn-leaf inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm px-4 py-2 font-display text-sm font-semibold"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </a>
                  {canShare ? (
                    <button
                      type="button"
                      onClick={share}
                      className="btn-ghost inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm px-4 py-2 font-display text-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      {shared ? "Shared" : "Share"}
                    </button>
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
