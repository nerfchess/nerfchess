// Client-side profile-picture processing. Uploads are downscaled to a small
// centered square and encoded as a data URL, so the server never has to deal
// with arbitrary files — just a bounded string it validates and stores.

/** Edge length of the stored avatar, in CSS pixels. */
export const AVATAR_SIZE = 256;

/** Upper bound on the encoded data URL, enforced on both client and server.
 *  ~150k chars of base64 is roughly a 110 KB image — far more than a 256px
 *  square needs, so hitting this means something went wrong. */
export const AVATAR_MAX_CHARS = 150_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

/** Turn an uploaded image file into a small square data URL suitable for
 *  storing as the account's avatar. Throws with a user-facing message. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error("Could not read that image.");
  }

  // Cover-crop: scale so the image fills the square, centered.
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  const scale = Math.max(AVATAR_SIZE / img.naturalWidth, AVATAR_SIZE / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);

  // Prefer webp; fall back to jpeg where the browser can't encode it, then
  // drop quality once more before giving up on the size budget.
  const attempts: Array<[string, number]> = [
    ["image/webp", 0.85],
    ["image/jpeg", 0.8],
    ["image/jpeg", 0.5],
  ];
  for (const [type, quality] of attempts) {
    const url = canvas.toDataURL(type, quality);
    if (url.startsWith(`data:${type}`) && url.length <= AVATAR_MAX_CHARS) return url;
  }
  throw new Error("That image could not be compressed enough. Try a different one.");
}
