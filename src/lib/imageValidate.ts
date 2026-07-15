// Server-trustworthy validation for inline uploaded images (data URLs).
//
// Uploads (club icons, house-bot pfps) are stored INLINE as small data URLs —
// the same pattern user avatars use (see isCustomAvatar) — so no object storage
// is needed. This module is the one place that decides whether an arbitrary
// posted string is an acceptable image, and it NEVER trusts the client: it
// re-checks the MIME, decodes the base64 to enforce a real byte-size cap, and
// parses the image's own header bytes to enforce a pixel-dimension cap. Pure
// and dependency-free (uses only atob), so it runs identically in the Worker
// runtime, Node, and the browser.
//
// Accepted: PNG, JPEG, WebP. SVG is intentionally NOT accepted — the app has no
// SVG sanitizer, and an un-sanitized SVG can carry script, so it must never be
// stored as user-supplied content.

export const IMAGE_UPLOAD_MAX_BYTES = 1_000_000; // 1 MB hard cap
export const IMAGE_UPLOAD_MAX_DIM = 1024; // px, longest edge

const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export type ImageValidation =
  | { ok: true; mime: "png" | "jpeg" | "webp"; width: number; height: number; bytes: number }
  | { ok: false; error: string };

function decodeBase64(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Read pixel dimensions straight from a decoded image's header bytes. Returns
 * null when the bytes aren't a valid header for the claimed type — which the
 * caller treats as a rejection, so a lie about the MIME can't slip through. */
function readDimensions(mime: string, b: Uint8Array): { width: number; height: number } | null {
  const u16 = (o: number) => (b[o] << 8) | b[o + 1];
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u32le = (o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  if (mime === "png") {
    // 8-byte signature, then IHDR (length + "IHDR" + width + height).
    if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
    return { width: u32(16), height: u32(20) };
  }

  if (mime === "jpeg") {
    if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) return null;
      const marker = b[o + 1];
      // Standalone markers (RSTn, SOI, EOI, TEM) carry no length.
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        o += 2;
        continue;
      }
      const len = u16(o + 2);
      if (len < 2) return null;
      // SOF0..SOF15 hold the frame size, excluding DHT/JPG/DAC (C4/C8/CC).
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        if (o + 9 >= b.length) return null;
        return { height: u16(o + 5), width: u16(o + 7) };
      }
      o += 2 + len;
    }
    return null;
  }

  // WebP: "RIFF" .... "WEBP" then a VP8 / VP8L / VP8X chunk.
  if (mime === "webp") {
    if (b.length < 30 || b[0] !== 0x52 || b[8] !== 0x57 || b[9] !== 0x45) return null; // RIFF / WE
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === "VP8 ") {
      // Lossy: 3-byte start code then 16-bit width/height (14 low bits).
      return { width: u16(27) === 0 ? 0 : (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
    }
    if (fourcc === "VP8L") {
      // Lossless: 1 signature byte then 14-bit width-1 / height-1.
      const bits = u32le(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (fourcc === "VP8X") {
      // Extended: 24-bit canvas width-1 / height-1 (little-endian).
      const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
      const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
      return { width, height };
    }
    return null;
  }

  return null;
}

/** Full validation for a posted image data URL. Enforces MIME (png/jpeg/webp),
 * a real decoded byte-size cap, and a pixel-dimension cap parsed from the
 * image's own header. */
export function validateImageDataUrl(value: unknown): ImageValidation {
  if (typeof value !== "string") return { ok: false, error: "Expected an image." };
  if (value.length > IMAGE_UPLOAD_MAX_BYTES * 2) return { ok: false, error: "That image is too large." };
  const m = DATA_URL_RE.exec(value);
  if (!m) return { ok: false, error: "Use a PNG, JPEG, or WebP image." };
  const mime = m[1] as "png" | "jpeg" | "webp";
  const bytes = decodeBase64(m[2]);
  if (!bytes) return { ok: false, error: "That image could not be read." };
  if (bytes.length > IMAGE_UPLOAD_MAX_BYTES) return { ok: false, error: "That image is too large (1 MB max)." };
  const dims = readDimensions(mime, bytes);
  if (!dims || dims.width < 1 || dims.height < 1) return { ok: false, error: "That image could not be read." };
  if (dims.width > IMAGE_UPLOAD_MAX_DIM || dims.height > IMAGE_UPLOAD_MAX_DIM) {
    return { ok: false, error: `Image too large: max ${IMAGE_UPLOAD_MAX_DIM}px per side.` };
  }
  return { ok: true, mime, width: dims.width, height: dims.height, bytes: bytes.length };
}

/** Cheap type-guard: is this a stored uploaded-image data URL (png/jpeg/webp,
 * within the byte cap)? Used on RENDER paths (PlayerAvatar, ClubIcon) where the
 * value was already validated on write; the full parse is not repeated. */
export function isUploadedImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= IMAGE_UPLOAD_MAX_BYTES * 2 &&
    DATA_URL_RE.test(value)
  );
}
