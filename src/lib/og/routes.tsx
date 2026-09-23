// Link previews backed by live data: the leaderboard, games, profiles, clubs,
// tournaments and invite links. Static pages, codex cards and puzzles have
// their own modules (pageImage.ts, codexImage.tsx, puzzleImage.ts), so a
// route's opengraph-image file loads only what its own card needs.

import { OG_CACHE, gameCard, inviteCard, ogImage, pageCard, profileCard } from "@/lib/ogCard";
import { PAGES } from "@/lib/seoPages";
import {
  clubSummary,
  gameSummary,
  inviteSummary,
  leaderboardTop,
  profileSummary,
  tournamentSummary,
} from "@/lib/server/ogData";
import { fenPieces } from "./board";
import { clockLabel, formatCount } from "./text";

// ---- leaderboard ------------------------------------------------------------

export function leaderboardImage() {
  return ogImage(async () => {
    const top = await leaderboardTop();
    const buff = top.find((t) => t.mode === "buff") ?? top[0];
    const p = PAGES["/leaderboard"];
    return pageCard({
      kicker: p.kicker,
      title: p.cardTitle,
      subtitle: buff ? `Number one in ${buff.mode === "buff" ? "Buff" : "Nerf"} mode: ${buff.username}` : p.cardSubtitle,
      stat: buff ? { value: String(Math.round(buff.rating)), label: "top rating" } : undefined,
    });
  }, OG_CACHE.slow, "leaderboard");
}

// ---- games ------------------------------------------------------------------

const START = fenPieces("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");

function resultText(winner: "w" | "b" | "draw" | null, reason: string | null): string | null {
  if (!winner) return reason ? `Ended, ${reason}` : null;
  const head = winner === "draw" ? "Draw" : winner === "w" ? "White won" : "Black won";
  return reason ? `${head}, ${reason}` : head;
}

/** Finished games never change, so their image is cached for a month; a live
 *  or unknown game for five minutes. The cache life is decided before the
 *  render so an unknown id is not pinned for a month. */
export async function gameImage(id: string) {
  const g = await gameSummary(id);
  const finished = !!g && !g.live;
  return ogImage(
    () =>
      g
        ? gameCard({
            white: g.white,
            black: g.black,
            mode: g.mode,
            clock: clockLabel(g.timeSec, g.incrementSec),
            rated: g.rated,
            result: g.live ? null : resultText(g.winner, g.reason),
            winner: g.winner,
            pieces: g.pieces ?? START,
            lastMove: g.lastMove,
            live: g.live,
          })
        : pageCard({
            kicker: "Game",
            title: "A game of Nerf Chess",
            subtitle: "Chess with power-ups and secret handicaps. Open the link to watch or replay it.",
            board: { pieces: START },
          }),
    finished ? OG_CACHE.immutable : OG_CACHE.live,
    // Keyed on the id the archive returned (validated against GAME_ID_RE),
    // never on the raw route param.
    finished && g ? `game/${g.id}` : undefined,
  );
}

// ---- profiles ---------------------------------------------------------------
//
// SECURITY: profiles, clubs, tournaments and invites read their record before
// rendering and key the edge cache on the record that was found, never on the
// route param. Next decodes params, so a param can carry "/", ".." or "#",
// and a key built from it could overwrite another card's cache entry. A miss
// renders its "not found" card with no key, so it is never pinned either.

export async function profileImage(username: string) {
  // The key needs only the found username, so this lookup skips the archive
  // read (favourite cards); that runs inside build, on a cache miss only.
  const p = await profileSummary(username, { cards: false });
  if (!p) {
    return ogImage(
      () => pageCard({ kicker: "Player", title: "Player not found", subtitle: "Find players on the Nerf Chess leaderboard and community pages." }),
      OG_CACHE.slow,
    );
  }
  return ogImage(
    async () => {
      const full = (await profileSummary(p.username)) ?? p;
      return profileCard({ username: full.username, avatar: full.avatar, ratings: full.ratings, games: full.games, topCards: full.topCards });
    },
    OG_CACHE.slow,
    `u/${p.username.toLowerCase()}`,
  );
}

// ---- clubs and tournaments --------------------------------------------------

export async function clubImage(slug: string) {
  const c = await clubSummary(slug);
  if (!c) {
    return ogImage(() => pageCard({ kicker: "Club", title: "Club not found", subtitle: "Browse the Nerf Chess clubs to find one to join." }), OG_CACHE.slow);
  }
  return ogImage(
    () =>
      pageCard({
        kicker: "Club",
        title: c.name,
        subtitle: c.description || "A Nerf Chess club.",
        stat: { value: formatCount(c.members), label: c.members === 1 ? "member" : "members" },
      }),
    OG_CACHE.slow,
    `clubs/${c.slug.toLowerCase()}`,
  );
}

function statusLine(status: string, startsAt: number | null): string {
  if (status === "running" || status === "live") return "Playing now";
  if (status === "finished" || status === "complete" || status === "completed") return "Finished";
  if (startsAt) {
    const d = new Date(startsAt);
    return `Starts ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
  }
  return "Open for entries";
}

export async function tournamentImage(id: string) {
  const t = await tournamentSummary(id);
  if (!t) {
    return ogImage(() => pageCard({ kicker: "Tournament", title: "Tournament not found", subtitle: "See the upcoming Nerf Chess events." }), OG_CACHE.slow);
  }
  const mode = t.mode === "buff" ? "Buff mode" : t.mode === "nerf" ? "Nerf mode" : "";
  return ogImage(
    () =>
      pageCard({
        kicker: "Tournament",
        title: t.name,
        subtitle: [statusLine(t.status, t.startsAt), mode, clockLabel(t.timeSec, t.incrementSec), t.rated ? "Rated" : "Casual"].filter(Boolean).join(", "),
        stat: { value: `${t.players}/${t.maxPlayers}`, label: "players" },
        mode: t.mode ?? undefined,
      }),
    OG_CACHE.slow,
    `tournaments/${t.id}`,
  );
}

// ---- invites ----------------------------------------------------------------

/** An unknown or expired code still gets the generic invite card (the code
 *  drawn as letters and digits only), uncached at the edge. */
export async function inviteImage(code: string) {
  const inv = await inviteSummary(code);
  return ogImage(
    () =>
      inviteCard({
        from: inv?.from ?? null,
        rating: inv?.rating ?? null,
        clock: inv && inv.timeSec !== null ? clockLabel(inv.timeSec, inv.incrementSec ?? 0) : null,
        mode: inv?.mode ?? null,
        rated: inv?.rated ?? null,
        code: inv?.code ?? code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
      }),
    OG_CACHE.live,
    // inv.code passed INVITE_CODE_RE inside inviteSummary.
    inv ? `c/${inv.code}` : undefined,
  );
}
