// Rendering, fallback and caching for every link preview (next/og).
//
// Three rules the old renderer broke (F248):
//
// 1. The site's face. Previews render in Noto Sans 400 and 700 (embedded, see
//    ./fontData.ts), not next/og's default face with a faked bold.
// 2. Never a blank card. ImageResponse renders lazily inside its body stream,
//    so a layout error used to surface as a broken or empty image after the
//    200 was already sent. Here the PNG is rendered eagerly inside a try, and
//    any failure (a data read, a layout, the renderer) answers with the brand
//    card instead, with a short cache life so the real card replaces it soon.
// 3. Cached. Every image carries Cache-Control, and on Cloudflare the rendered
//    PNG is also kept in the colo's edge cache (caches.default) under a key
//    the caller chooses, so a link pasted into a busy group chat renders once
//    per colo per cache window instead of once per unfurl bot.

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { NOTO_SANS_400_B64, NOTO_SANS_700_B64 } from "./fontData";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** How long a preview may be reused. Finished games never change; profiles
 *  and events move slowly; invites are live for minutes. */
export const OG_CACHE = {
  /** Static copy (brand, pages, codex cards). */
  static: 60 * 60 * 24 * 7,
  /** A finished game: immutable. */
  immutable: 60 * 60 * 24 * 30,
  /** Profiles, leaderboard, clubs, tournaments, the daily puzzle. */
  slow: 60 * 60,
  /** Live games and invites. */
  live: 60 * 5,
  /** The brand card served because the real one failed. */
  fallback: 60,
} as const;

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fonts: Font[] | null = null;

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export function ogFonts(): Font[] {
  if (!fonts) {
    fonts = [
      { name: "Noto Sans", data: fromBase64(NOTO_SANS_400_B64), weight: 400, style: "normal" },
      { name: "Noto Sans", data: fromBase64(NOTO_SANS_700_B64), weight: 700, style: "normal" },
    ];
  }
  return fonts;
}

function cacheControl(maxAge: number): string {
  // Browsers and unfurl bots may keep it for maxAge; shared caches for the
  // same, and may serve it stale for a day while they refetch.
  return `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=86400`;
}

/** Render `el` to a PNG Response now (not lazily in the body stream), so a
 *  failure throws here where the caller can catch it. */
export async function renderPng(el: ReactElement, maxAge: number): Promise<Response> {
  const res = new ImageResponse(el, { ...OG_SIZE, fonts: ogFonts() });
  const png = await res.arrayBuffer();
  if (png.byteLength < 100) throw new Error("next/og produced an empty image");
  return new Response(png, {
    status: 200,
    headers: { "Content-Type": OG_CONTENT_TYPE, "Cache-Control": cacheControl(maxAge) },
  });
}

type EdgeCache = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> };

function edgeCache(): EdgeCache | null {
  const c = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return c?.default ?? null;
}

export type OgRequest = {
  /** Builds the card. May read data; may throw. */
  build: () => ReactElement | Promise<ReactElement>;
  /** Builds the fallback (the brand card). */
  fallback: () => ReactElement;
  /** Seconds the image may be reused (OG_CACHE). */
  maxAge: number;
  /** Edge cache key, unique per card and per data version, e.g.
   *  "game/ABCDE". Build it only from a validated record that was found;
   *  omit it for a miss (a "not found" card must never be pinned) and for
   *  images Next prerenders at build. */
  key?: string;
};

/** The edge-cache request for a key such as "game/ABCDE", or null when the
 *  key is unsafe. SECURITY: this is the only place a key becomes a URL. Each
 *  "/" segment is percent-encoded, so "#", "?", a backslash and "%2e" cannot end
 *  the path or turn into a dot segment, and an empty, "." or ".." segment is
 *  refused, so the URL parser can never fold one key into another
 *  namespace. Callers still build keys only from validated, found records. */
export function ogCacheRequest(key: string): Request | null {
  const parts = key.split("/");
  if (parts.length < 2 || parts.some((s) => s === "" || s === "." || s === "..")) return null;
  try {
    const url = `https://og-cache.nerfchess.com/v1/${parts.map(encodeURIComponent).join("/")}`;
    // Belt and braces: the parsed URL must be exactly the one we wrote.
    if (new URL(url).href !== url) return null;
    return new Request(url);
  } catch {
    // A lone surrogate makes encodeURIComponent throw: no key, no cache.
    return null;
  }
}

/** Build, render and cache one preview; any failure answers with the brand
 *  card, never an error or a blank image. */
export async function ogResponse({ build, fallback, maxAge, key }: OgRequest): Promise<Response> {
  const cache = key ? edgeCache() : null;
  const cacheReq = cache && key ? ogCacheRequest(key) : null;
  if (cache && cacheReq) {
    try {
      const hit = await cache.match(cacheReq);
      if (hit) return hit;
    } catch {}
  }
  let res: Response;
  try {
    res = await renderPng(await build(), maxAge);
  } catch (err) {
    console.error("[og] preview failed, serving the brand card", key ?? "", err);
    return renderPng(fallback(), OG_CACHE.fallback);
  }
  if (cache && cacheReq) {
    try {
      await cache.put(cacheReq, res.clone());
    } catch {}
  }
  return res;
}
