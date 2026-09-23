// Metadata for the routes whose title depends on data: games, profiles, clubs,
// tournaments, invites. Each reads only what the page shows a signed-out
// visitor, skips the expensive parts the image needs (the replay, the
// favourite cards), and answers a unique title even when the thing is
// missing, with noindex, so a mistyped URL is never an indexable duplicate
// (F237).
//
// Metadata streams for human visitors in Next 16, so these reads never hold
// up the first byte of the page itself; bots and unfurlers get them in the
// <head>.

import type { Metadata } from "next";
import { clockLabel } from "@/lib/og/text";
import { pageMeta } from "@/lib/seo";
import { clubSummary, gameSummary, inviteSummary, profileSummary, tournamentSummary } from "@/lib/server/ogData";

const modeWord = (m: "buff" | "nerf" | null) => (m === "buff" ? "Buff mode" : m === "nerf" ? "Nerf mode" : null);

function resultPhrase(winner: "w" | "b" | "draw" | null, reason: string | null): string {
  const head = winner === "draw" ? "draw" : winner === "w" ? "White won" : winner === "b" ? "Black won" : "ended";
  return reason ? `${head}, ${reason}` : head;
}

export async function gameMeta(rawId: string, base: "/game" | "/history" = "/game"): Promise<Metadata> {
  const id = rawId.trim().toUpperCase();
  const path = `${base}/${encodeURIComponent(base === "/history" ? rawId.trim() : id)}`;
  const g = base === "/game" ? await gameSummary(id, { position: false }) : null;
  if (!g) {
    return pageMeta({
      title: base === "/history" ? `Game replay ${rawId.trim().slice(0, 24)}` : `Game ${id.slice(0, 12)}`,
      description:
        "A game of Nerf Chess, chess with power-ups and secret handicaps. Open it to watch it live or replay it move by move.",
      path,
      noindex: true,
      image: "segment",
    });
  }
  const vs = `${g.white.name} vs ${g.black.name}`;
  const terms = [modeWord(g.mode), clockLabel(g.timeSec, g.incrementSec), g.rated ? "rated" : "casual"].filter(Boolean).join(", ");
  return pageMeta({
    title: g.live ? `${vs}, live now` : `${vs}: ${resultPhrase(g.winner, g.reason)}`,
    description: g.live
      ? `Watch ${vs} live on Nerf Chess (${terms}): secret handicaps and power-up cards in real time. Free to spectate.`
      : `${vs} on Nerf Chess (${terms}): ${resultPhrase(g.winner, g.reason)} after ${Math.ceil(g.plies / 2)} moves. Replay it move by move.`,
    path,
    noindex: true,
    image: "segment",
  });
}

export async function profileMeta(rawName: string): Promise<Metadata> {
  const raw = safeDecode(rawName).trim();
  const p = await profileSummary(raw, { cards: false });
  const path = `/u/${encodeURIComponent((p?.username ?? raw).toLowerCase())}`;
  if (!p) {
    return pageMeta({
      title: `Player not found: ${raw.slice(0, 20)}`,
      description: "No Nerf Chess player goes by this name. Find players on the leaderboard and in the community.",
      path,
      noindex: true,
      image: "segment",
    });
  }
  const ratings = p.ratings.map((r) => `${modeWord(r.mode)} ${Math.round(r.rating)}`).join(", ");
  const games = p.games === 1 ? "1 game played" : `${p.games.toLocaleString("en-US")} games played`;
  return pageMeta({
    title: `${p.username}: ratings, games and favourite cards`,
    description: `${p.username} plays Nerf Chess${ratings ? `, rated ${ratings}` : ""}, with ${games}. Rating history, recent games, favourite cards and achievements.`,
    path,
    // Guest accounts (auto-named, short-lived) stay out of the index; a
    // registered player's profile is indexable as before (owner question Q34
    // decides whether they also go in the sitemap).
    noindex: p.guest,
    type: "profile",
    image: "segment",
  });
}

export async function clubMeta(rawSlug: string): Promise<Metadata> {
  const slug = safeDecode(rawSlug).trim().toLowerCase();
  const c = await clubSummary(slug);
  const path = `/clubs/${encodeURIComponent(slug)}`;
  if (!c) {
    return pageMeta({
      title: `Club not found: ${slug.slice(0, 40)}`,
      description: "This Nerf Chess club does not exist or was closed. Browse the clubs to find one to join.",
      path,
      noindex: true,
      image: "segment",
    });
  }
  const members = c.members === 1 ? "1 member" : `${c.members} members`;
  const about = c.description.trim() ? ` ${c.description.trim()}` : "";
  return pageMeta({
    title: `${c.name}: a Nerf Chess club`,
    description: `${c.name} is a Nerf Chess club with ${members}.${about}`,
    path: `/clubs/${encodeURIComponent(c.slug)}`,
    image: "segment",
  });
}

export async function tournamentMeta(rawId: string): Promise<Metadata> {
  const id = safeDecode(rawId).trim();
  const t = await tournamentSummary(id);
  const path = `/tournaments/${encodeURIComponent(id)}`;
  if (!t) {
    return pageMeta({
      title: "Tournament not found",
      description: "This Nerf Chess tournament does not exist or was removed. See the upcoming events on the tournaments page.",
      path,
      noindex: true,
      image: "segment",
    });
  }
  const terms = [modeWord(t.mode), clockLabel(t.timeSec, t.incrementSec), t.rated ? "rated" : "casual"].filter(Boolean).join(", ");
  return pageMeta({
    title: `${t.name}: a Nerf Chess tournament`,
    description: `${t.name}: a ${terms} Nerf Chess tournament with ${t.players} of ${t.maxPlayers} players entered. See the pairings, results and standings.`,
    path,
    image: "segment",
  });
}

export async function inviteMeta(rawCode: string): Promise<Metadata> {
  const code = safeDecode(rawCode).trim().toUpperCase().slice(0, 10);
  const inv = await inviteSummary(code);
  const path = `/c/${encodeURIComponent(code)}`;
  const clock = inv && inv.timeSec !== null ? clockLabel(inv.timeSec, inv.incrementSec ?? 0) : null;
  const clockPart = clock && clock !== "No clock" ? `, ${clock}` : "";
  const title = inv?.from ? `${inv.from} challenged you to Nerf Chess${clockPart}` : "You are invited to a game of Nerf Chess";
  const terms = [modeWord(inv?.mode ?? null), inv?.rated === null || inv?.rated === undefined ? null : inv.rated ? "rated" : "casual"]
    .filter(Boolean)
    .join(", ");
  return pageMeta({
    title,
    description: `${terms ? `A ${terms} game. ` : ""}Chess with power-ups and secret handicaps, free in your browser with no download. Tap to accept.`,
    path,
    // An invite is for the person it was sent to, not for search.
    noindex: true,
    image: "segment",
  });
}

export function historyMeta(rawId: string): Promise<Metadata> {
  return gameMeta(rawId, "/history");
}

export function inboxMeta(rawName: string): Metadata {
  const name = safeDecode(rawName).trim().slice(0, 20);
  return pageMeta({
    title: `Messages with ${name}`,
    description: `Your Nerf Chess messages with ${name}: the conversation so far and a box to reply.`,
    path: `/inbox/${encodeURIComponent(name.toLowerCase())}`,
    noindex: true,
  });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
