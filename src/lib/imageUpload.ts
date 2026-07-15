// Client-side image → data URL pipeline shared by uploads that store the
// image inline (avatars, custom backgrounds): read the file, downscale it on
// a canvas, then re-encode as JPEG at descending qualities until it fits the
// caller's character budget. No server round-trip; the caller persists the
// returned data URL wherever it lives.

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function fileToDataUrl(
  file: File,
  {
    maxDim,
    maxChars,
    cover = false,
  }: {
    /** Longest output edge in px (backgrounds ~1600; avatars 96). */
    maxDim: number;
    /** Budget for the encoded data URL's length. */
    maxChars: number;
    /** true = center-crop to a square (avatars); false = keep aspect ratio. */
    cover?: boolean;
  },
): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("That image is too large (12 MB max).");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that image.");
    if (cover) {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      canvas.width = canvas.height = maxDim;
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        maxDim,
        maxDim,
      );
    } else {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= maxChars) return url;
    }
    throw new Error("That image is too detailed to store. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
