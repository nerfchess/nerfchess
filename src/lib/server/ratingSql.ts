// The ONE definition of "which number is this player's displayed rating" for
// server routes that read D1 directly. Ratings live per category in
// user_ratings (the mode buckets "nerf" and "buff" are the live ones); the
// legacy users.rating column is never written after games anymore, so any
// surface still reading it shows a number frozen at the moment of the
// per-category switch — the root of the "ratings don't match between pages"
// reports.
//
// Two resolution rules, matching what the game server (worker.ts) and the
// leaderboard already do:
//
//  - Category-scoped surfaces (leaderboard tab, a game's seat, a tournament
//    in one mode): the user_ratings row for THAT category. Use
//    `categoryRatingSql` with the category bound as a parameter.
//
//  - Category-less surfaces (player search, club member lists, the header
//    account chip, the lobby's online list): the player's ACTIVE (most-played)
//    live mode bucket — ties broken by the higher number — falling back to the
//    legacy column only when neither bucket exists yet (the legacy value is
//    also what would seed them). Use `bestLiveRatingSql`.
//
//    This is deliberately the SAME rule the game server's online-list query
//    uses (worker.ts buildLobbyPayload). It used to be MAX(nerf, buff), which
//    diverged from the online list and, worse, kept showing a player's
//    untouched 1500 seed in a mode they never play — so the header/search/club
//    number disagreed with the lobby and with the profile's per-mode cards.
//    Keeping one definition here means every category-less surface shows the
//    identical number for a given player (the "ratings don't match between
//    pages" reports, for bots and humans alike).

import { MODE_CATEGORIES } from "../speed";

// The live mode buckets, quoted for interpolation into an IN (...) list.
// Derived from the shared (UI-free) category list so a future mode is picked
// up here automatically. Ids are compile-time literals from our own
// registry, never user input.
const LIVE_BUCKETS_IN = MODE_CATEGORIES.map((c) => `'${c}'`).join(",");

/**
 * SQL expression: the user's ACTIVE (most-played) live mode-bucket rating —
 * ties broken by the higher number — falling back to the legacy users.rating
 * column when no mode bucket exists yet. `userTable` is the alias of the joined
 * users table (must expose `.id` and `.rating`). This matches the game server's
 * online-list query exactly, so every category-less surface agrees.
 */
export function bestLiveRatingSql(userTable = "u"): string {
  return `COALESCE(
            (SELECT r.rating FROM user_ratings r
              WHERE r.user_id = ${userTable}.id AND r.category IN (${LIVE_BUCKETS_IN})
              ORDER BY r.games DESC, r.rating DESC LIMIT 1),
            ${userTable}.rating
          )`;
}

/**
 * SQL expression: the user's rating in one specific category, falling back to
 * the legacy users.rating column when the bucket doesn't exist yet (the value
 * that would seed it, for accounts with no speed history). Binds ONE `?`
 * (the category id) — remember to pass it in the statement's bind list.
 */
export function categoryRatingSql(userTable = "u"): string {
  return `COALESCE(
            (SELECT r.rating FROM user_ratings r
              WHERE r.user_id = ${userTable}.id AND r.category = ?),
            ${userTable}.rating
          )`;
}
