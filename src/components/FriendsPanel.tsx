"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "./PlayerAvatar";
import { Check, Swords, UserPlus, X } from "lucide-react";

// Friends list + add-a-friend + incoming/outgoing requests, with a one-tap
// Challenge that deep-links into the friend-game flow (/friend?challenge=name),
// which notifies the target and starts the game when they accept. Self-
// contained: fetches /api/friends and posts actions there.

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
      setNote({ kind: "err", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  };

  if (signedIn === undefined) return null; // still checking; render nothing
  if (!signedIn) {
    return (
      <div className="plate p-5 text-center">
        <div className="font-display text-lg text-parchment">Friends</div>
        <p className="mt-1 text-sm text-parchment-300">
          <Link href="/login" className="text-gold-leaf underline">
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

  return (
    <div className="plate p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-lg text-parchment">Friends</div>
        {friends.length > 0 && (
          <span className="smallcaps text-[10px] text-parchment-400">{friends.length} added</span>
        )}
      </div>

      {/* Add a friend by username. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = addName.trim();
          if (name && !busy) void act("request", name);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Add a friend by username"
          aria-label="Friend's username"
          maxLength={24}
          className="min-w-0 flex-1 rounded border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment placeholder:text-parchment-500 focus:border-gold/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !addName.trim()}
          className="btn-glass btn-glass--primary flex shrink-0 items-center gap-1.5 px-3.5 py-2 font-display text-sm font-semibold disabled:opacity-40"
        >
          <UserPlus size={15} strokeWidth={2.2} />
          Add
        </button>
      </form>
      {note && (
        <p className={"text-[12px] " + (note.kind === "ok" ? "text-verdigris-glow" : "text-oxblood-glow")}>
          {note.text}
        </p>
      )}

      {/* Incoming requests to answer. */}
      {incoming.length > 0 && (
        <div className="space-y-2">
          <div className="smallcaps text-[10px] text-gold-leaf">Requests</div>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded border border-gold/30 bg-gold/[0.06] p-2.5">
              <PlayerAvatar name={f.username} avatar={f.avatar} size={30} />
              <FriendName f={f} />
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => void act("accept", f.username)}
                  disabled={busy}
                  title="Accept"
                  className="grid h-8 w-8 place-items-center rounded border border-verdigris-glow/50 bg-verdigris/15 text-verdigris-glow transition hover:bg-verdigris/25 disabled:opacity-40"
                >
                  <Check size={15} strokeWidth={2.4} />
                </button>
                <button
                  onClick={() => void act("decline", f.username)}
                  disabled={busy}
                  title="Decline"
                  className="grid h-8 w-8 place-items-center rounded border border-white/15 text-parchment-400 transition hover:border-oxblood-glow/50 hover:text-oxblood-glow disabled:opacity-40"
                >
                  <X size={15} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted friends: one-tap challenge. */}
      <div className="space-y-2">
        {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
          <p className="text-sm text-parchment-400">
            No friends yet. Add someone by their username to challenge them any time.
          </p>
        )}
        {friends.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.02] p-2.5">
            <PlayerAvatar name={f.username} avatar={f.avatar} size={30} />
            <FriendName f={f} />
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <Link
                href={`/friend?challenge=${encodeURIComponent(f.username)}`}
                className="btn-glass btn-glass--primary flex items-center gap-1.5 px-3 py-1.5 font-display text-[13px] font-semibold no-underline"
              >
                <Swords size={14} strokeWidth={2.3} />
                Challenge
              </Link>
              <button
                onClick={() => void act("remove", f.username)}
                disabled={busy}
                title="Remove friend"
                className="grid h-8 w-8 place-items-center rounded border border-white/10 text-parchment-500 transition hover:border-oxblood-glow/50 hover:text-oxblood-glow disabled:opacity-40"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Outgoing pending, quietly at the foot. */}
      {outgoing.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <div className="smallcaps text-[10px] text-parchment-500">Pending</div>
          {outgoing.map((f) => (
            <div key={f.id} className="flex items-center gap-3 text-sm text-parchment-400">
              <PlayerAvatar name={f.username} avatar={f.avatar} size={22} />
              <span className="min-w-0 truncate">{f.username}</span>
              <span className="ml-auto shrink-0 text-[11px] text-parchment-500">requested</span>
              <button
                onClick={() => void act("decline", f.username)}
                disabled={busy}
                title="Cancel request"
                className="shrink-0 text-parchment-500 transition hover:text-oxblood-glow disabled:opacity-40"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendName({ f }: { f: Friend }) {
  return (
    <Link href={`/u/${encodeURIComponent(f.username)}`} className="min-w-0 no-underline">
      <span className="block truncate font-display text-[15px] text-parchment hover:text-gold-leaf">
        {f.username}
      </span>
      {f.rating != null && <span className="block text-[11px] text-parchment-400">{f.rating}</span>}
    </Link>
  );
}
