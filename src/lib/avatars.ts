// Profile pictures. Avatars are chosen from a fixed preset catalog (a chess
// piece on a colored plate) and stored as a preset id in users.avatar, so no
// image uploads or object storage are needed. Accounts that never picked one
// get a deterministic default derived from their username.

import type { PieceType } from "@/engine/types";

export type AvatarSpec = { piece: PieceType; pieceColor: "w" | "b"; bg: string; star?: boolean; flower?: boolean };

const PALETTES = [
  { id: "gold", bg: "#7c611f" },
  { id: "verdigris", bg: "#28604f" },
  { id: "bruise", bg: "#4e3f6e" },
  { id: "oxblood", bg: "#6e2727" },
  { id: "slate", bg: "#3b4a5c" },
  { id: "copper", bg: "#7a4526" },
  { id: "moss", bg: "#4c5722" },
  { id: "plum", bg: "#5e2c4e" },
] as const;
const PIECES: PieceType[] = ["p", "n", "b", "r", "q", "k"];

export const AVATAR_IDS: string[] = [];
export const AVATARS: Record<string, AvatarSpec> = {};
for (const palette of PALETTES) {
  for (const piece of PIECES) {
    const id = `${palette.id}_${piece}`;
    AVATAR_IDS.push(id);
    AVATARS[id] = { piece, pieceColor: "w", bg: palette.bg };
    // A starred twin of every preset, kept so any account that ever stored
    // one still renders. These ids never appear in the picker and isAvatarId
    // rejects them, so a regular account cannot claim one.
    AVATARS[`${id}_star`] = { piece, pieceColor: "w", bg: palette.bg, star: true };
    // A flowered twin of every preset, assigned to house-player accounts
    // only. The flower renders as a small mark in the avatar's bottom-left
    // corner, so house players are (subtly) recognizable everywhere an
    // avatar shows: lobby, in-game, spectate, profiles. Like the starred
    // twins these never appear in the picker and isAvatarId rejects them.
    AVATARS[`${id}_flower`] = { piece, pieceColor: "w", bg: palette.bg, flower: true };
  }
}

// Defaults for accounts that never picked an avatar hash into the original
// 16-preset pool only, so expanding the catalog never reshuffles the look of
// existing players.
const DEFAULT_POOL = AVATAR_IDS.filter(
  (id) =>
    ["gold", "verdigris", "bruise", "oxblood"].some((p) => id.startsWith(`${p}_`)) &&
    ["n", "b", "r", "q"].includes(id.split("_")[1]),
);

// The picker offers this curated subset; AVATARS keeps the full catalog so
// accounts that chose one of the retired presets still render correctly.
export const AVATAR_PICKER_IDS = [...DEFAULT_POOL];

export function isAvatarId(value: unknown): value is string {
  return typeof value === "string" && value in AVATARS && !AVATARS[value].star && !AVATARS[value].flower;
}

// Uploaded profile pictures are stored inline as small data URLs (the client
// crops + downscales to 96px before uploading), so no object storage is
// needed. The size cap keeps list endpoints (leaderboard, lobby) light.
export const CUSTOM_AVATAR_MAX_CHARS = 24_000;

export function isCustomAvatar(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= CUSTOM_AVATAR_MAX_CHARS &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

// House-persona profile pictures. A second class of "not a real upload" avatar
// used only by house-player accounts: hand-authored scenic/object SVGs served
// as static files, so a slice of the roster reads like ordinary users who
// uploaded a random photo (a beach, a coffee mug, a houseplant) instead of the
// piece-on-plate presets. Stored in users.avatar as the id "house_pfp:<name>"
// and rendered as <img src="/house-pfp/<name>.svg">. Like the flower presets
// these are never offered to real accounts: isAvatarId rejects them and the
// avatar upload route only accepts isAvatarId or isCustomAvatar, so a regular
// player can never claim one. The /mod/house editor's picker is the one place
// they're selectable (see HOUSE_AVATAR_IDS in lib/server/bots.ts).
export const HOUSE_PFP_PREFIX = "house_pfp:";
// The hand-authored scenic/object catalog (each has a matching
// /public/house-pfp/<name>.svg). Kept curated + thematic (teatimechess ->
// tea_set, night0wl -> city_night, ...); assigned first in bots.ts.
const CURATED_PFP_NAMES = [
  "mountain_lake",
  "beach_sunset",
  "city_night",
  "forest_path",
  "desert_dunes",
  "lake_cabin",
  "sailboat",
  "lavender_field",
  "aurora",
  "waterfall",
  "tent_stars",
  "autumn_leaves",
  "lighthouse",
  "hot_air_balloons",
  "koi_pond",
  "snowy_peak",
  "palm_beach",
  "sunflowers",
  "flower_vase",
  "coffee_mug",
  "monstera",
  "fruit_bowl",
  "bicycle",
  "record_player",
  "tea_set",
  "succulents",
  "bookshelf",
  "potted_cactus",
  "cat_sunset",
  "rainy_neon",
  // Second wave (added for the 200+ house roster so the crowd's uploaded-photo
  // avatars vary more). Each has a matching /public/house-pfp/<name>.svg.
  "river_bend",
  "pine_forest",
  "cherry_blossom",
  "night_market",
  "harbor_dawn",
  "tulip_field",
  "canyon_river",
  "misty_hills",
  "rice_terrace",
  "glacier_bay",
  "olive_grove",
  "wheat_field",
  "foggy_bridge",
  "coral_reef",
  "birch_woods",
  "volcano_dusk",
  "salt_flats",
  "bamboo_grove",
  "poppy_field",
  "vineyard_hills",
  "lotus_pond",
  "redwood_trail",
  "seaside_cliffs",
  "paper_lantern",
  "terrarium",
  "chess_set",
  "vinyl_records",
  "window_rain",
  "desert_cactus",
  "moonlit_bay",
  // Third wave: memorable character/meme-style pfps (owner ask: the roster
  // read as wall-to-wall sunsets). All original flat vector art — nothing
  // traced from an existing image — assigned thematically in bots.ts
  // (lazydodge -> shiba_wow, dev_e4 -> rubber_ducky, ...).
  "troll_face",
  "speed_cube",
  "shiba_wow",
  "moai_statue",
  "rubber_ducky",
  "pixel_knight",
  "nerd_glasses",
  "cool_cat",
] as const;

// Deterministically generated pfps (scripts/gen-house-pfps.mjs). With ~210
// personas the hand-authored set couldn't give every bot a UNIQUE pfp, so a
// generator emits a large pool of distinct images. The current generation is
// 50 bold, memorable subjects (animal faces, meme-style grins, a puzzle cube,
// an arcade stick, a moai, ...) x 4 palette/backdrop variations — replacing
// the earlier all-sunset landscape pool that made every bot look alike. Each
// name maps to /public/house-pfp/gen_NNN.svg. KEEP GENERATED_PFP_COUNT +
// generatedPfpName in lockstep with the generator script (same count +
// naming); the audit script asserts every roster pfp resolves to an on-disk
// file.
// 560 with the 2026-07 roster expansion (was 200): the ~510-deep roster needs
// a unique pfp per persona with headroom. Indexes 0-199 are byte-identical to
// the previous generation (the generator only appends), so every already-
// assigned avatar stays exactly the same between sessions and deployments.
export const GENERATED_PFP_COUNT = 1000;
export function generatedPfpName(i: number): string {
  return `gen_${String(i).padStart(3, "0")}`;
}
const GENERATED_PFP_NAMES: string[] = Array.from({ length: GENERATED_PFP_COUNT }, (_, i) =>
  generatedPfpName(i),
);

// The full house-pfp catalog: curated images first, then the generated pool.
// Large enough (268) that every persona in the ~210-deep roster gets a unique
// pfp with room to spare (see assignHousePfps in lib/server/bots.ts).
export const HOUSE_PFP_NAMES: readonly string[] = [...CURATED_PFP_NAMES, ...GENERATED_PFP_NAMES];

const HOUSE_PFP_SET = new Set<string>(HOUSE_PFP_NAMES);

/** All house-pfp avatar ids in stored ("house_pfp:<name>") form. */
export const HOUSE_PFP_IDS: string[] = HOUSE_PFP_NAMES.map((n) => HOUSE_PFP_PREFIX + n);

export function isHousePfp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(HOUSE_PFP_PREFIX) &&
    HOUSE_PFP_SET.has(value.slice(HOUSE_PFP_PREFIX.length))
  );
}

/** The static file path for a house-pfp id. Caller must have checked isHousePfp. */
export function housePfpSrc(value: string): string {
  return `/house-pfp/${value.slice(HOUSE_PFP_PREFIX.length)}.svg`;
}

/** The avatar to show: the stored preset when valid, else a stable default
 *  hashed from the username so the same player always looks the same. */
export function avatarIdFor(name: string, stored?: string | null): string {
  if (stored && stored in AVATARS) return stored;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return DEFAULT_POOL[hash % DEFAULT_POOL.length];
}
