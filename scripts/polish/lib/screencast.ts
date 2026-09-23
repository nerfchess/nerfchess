// ---------------------------------------------------------------------------
// CDP screencast recorder. Chromium emits a frame each time the compositor
// produces a visually different frame, stamped with wall-clock time, so the
// frames line up with performance.timeOrigin-based marks from the probe.
//
//   const rec = await startScreencast(page);   // before goto for load capture
//   ...
//   const frames = await rec.stop();
//   frameAt(frames, epochMs)                   // what was on screen at t
// ---------------------------------------------------------------------------

import type { Page } from "@playwright/test";

export type Frame = { ts: number; data: string; width: number; height: number };

export async function startScreencast(
  page: Page,
  opts: { quality?: number; maxWidth?: number; maxHeight?: number } = {},
): Promise<{ frames: Frame[]; stop: () => Promise<Frame[]> }> {
  const vp = page.viewportSize() ?? { width: 1280, height: 800 };
  const cdp = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number; deviceWidth: number; deviceHeight: number } }) => {
    frames.push({
      ts: (f.metadata.timestamp ?? Date.now() / 1000) * 1000,
      data: f.data,
      width: f.metadata.deviceWidth,
      height: f.metadata.deviceHeight,
    });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: opts.quality ?? 80,
    maxWidth: opts.maxWidth ?? vp.width,
    maxHeight: opts.maxHeight ?? vp.height,
    everyNthFrame: 1,
  });
  return {
    frames,
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await cdp.detach().catch(() => {});
      return frames;
    },
  };
}

/** The frame on screen at epoch ms `t`: the last one at or before it. */
export function frameAt(frames: Frame[], t: number): Frame | undefined {
  let pick: Frame | undefined;
  for (const f of frames) {
    if (f.ts <= t) pick = f;
    else break;
  }
  return pick;
}

/** The first frame at or after epoch ms `t`. */
export function frameAfter(frames: Frame[], t: number): Frame | undefined {
  return frames.find((f) => f.ts >= t);
}
