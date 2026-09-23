"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PlayerLink } from "@/components/PlayerLink";
import { useSession } from "@/lib/session/SessionProvider";
import { FIELD_TEXT } from "@/components/social/fieldText";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/Button";
import { PollConnectionBanner } from "@/components/ConnectionBanner";

type ThreadMessage = { id: string; fromMe: boolean; text: string; at: number };
type Thread = { peer: { username: string; avatar: string | null }; messages: ThreadMessage[] };

export default function ThreadPage() {
  const params = useParams<{ username: string }>();
  const username = String(params.username ?? "");
  // Signed in or not, from the shared session (F014): the server hint decides
  // between the thread and the sign-in prompt on the first paint, instead of
  // an empty body until a page-level /me answers.
  const { display } = useSession();
  const signedIn = !!display;
  const [thread, setThread] = useState<Thread | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the last poll landed. This is the ONE async surface in the sweep
  // with a repeating network dependency, so it is the one that can be
  // "disconnected" as distinct from "errored": every other route in the batch
  // fetches once, and a failed one-shot is the error state (§8.3) whose
  // recovery is the reader pressing Retry. Failures here were silent by
  // design after the first successful load (see the poll below), which is
  // exactly the stale-live-state case the ConnectionBanner exists for.
  const [pollHealthy, setPollHealthy] = useState(true);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);

  // Load the thread, then poll it so replies appear without a refresh.
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    let loaded = false;
    let intervalId: number | undefined;
    const stop = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    const load = async () => {
      // Do not re-hit a known-missing thread, and skip polls while the tab is
      // hidden so a backgrounded conversation stops burning requests.
      if (cancelled || (typeof document !== "undefined" && document.hidden)) return;
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(username)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setMissing(true);
          stop();
          return;
        }
        if (!res.ok) {
          // Only surface the full error state before the first successful
          // load; a failed poll on an open thread keeps the thread on screen
          // (never unmount live state during a reconnect, §8.4) and retries on
          // the next tick. It is no longer silent, though: the banner says the
          // conversation has stopped updating and counts the seconds.
          if (!loaded) setLoadError(true);
          else setPollHealthy(false);
          return;
        }
        loaded = true;
        setLoadError(false);
        setPollHealthy(true);
        const data = (await res.json()) as Thread;
        setThread((prev) => {
          if (!prev) return data;
          // Merge by id, not by length. A poll that started before a just-sent
          // message was persisted returns the pre-send list; replacing state
          // with it would drop the optimistic message for up to 5s. Keep any
          // local message the server response does not yet include.
          const serverIds = new Set(data.messages.map((m) => m.id));
          const localExtra = prev.messages.filter((m) => !serverIds.has(m.id));
          if (localExtra.length === 0 && prev.messages.length === data.messages.length) {
            // Nothing new: keep the same object so typing is not disturbed.
            return prev;
          }
          const merged = [...data.messages, ...localExtra].sort((a, b) => a.at - b.at);
          return { ...data, messages: merged };
        });
      } catch {
        if (!loaded) setLoadError(true);
        else setPollHealthy(false);
      }
    };
    load();
    intervalId = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [signedIn, username, reloadKey]);

  // Keep the pane pinned to the newest message by scrolling the pane itself
  // (F018). scrollIntoView scrolls every scrollable ancestor too, so a poll
  // that brought a new message could yank the whole window down to the pane.
  useEffect(() => {
    const pane = paneRef.current;
    if (pane && stickToBottom.current) pane.scrollTop = pane.scrollHeight;
  }, [thread]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: ThreadMessage; error?: string };
      if (!res.ok || !data.message) {
        setError(data.error || "Could not send that message.");
        return;
      }
      // Only clear what was sent (F182): text typed while the send was in
      // flight stays in the box.
      setDraft((cur) => (cur.trim() === text ? "" : cur));
      stickToBottom.current = true;
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, data.message!] } : prev,
      );
    } catch {
      // fetch rejects when the network is down; surface it instead of leaving
      // the send to fail silently as an unhandled rejection.
      setError("Could not send that message. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Only once a thread is on screen: before that there is no live state to
          go stale, and the pre-load failure path is the error state below. */}
      {thread && <PollConnectionBanner healthy={pollHealthy} />}
      <SiteHeader />
      <section className="max-w-2xl mx-auto px-5 sm:px-6 py-6">
        {/* This route had no h1 at all. The visible header is a breadcrumb
            (Inbox / name) rather than a heading, which reads correctly on
            screen but leaves the page unidentifiable to a screen reader and
            unnamed in a heading outline. Hidden rather than shown so the
            breadcrumb stays the visual treatment, and it carries the
            correspondent's name, which is the one thing that distinguishes
            this page from every other thread. */}
        <h1 className="sr-only">Conversation with {thread?.peer.username ?? username}</h1>
        <div className="mb-4 flex min-w-0 items-center gap-3">
          {/* A breadcrumb crumb, 34.9x18 before this. The negative margin gives the
              pixels back so the trail keeps its density, and both relax on a
              pointer that can hit 18px. */}
          <Link
            href="/inbox"
            className="-mx-2 -my-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-sm text-parchment-400 hover:text-parchment-100 [@media(pointer:fine)]:mx-0 [@media(pointer:fine)]:my-0 [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0 [@media(pointer:fine)]:px-0"
          >
            Inbox
          </Link>
          <span className="text-parchment-500">/</span>
          {thread && (
            <PlayerLink
              name={thread.peer.username}
              avatar={thread.peer.avatar}
              avatarSize={26}
              className="min-h-[44px] font-display text-lg text-parchment-50 hover:text-gold-leaf"
            />
          )}
          {!thread && !missing && <span className="text-[13px] text-parchment-400">{username}</span>}
        </div>

        {display === null && (
          <p className="text-parchment-300">
            <Link href={`/login?next=/inbox/${encodeURIComponent(username)}`} className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to read your messages.
          </p>
        )}
        {missing && <p className="text-parchment-300">No player with that name.</p>}

        {signedIn && !missing && loadError && !thread && (
          <div className="plate flex flex-col items-start gap-3 p-4">
            <p className="text-[13px] text-parchment-300">
              We could not load this conversation. Check your connection and try again.
            </p>
            <div className="flex gap-2">
              <Button tone="leaf"
                onClick={() => {
                  setLoadError(false);
                  setReloadKey((k) => k + 1);
                }}
                className="px-5 text-[13px] font-semibold">
                Retry
              </Button>
              <LinkButton tone="ghost"
                href="/inbox"
                className="flex px-5 text-[13px]">
                Back to inbox
              </LinkButton>
            </div>
          </div>
        )}

        {signedIn && !missing && !(loadError && !thread) && (
          <>
            <div
              ref={paneRef}
              aria-busy={!thread || undefined}
              className={"plate h-[50dvh] p-4 " + (thread ? "overflow-y-auto" : "overflow-hidden")}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickToBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
              }}
            >
              {!thread ? (
                // The same bubbles as loading.tsx, not a "Loading messages…"
                // line (F022).
                <ul className="space-y-2" aria-label="Loading messages">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className={i % 2 === 1 ? "flex justify-end" : "flex"}>
                      <div className={"skeleton h-10 " + (i % 2 === 1 ? "w-3/5" : "w-2/3")} />
                    </li>
                  ))}
                </ul>
              ) : thread.messages.length === 0 ? (
                <p className="text-sm text-parchment-400">No messages yet.</p>
              ) : (
                <ul className="space-y-2">
                  {thread.messages.map((m) => (
                    <li key={m.id} className={"flex " + (m.fromMe ? "justify-end" : "justify-start")}>
                      <div
                        className={
                          "max-w-[80%] border px-3 py-2 text-sm leading-snug " +
                          (m.fromMe
                            ? "border-[color:var(--edge-strong)] bg-[color:var(--bg-raised)] text-parchment-50"
                            : "border-[color:var(--edge)] bg-[color:var(--bg-zebra)] text-parchment-100")
                        }
                      >
                        <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        <div className="mt-1 text-right font-mono text-[12px] text-parchment-400">
                          {new Date(m.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Message ${thread?.peer.username ?? username}`}
                maxLength={1000}
                aria-label={`Message ${thread?.peer.username ?? username}`}
                className={`min-h-[44px] min-w-0 flex-1 rounded-none border border-[color:var(--edge)] bg-[color:var(--bg-base)] px-4 py-3 ${FIELD_TEXT} text-parchment placeholder:text-parchment-500`}
              />
              <Button tone="leaf"
                onClick={send}
                disabled={!draft.trim() || sending}
                className="px-5 text-[13px] font-semibold disabled:opacity-50">
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-oxblood-glow">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}
