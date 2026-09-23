// Size limits shared by the club routes.
//
// Uploaded club icons are stored inline as data URLs and the club list
// inlines them for up to 50 clubs, so one icon near the old 2,000,000
// character ceiling made /api/clubs tens of megabytes (F104). The club page
// downscales uploads to 256px within a 300,000 character budget before
// sending (src/app/clubs/[slug]/page.tsx, fileToDataUrl), so the server now
// holds uploads to that same budget. Serving icons from their own cached URL
// is proposal P-club-icon.
export const CLUB_ICON_MAX_CHARS = 300_000;

/** Body cap for club writes that may carry an icon (icon plus small fields). */
export const CLUB_ICON_BODY_BYTES = CLUB_ICON_MAX_CHARS + 16 * 1024;

/** Club slugs are generated from names (48 characters plus a short suffix). */
export function validSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 64;
}
