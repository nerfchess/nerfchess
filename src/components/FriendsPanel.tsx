"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Eye, Swords, UserPlus, Users, X } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerLink } from "./PlayerLink";
import { PresenceBadge } from "./PresenceBadge";
import { EmptyState } from "./EmptyState";
import { derivePresence, useLobbyFeed } from "@/lib/presence";
import type { MPLobby } from "@/lib/multiplayer";

// Friends list + add-a-friend + incoming/outgoing requests, with a one-tap
// Challenge that deep-links into the friend-game flow (/friend?challenge=name),
// which notifies the target and starts the game when they accept. Self-
// contained: fetches /api/friends and posts actions there. Live presence is
// read from the one shared lobby snapshot, so every row shows whether a friend
// is online / searching / in a game (with a Watch link) without opening a
// socket of its own. Restyled to the design system: identity rows, 44px touch
// targets and edge-token hairlines.

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

export function FriendsPanel() {
  const [data, setData] = useState<FriendsData | null>(null);
  // undefined = still checking, false = signed out, true = signed in.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [addName, setAddName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const lobby = useLobbyFeed();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (res.ok) {
        setSignedIn(true);
        setData((await res.json()) as FriendsData);
      }
    } catch {
      /* offline: leave the last snapshot */
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

  if (signedIn === undefined) return null; // still checking; render nothing
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

  return (
    <div className="plate p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-parchment">Friends</h2>
        {friends.length > 0 && (
          <span className="font-mono text-[12px] tabular-nums text-parchment-400">{friends.length}</span>
        )}
      </div>

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
          className="min-h-[44px] min-w-0 flex-1 rounded-sm border bg-ink-900/60 px-3 text-[16px] text-parchment placeholder:text-parchment-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] sm:text-sm"
          style={{ borderColor: "var(--edge)" }}
        />
        <button
          type="submit"
          disabled={busy || !addName.trim()}
          className="btn-leaf press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-4 font-display text-sm font-semibold disabled:opacity-40"
        >
          <UserPlus size={15} strokeWidth={2.2} aria-hidden />
          Add
        </button>
      </form>
      {note && (
        <p className={"mt-2 text-[12px] " + (note.kind === "ok" ? "text-verdigris-glow" : "text-oxblood-glow")}>
          {note.text}
        </p>
      )}

      {/* Incoming requests to answer first. */}
      {incoming.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="eyebrow">Requests ({incoming.length})</div>
          {incoming.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-sm border border-gold/30 bg-gold/[0.06] p-2"
            >
              <Identity f={f} lobby={lobby} />
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => void act("accept", f.username)}
                  disabled={busy}
                  aria-label={`Accept ${f.username}`}
                  className="grid h-11 w-11 place-items-center rounded-sm border border-verdigris-glow/50 bg-verdigris/15 text-verdigris-glow transition hover:bg-verdigris/25 disabled:opacity-40"
                >
                  <Check size={16} strokeWidth={2.4} aria-hidden />
                </button>
                <button
                  onClick={() => void act("decline", f.username)}
                  disabled={busy}
                  aria-label={`Decline ${f.username}`}
                  className="grid h-11 w-11 place-items-center rounded-sm border text-parchment-400 transition hover:border-oxblood-glow/50 hover:text-oxblood-glow disabled:opacity-40"
                  style={{ borderColor: "var(--edge)" }}
                >
                  <X size={16} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted friends, each with a presence-aware action. */}
      {empty ? (
        <EmptyState
          className="mt-4"
          icon={Users}
          title="No friends yet"
          body="Add someone by username to line up challenges and quick rematches any time."
          action={{ href: "/lobby", label: "Find players" }}
        />
      ) : (
        friends.length > 0 && (
          <div className="mt-4 space-y-2">
            {friends.map((f) => (
              <FriendRow key={f.id} f={f} lobby={lobby} busy={busy} onRemove={() => void act("remove", f.username)} />
            ))}
          </div>
        )
      )}

      {/* Outgoing pending, quietly at the foot. */}
      {outgoing.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--edge)" }}>
          <div className="eyebrow">Pending</div>
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

// One accepted-friend row: identity + presence, a Watch link when they are in a
// game, a Challenge when they are reachable, and a quiet Remove.
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
      className="flex items-center gap-3 rounded-sm border bg-white/[0.02] p-2"
      style={{ borderColor: "var(--edge)" }}
    >
      <Identity f={f} lobby={lobby} />
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {presence.state === "in-game" && presence.gameId && (
          <Link
            href={`/game/${encodeURIComponent(presence.gameId)}`}
            className="btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-3 font-display text-[13px] no-underline"
          >
            <Eye size={14} strokeWidth={2.2} aria-hidden />
            Watch
          </Link>
        )}
        {presence.state !== "in-game" && (
          <Link
            href={`/friend?challenge=${encodeURIComponent(f.username)}`}
            className="btn-leaf inline-flex min-h-[44px] items-center gap-1.5 px-3 font-display text-[13px] font-semibold no-underline"
          >
            <Swords size={14} strokeWidth={2.3} aria-hidden />
            Challenge
          </Link>
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
