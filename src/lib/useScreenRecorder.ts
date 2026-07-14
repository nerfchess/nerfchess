"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A small screen-recording helper built on the browser's own capture APIs
// (getDisplayMedia + MediaRecorder). It records whatever surface the user
// picks in the browser's share prompt, and on stop hands back an object URL
// for a downloadable clip. Everything is local: nothing is uploaded.
//
// Paired with the moderation panel's "recording mode", which arranges the
// board, players, and clocks into a 9:16 column so a recorded-then-cropped
// clip fits a YouTube Short / Instagram Reel.

export type RecorderState = "idle" | "recording" | "stopped";

export interface ScreenRecorder {
  state: RecorderState;
  /** A human-readable reason the last start failed, or null. */
  error: string | null;
  /** Object URL for the finished clip (present only in the "stopped" state). */
  downloadUrl: string | null;
  /** Milliseconds recorded so far (ticks while recording). */
  elapsedMs: number;
  /** True when this browser can screen-record at all. */
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Discard the finished clip and return to idle. */
  reset: () => void;
  /** Trigger a browser download of the finished clip. */
  download: () => void;
}

// Prefer the widest-support container/codec the browser will actually record.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

export function useScreenRecorder(): ScreenRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const urlRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef(0);
  const extRef = useRef<"webm" | "mp4">("webm");

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== "undefined";

  const revokeUrl = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stop = useCallback(() => {
    window.clearInterval(tickRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      // The onstop handler assembles the blob and flips state to "stopped".
      rec.stop();
    } else {
      stopStream();
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Screen recording isn't supported in this browser.");
      return;
    }
    setError(null);
    revokeUrl();
    setDownloadUrl(null);
    setElapsedMs(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
    } catch (e) {
      // The user dismissing the share picker is the common case — treat it as
      // a quiet no-op rather than an error banner.
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setState("idle");
        return;
      }
      setError(e instanceof Error ? e.message : "Couldn't start screen recording.");
      setState("idle");
      return;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    extRef.current = mime?.startsWith("video/mp4") ? "mp4" : "webm";

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      stopStream();
      setError("This browser can't record the selected surface.");
      setState("idle");
      return;
    }
    recorderRef.current = rec;
    chunksRef.current = [];

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      window.clearInterval(tickRef.current);
      stopStream();
      const type = extRef.current === "mp4" ? "video/mp4" : "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      revokeUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setDownloadUrl(url);
      setState("stopped");
    };

    // If the user ends the share from the browser's own "Stop sharing" control,
    // wind the recorder down cleanly so we still produce a clip.
    stream.getVideoTracks()[0]?.addEventListener("ended", () => stop());

    rec.start();
    startedAtRef.current = Date.now();
    tickRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    setState("recording");
  }, [supported, stop]);

  const download = useCallback(() => {
    if (!urlRef.current) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = `nerfchess-${stamp}.${extRef.current}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const reset = useCallback(() => {
    revokeUrl();
    setDownloadUrl(null);
    setElapsedMs(0);
    setError(null);
    setState("idle");
  }, []);

  // Tear everything down on unmount so a dangling recorder never keeps the
  // screen-share indicator lit or leaks the object URL.
  useEffect(() => {
    return () => {
      window.clearInterval(tickRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      stopStream();
      revokeUrl();
    };
  }, []);

  return { state, error, downloadUrl, elapsedMs, supported, start, stop, reset, download };
}
