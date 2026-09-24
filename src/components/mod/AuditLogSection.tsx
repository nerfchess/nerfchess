"use client";

// Every moderator action, newest first. The old tab was an unfiltered wall; the
// filter row here narrows to a kind of action (the question is almost always
// "who has been banned lately", not "what happened"), and the free-text box
// matches a moderator or a target name.
//
// The filter and the search run on the server over the whole log, a page at a
// time ("Load older"), so an old ban is still findable once the log is long.
// The chip groups are computed by kindOf() here and by GROUP_SQL in
// src/app/api/mod/log/route.ts; keep the two in step.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HistoryEntry } from "./types";
import { Empty, FilterChip, LoadFailed, Loading, ModButton, Pill, untilShort, when, whenShort } from "./ui";

type Kind = "all" | "ban" | "mute" | "warn" | "role" | "queue" | "config";

const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ban", label: "Bans" },
  { value: "mute", label: "Mutes" },
  { value: "warn", label: "Warnings" },
  { value: "role", label: "Roles & names" },
  { value: "queue", label: "Reports & flags" },
  { value: "config", label: "Cards, bots & settings" },
];

// Rows about something other than a player (F116) carry target_kind.
const CONFIG_KINDS = new Set(["card", "house", "persona", "setting", "webhook"]);

function kindOf(action: string, targetKind?: string): Exclude<Kind, "all"> | null {
  if (targetKind === "report" || targetKind === "chat_flag") return "queue";
  if ((targetKind && CONFIG_KINDS.has(targetKind)) || action === "rating_set") return "config";
  const a = action.toLowerCase();
  if (a.includes("ban")) return "ban";
  if (a.includes("mute")) return "mute";
  if (a.includes("warn")) return "warn";
  if (a.includes("role") || a.includes("name")) return "role";
  return null;
}

/** True when target_name is a username worth linking to a profile. */
function isPlayerTarget(e: HistoryEntry): boolean {
  if (!e.target_kind || e.target_kind === "user" || e.target_kind === "report" || e.target_kind === "persona") return true;
  return e.target_kind === "chat_flag" && !!e.target_ref;
}

function toneOf(action: string): "warn" | "mute" | "neutral" {
  const kind = kindOf(action);
  if (action.toLowerCase().startsWith("un")) return "neutral";
  return kind === "ban" ? "warn" : kind === "mute" ? "mute" : "neutral";
}

type LogCursor = { before: number; beforeId: string };
type LogPage = { log: HistoryEntry[]; next: LogCursor | null };

function logUrl(kind: Kind, needle: string, cursor: LogCursor | null): string {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("group", kind);
  if (needle) params.set("q", needle);
  if (cursor) {
    params.set("before", String(cursor.before));
    params.set("beforeId", cursor.beforeId);
  }
  const qs = params.toString();
  return `/api/mod/log${qs ? `?${qs}` : ""}`;
}

export function AuditLogSection() {
  const [kind, setKind] = useState<Kind>("all");
  const [q, setQ] = useState("");
  const [needle, setNeedle] = useState("");
  const [page, setPage] = useState<LogPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  // Whether the log has any rows at all (the first unfiltered answer).
  const [everAny, setEverAny] = useState<boolean | null>(null);

  // The search box asks the server after a short pause, not on every key.
  useEffect(() => {
    const t = window.setTimeout(() => setNeedle(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    fetch(logUrl(kind, needle, null))
      .then((res) => (res.ok ? (res.json() as Promise<LogPage>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (cancelled) return;
        setPage(data);
        setFailed(false);
        setMoreFailed(false);
        if (kind === "all" && !needle) setEverAny(data.log.length > 0);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, needle, attempt]);

  const loadOlder = async () => {
    if (!page?.next || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const res = await fetch(logUrl(kind, needle, page.next));
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as LogPage;
      setPage((prev) => ({ log: [...(prev?.log ?? []), ...data.log], next: data.next }));
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const rows = page?.log ?? [];
  const filtered = kind !== "all" || !!needle;

  if (failed && !page) {
    return (
      <LoadFailed
        what="the audit log"
        onRetry={() => {
          setFailed(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!page) return <Loading what="the audit log" />;
  if (everAny === false && !filtered) return <Empty>No moderation actions yet.</Empty>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <FilterChip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
            {k.label}
          </FilterChip>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or note…"
          aria-label="Filter the audit log by name or note"
          className="plate w-full bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--edge-strong)] sm:ml-auto sm:max-w-xs sm:py-1.5"
        />
      </div>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-[13px] text-oxblood-glow">
          <span>Could not update the list. What is shown is from before.</span>
          <ModButton size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </ModButton>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>Nothing in the whole log matches that filter.</Empty>
      ) : (
        <div className="plate divide-y divide-[color:var(--edge)]">
          {rows.map((entry, i) => (
            <div key={entry.id ?? i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3 text-sm">
              <span className="font-display font-semibold">{entry.mod_name}</span>
              <Pill tone={toneOf(entry.action)}>{entry.action}</Pill>
              {entry.target_name && !isPlayerTarget(entry) ? (
                <span className="font-display font-semibold">{entry.target_name}</span>
              ) : entry.target_name && (
                <Link
                  href={`/u/${entry.target_name}`}
                  className="font-display font-semibold hover:underline"
                >
                  {entry.target_name}
                </Link>
              )}
              {entry.expires_at && (
                <span className="text-parchment-400">{untilShort(entry.expires_at)}</span>
              )}
              {entry.note && <span className="text-parchment-400">“{entry.note}”</span>}
              {(entry.before_json || entry.after_json) && (
                <details className="w-full text-[13px] text-parchment-400">
                  <summary className="cursor-pointer">Change</summary>
                  <div className="mt-1 break-all font-mono">
                    <div>before: {entry.before_json ?? "none"}</div>
                    <div>after: {entry.after_json ?? "none"}</div>
                  </div>
                </details>
              )}
              <span
                className="w-full text-[13px] text-parchment-400 sm:ml-auto sm:w-auto sm:text-sm"
                title={when(entry.created_at)}
              >
                {whenShort(entry.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-parchment-500">
          {page.next
            ? `Showing the latest ${rows.length} ${filtered ? "matching " : ""}actions. Older ones load below.`
            : `Showing all ${rows.length} ${filtered ? "matching " : "recorded "}actions.`}
        </p>
        {page.next && (
          <ModButton size="sm" disabled={loadingMore} onClick={() => void loadOlder()}>
            {loadingMore ? "Loading…" : "Load older"}
          </ModButton>
        )}
        {moreFailed && <span className="text-[13px] text-oxblood-glow">Could not load older actions. Try again.</span>}
      </div>
    </div>
  );
}
