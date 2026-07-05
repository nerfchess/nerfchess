"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MailPlus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerSearch } from "@/components/PlayerSearch";
import { AccountUser, fetchMe } from "@/lib/authClient";

type Conversation = {
  username: string;
  avatar: string | null;
  lastText: string;
  lastAt: number;
  fromMe: boolean;
  unread: number;
};

function formatWhen(at: number): string {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function InboxPage() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (!me) return;
      fetch("/api/messages")
        .then((res) => (res.ok ? (res.json() as Promise<{ conversations: Conversation[] }>) : null))
        .then((data) => {
          if (!cancelled && data) setConversations(data.conversations);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="max-w-2xl mx-auto px-5 sm:px-6 py-8">
        <h1 className="font-display text-4xl">Inbox</h1>

        {user === null && (
          <p className="mt-4 text-parchment-300">
            <Link href="/login?next=/inbox" className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to message other players.
          </p>
        )}

        {user && (
          <>
            <div className="mt-5">
              <PlayerSearch className="max-w-sm" />
              <p className="mt-1.5 text-xs text-parchment-400">
                Find a player and message them from their profile.
              </p>
            </div>

            {!conversations ? (
              <p className="mt-6 text-sm text-parchment-400">Loading conversations…</p>
            ) : conversations.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={MailPlus}
                title="No conversations yet"
                body="Messages you send and receive land here. Find a player above, open their profile, and say hello."
                action={{ href: "/community", label: "Browse players" }}
              />
            ) : (
              <ul className="mt-6 plate divide-y divide-white/5">
                {conversations.map((c) => (
                  <li key={c.username}>
                    <Link
                      href={`/inbox/${encodeURIComponent(c.username)}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <PlayerAvatar name={c.username} avatar={c.avatar} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={"truncate text-sm " + (c.unread ? "font-semibold text-parchment-50" : "text-parchment-100")}>
                            {c.username}
                          </span>
                          <span className="shrink-0 text-[11px] text-parchment-400">{formatWhen(c.lastAt)}</span>
                        </div>
                        <div className={"mt-0.5 truncate text-xs " + (c.unread ? "text-parchment-100" : "text-parchment-400")}>
                          {c.fromMe ? "You: " : ""}
                          {c.lastText}
                        </div>
                      </div>
                      {c.unread > 0 && (
                        <span className="grid min-w-[18px] shrink-0 place-items-center rounded-full bg-oxblood-glow px-1.5 font-mono text-[10px] leading-[18px] text-white">
                          {c.unread}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
