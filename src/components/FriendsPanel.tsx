"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Eye, Swords, UserPlus, X } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerLink } from "./PlayerLink";
import { PresenceBadge } from "./PresenceBadge";
import { derivePresence, useLobbyFeed, type PresenceState } from "@/lib/presence";
import type { MPLobby } from "@/lib/multiplayer";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/Button";

// Friends list + add-a-friend + incoming/outgoing requests, with a one-tap
// Challenge that deep-links into the friend-game flow (/friend?challenge=name),
// which notifies the target and starts the game when they accept. Self-
// contained: fetches /api/friends and posts actions there. Live presence is
// read from the one shared lobby snapshot, so every row shows whether a friend
// is online / searching / in a game (with a Watch link) without opening a
// socket of its own. Dungeon-materials pass: riveted plate, rune divider
// between the add form and the list, carved input, online-count rune badge,
// and presence-sorted rows (reachable friends surface first).

interface Friend {
  id: string;
  username: string;
  rating: number | null;
  avatar: string | null;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | null;
  since: number;
}

interface FriendsData {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

// Presence sort order: friends you can act on (watch, challenge while they're
// at the board) rise to the top; offline sinks. Ties break alphabetically so
// the list is stable between polls.
const PRESENCE_RANK: Record<PresenceState, number> = {
  "in-game": 0,
  searching: 1,
  online: 2,
  offline: 3,
};

// The name filter only appears once the list is long enough to need it.
const FILTER_THRESHOLD = 6;

export function FriendsPanel() {
  const [data, setData] = useState<FriendsData | null>(null);
  // undefined = still checking, false = signed out, true = signed in.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  // Distinguishes "initial load in flight" (show a skeleton) from "initial load
  // failed" (show a retry), so a 5xx / offline first fetch never hangs on a
  // blank panel or an endless skeleton.
  const [loadFailed, setLoadFailed] = useState(false);
  const [addName, setAddName] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const lobby = useLobbyFeed();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      // Every outcome below ends in exactly one of signed-out / failed /
      // loaded. The timeout maps a hung request (proxy blackhole, stalled
      // connection) to the failure state instead of an endless skeleton.
      const res = await fetch("/api/friends", { signal: AbortSignal.timeout(10_000) });
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (!res.ok) {
        // Non-401 error (e.g. 5xx) on the initial load: surface a retry
        // instead of leaving signedIn undefined (an endless skeleton).
        setLoadFailed(true);
        return;
      }
      // Parse before flipping signedIn, so a truncated/invalid body lands in
      // the failure state rather than "signed in with no data".
      const body = (await res.json()) as FriendsData;
      setSignedIn(true);
      setData(body);
    } catch {
      // Offline / timeout / bad body: keep any last snapshot, but if we have
      // none yet, show a retry.
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    // `load` only sets state after awaiting the fetch (never synchronously),
    // so this is the sanctioned fetch-on-mount pattern; the rule can't see
    // through the useCallback's await boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const act = async (action: string, username: string) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; status?: string } | null;
      if (!res.ok) {
        setNote({ kind: "err", text: body?.error ?? "Something went wrong." });
      } else if (action === "request") {
        setAddName("");
        setNote({
          kind: "ok",
          text: body?.status === "accepted" ? `You are now friends with ${username}.` : `Request sent to ${username}.`,
        });
      }
      await load();
    } catch {
      setNote({ kind: "err", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  };

  if (signedIn === undefined) {
    // Initial load. A network/5xx failure gets a retry; otherwise a themed
    // skeleton that mirrors the roster rows (no blank panel, no spinner text).
    return (
      <div className="plate p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-parchment">Friends</h2>
        </div>
        {loadFailed ? (
          <div className="mt-4 text-sm text-parchment-300">
            <p>Could not load your friends.</p>
            <Button tone="ghost"
             
              onClick={() => void load()}
              className="mt-2 px-3 text-sm">
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-white/10 motion-reduce:animate-none" />
                  <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.07] motion-reduce:animate-none" />
                </div>
                <div className="ml-auto h-8 w-16 shrink-0 animate-pulse rounded-sm bg-white/10 motion-reduce:animate-none" />
              </div>
            ))}
            <span className="sr-only">Loading friends</span>
          </div>
        )}
      </div>
    );
  }
  if (!signedIn) {
    return (
      <div className="plate p-4">
        <h2 className="font-display text-lg text-parchment">Friends</h2>
        <p className="mt-1 text-sm text-parchment-300">
          <Link href="/login" className="text-gold-leaf hover:underline">
            Sign in
          </Link>{" "}
          to add friends and challenge them in one tap.
        </p>
      </div>
    );
  }

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const empty = friends.length === 0 && incoming.length === 0 && outgoing.length === 0;

  // Reachable friends first (in-game > searching > online > offline), then
  // alphabetical so the order is stable between presence polls.
  const sorted = [...friends].sort((a, b) => {
    const ra = PRESENCE_RANK[derivePresence(lobby, a.username).state];
    const rb = PRESENCE_RANK[derivePresence(lobby, b.username).state];
    return ra !== rb ? ra - rb : a.username.localeCompare(b.username);
  });
  const onlineCount = friends.filter((f) => derivePresence(lobby, f.username).state !== "offline").length;

  // Client-side name filter, only offered once the list outgrows a glance.
  // Below the threshold the input is hidden and any stale query is ignored.
  const showFilter = friends.length > FILTER_THRESHOLD;
  const query = showFilter ? filter.trim().toLowerCase() : "";
  const visible = query ? sorted.filter((f) => f.username.toLowerCase().includes(query)) : sorted;

  return (
    <div className="plate p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-parchment">Friends</h2>
        {friends.length > 0 && (
          <span
            className="rune-badge tabular-nums"
            style={
              {
                "--badge-rgb": onlineCount > 0 ? "var(--energy-teal-rgb)" : "var(--energy-ember-rgb)",
              } as React.CSSProperties
            }
          >
            {onlineCount} of {friends.length} online
          </span>
        )}
      </div>

      {/* Incoming requests answer first: a raised accent-edged strip above
          everything else, because they are the most actionable thing here. */}
      {incoming.length > 0 && (
        <div className="mt-4 space-y-2 rounded-sm border border-gold/40 bg-gold/[0.07] p-2.5">
          <div className="text-gold-leaf">Requests ({incoming.length})</div>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center gap-3">
              <Identity f={f} lobby={lobby} />
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => void act("accept", f.username)}
                  disabled={busy}
                  aria-label={`Accept ${f.username}`}
                  className="press grid h-11 w-11 place-items-center rounded-sm border border-verdigris-glow/50 bg-verdigris/20 text-verdigris-glow transition hover:bg-verdigris/30 disabled:opacity-40"
                >
                  <Check size={16} strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  onClick={() => void act("decline", f.username)}
                  disabled={busy}
                  aria-label={`Decline ${f.username}`}
                  className="press grid h-11 w-11 place-items-center rounded-sm border border-[color:var(--edge)] text-parchment-400 transition hover:border-oxblood-glow/50 hover:text-oxblood-glow disabled:opacity-40"
                >
                  <X size={16} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add a friend by username. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = addName.trim();
          if (name && !busy) void act("request", name);
        }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Add a friend by username"
          aria-label="Friend's username"
          maxLength={24}
          className="input-rune min-h-[44px] min-w-0 flex-1 px-3 text-[16px] sm:text-sm"
        />
        <Button tone="leaf"
          type="submit"
          disabled={busy || !addName.trim()}
          className="shrink-0 px-4 text-sm font-semibold">
          <UserPlus size={15} strokeWidth={2.2} aria-hidden />
          Add
        </Button>
      </form>
      {note && (
        <p className={"mt-2 text-[12px] " + (note.kind === "ok" ? "text-verdigris-glow" : "text-oxblood-glow")}>
          {note.text}
        </p>
      )}

      <div className="my-4" aria-hidden />

      {/* Accepted friends, presence-sorted, each with a one-tap action. */}
      {empty ? (
        <div className="empty-vault">
          <p className="text-[13px]">Add friends by username to challenge them in one tap.</p>
          <LinkButton tone="ghost"
            href="/lobby"
            className="px-4 text-[13px] sm:min-h-9">
            Find players
          </LinkButton>
        </div>
      ) : (
        friends.length > 0 && (
          <div className="space-y-2">
            {showFilter && (
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by name"
                aria-label="Filter friends by name"
                className="input-rune min-h-[44px] w-full px-3 text-[16px] sm:min-h-9 sm:text-sm"
              />
            )}
            {visible.length === 0 ? (
              <p className="py-2 text-[13px] text-parchment-400">No friends match “{filter.trim()}”.</p>
            ) : (
              visible.map((f) => (
                <FriendRow key={f.id} f={f} lobby={lobby} busy={busy} onRemove={() => void act("remove", f.username)} />
              ))
            )}
          </div>
        )
      )}

      {/* Outgoing pending, quietly at the foot. */}
      {outgoing.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--edge)" }}>
          <div>Pending</div>
          {outgoing.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-sm text-parchment-400">
              <PlayerAvatar name={f.username} avatar={f.avatar} size={24} />
              <PlayerLink name={f.username} className="min-w-0 flex-1 hover:text-parchment-100" />
              <span className="shrink-0 text-[12px] text-parchment-500">Requested</span>
              <button
                onClick={() => void act("decline", f.username)}
                disabled={busy}
                aria-label={`Cancel request to ${f.username}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-parchment-500 transition hover:text-oxblood-glow disabled:opacity-40"
              >
                <X size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// One accepted-friend row: identity + presence, a Watch link when they are in
// a game, a Challenge when they are reachable, and a quiet Remove that only
// turns cursed-red on hover. Row hover warms the surface and lights an ember
// hairline — pointer devices only, so touch never gets a sticky hover.
function FriendRow({
  f,
  lobby,
  busy,
  onRemove,
}: {
  f: Friend;
  lobby: MPLobby | null;
  busy: boolean;
  onRemove: () => void;
}) {
  const presence = derivePresence(lobby, f.username);
  return (
    <div
      className="flex items-center gap-3 rounded-sm border border-[color:var(--edge)] bg-white/[0.02] p-2 transition-[background-color,border-color] duration-200 [@media(hover:hover)]:hover:border-[color:rgb(var(--energy-ember-rgb)/0.45)] [@media(hover:hover)]:hover:bg-[color:var(--surface-hover)]"
    >
      <Identity f={f} lobby={lobby} />
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* Labels compress to icon-only below sm so actions never wrap; the
            aria-labels keep them readable. */}
        {presence.state === "in-game" && presence.gameId && (
          <LinkButton tone="ghost"
            href={`/game/${encodeURIComponent(presence.gameId)}`}
            aria-label={`Watch ${f.username}'s game`}
            className="min-w-[44px] px-3 text-[13px]">
            <Eye size={14} strokeWidth={2.2} aria-hidden />
            <span className="hidden sm:inline">Watch</span>
          </LinkButton>
        )}
        {presence.state !== "in-game" && (
          <LinkButton tone="leaf"
            href={`/friend?challenge=${encodeURIComponent(f.username)}`}
            aria-label={`Challenge ${f.username}`}
            className="min-w-[44px] px-3 text-[13px] font-semibold">
            <Swords size={14} strokeWidth={2.3} aria-hidden />
            <span className="hidden sm:inline">Challenge</span>
          </LinkButton>
        )}
        <button
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${f.username}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-parchment-500 transition hover:text-oxblood-glow disabled:opacity-40"
        >
          <X size={16} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// Avatar + clickable name + rating + presence badge.
function Identity({ f, lobby }: { f: Friend; lobby: MPLobby | null }) {
  const p = derivePresence(lobby, f.username);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <PlayerAvatar name={f.username} avatar={f.avatar} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <PlayerLink
            name={f.username}
            className="min-w-0 truncate font-display text-[15px] text-parchment hover:text-gold-leaf"
          />
          {f.rating != null && (
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-parchment-400">{f.rating}</span>
          )}
        </div>
        <PresenceBadge state={p.state} mode={p.game?.mode ?? null} className="mt-0.5" />
      </div>
    </div>
  );
}
