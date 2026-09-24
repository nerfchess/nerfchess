"use client";

// Player lookup and the sanction desk.
//
// The old panel hid the choice of action inside a <select> and the duration
// inside a second <select>, so "warn" and "permanently ban" were two clicks
// apart and looked identical until you read the option text. Here the sanction
// is a segmented control that colours itself as it escalates, the duration is
// only rendered when it applies, and the commit button restates what it is about
// to do — you cannot ban someone while believing you are warning them.
//
// Account-level actions (username flags, role changes, clearing a sanction) sit
// in a separate row below, because they are not part of that escalation.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ModUser, ModUserContext } from "./types";
import {
  ConfirmButton,
  Empty,
  FilterChip,
  LoadFailed,
  ModButton,
  Pill,
  RoleBadge,
  SectionHead,
  SegmentedControl,
  postJson,
  untilShort,
  when,
  whenShort,
} from "./ui";
import { SearchInput } from "@/components/ui/SearchInput";

type UserFilter = "all" | "members" | "guests";
type Sanction = "warn" | "mute" | "ban";

const DURATIONS: { label: string; value: string; ms: number | null }[] = [
  { label: "1h", value: "1h", ms: 60 * 60 * 1000 },
  { label: "1d", value: "1d", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", value: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30d", value: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "Forever", value: "perm", ms: null },
];

// `initialQuery` seeds the search box when another section hands a player over
// (a chat flag's "inspect", say) so escalating from evidence to action never
// means retyping a name. The console remounts this component on each handoff,
// so the prop is read once at mount and the lookup starts clean.
export function PlayersSection({
  isAdmin,
  initialQuery,
  onActed,
}: {
  isAdmin: boolean;
  initialQuery?: string;
  onActed?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  // Roster scope: recent members and guests together by default, narrowable to
  // either side. Applies to the default roster and to searches alike.
  const [filter, setFilter] = useState<UserFilter>("all");
  const [users, setUsers] = useState<ModUser[]>([]);
  // A failed search used to read as "No players match that search."
  const [searchFailed, setSearchFailed] = useState(false);
  const [ctxFailed, setCtxFailed] = useState<string | null>(null);
  const [ctxAttempt, setCtxAttempt] = useState(0);
  const [selected, setSelected] = useState<ModUser | null>(null);
  // Everything the detail shows is loaded by the selected player's id (F115):
  // it used to come from the search's exact-name match, so picking a player
  // from the roster showed another player's record, or "Clean record".
  const [ctx, setCtx] = useState<ModUserContext | null>(null);
  const [sanction, setSanction] = useState<Sanction>("mute");
  const [duration, setDuration] = useState<string>("7d");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // Current time on a slow tick so ban/mute expiry badges stay live without
  // calling Date.now() during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const search = useCallback(
    async (q: string) => {
      // An empty query loads the default roster (recent members AND guests)
      // rather than clearing the list, so the panel always opens on something
      // browsable. The filter chips narrow both the roster and searches.
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filter !== "all") params.set("filter", filter);
      const qs = params.toString();
      try {
        const res = await fetch(`/api/mod/users${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { users: ModUser[] };
        setUsers(data.users);
        setSearchFailed(false);
      } catch {
        setSearchFailed(true);
      }
    },
    [filter],
  );

  const loadContext = useCallback(async (id: string) => {
    const res = await fetch(`/api/mod/users?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as ModUserContext;
    // `context` below only shows an answer whose id matches the selection, so
    // a slow answer for a player no longer selected never lands on screen.
    setCtx(data);
    return data;
  }, []);

  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    void (async () => {
      try {
        const res = await fetch(`/api/mod/users?id=${encodeURIComponent(selectedId)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ModUserContext;
        if (live) setCtx(data);
      } catch {
        if (live) setCtxFailed(selectedId);
      }
    })();
    return () => {
      live = false;
    };
  }, [selectedId, ctxAttempt]);
  const context = ctx && selected && ctx.user.id === selected.id ? ctx : null;

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const act = async (username: string, body: Record<string, unknown>) => {
    setMessage(null);
    const res = await postJson("/api/mod/users", { username, ...body });
    setMessage(res.ok ? "Done." : (res.error ?? "Failed."));
    if (res.ok) setNote("");
    await search(query);
    if (selected) {
      const fresh = await loadContext(selected.id);
      if (fresh) setSelected(fresh.user);
    }
    onActed?.();
  };

  const durationMs = DURATIONS.find((d) => d.value === duration)?.ms ?? null;
  const commitLabel = (() => {
    if (!selected) return "Apply";
    if (sanction === "warn") return `Warn ${selected.username}`;
    const span = duration === "perm" ? "permanently" : `for ${duration}`;
    return `${sanction === "mute" ? "Mute" : "Ban"} ${selected.username} ${span}`;
  })();

  const reason = note.trim();
  // A ban, or any permanent sanction, asks twice before it runs.
  const needsConfirm = sanction === "ban" || (sanction === "mute" && duration === "perm");
  const isMuted = !!selected?.muted_until && selected.muted_until > now;
  const isBanned = !!selected?.banned_until && selected.banned_until > now;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          variant="plate"
          className="w-full sm:max-w-sm"
          value={query}
          onChange={(next) => {
            setQuery(next);
            setSelected(null);
          }}
          label="Search players"
          placeholder="Search players…"
        />
        <div className="flex items-center gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "members"} onClick={() => setFilter("members")}>
            Members
          </FilterChip>
          <FilterChip active={filter === "guests"} onClick={() => setFilter("guests")}>
            Guests
          </FilterChip>
        </div>
      </div>

      {!query.trim() && (
        <p className="text-[13px] text-parchment-400">Recent players</p>
      )}

      {searchFailed ? (
        <LoadFailed what="players" onRetry={() => void search(query)} />
      ) : users.length === 0 ? (
        <Empty>{query.trim() ? "No players match that search." : "No players yet."}</Empty>
      ) : (
        <div className="plate divide-y divide-[color:var(--edge)]">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelected(u)}
              className={`flex min-h-[52px] w-full flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left transition hover:bg-[color:var(--bg-raised)] ${
                selected?.id === u.id ? "bg-[color:var(--bg-zebra)]" : ""
              }`}
            >
              <span className="font-display font-semibold">{u.username}</span>
              {u.role !== "user" && <RoleBadge role={u.role} />}
              {!!u.is_guest && <Pill>guest</Pill>}
              {u.banned_until && u.banned_until > now && (
                <Pill tone="warn">banned {untilShort(u.banned_until)}</Pill>
              )}
              {u.muted_until && u.muted_until > now && (
                <Pill tone="mute">muted {untilShort(u.muted_until)}</Pill>
              )}
              <span className="w-full text-[13px] text-parchment-400 sm:ml-auto sm:w-auto sm:text-sm">
                {Math.round(u.rating)} · {u.games} games · joined{" "}
                {new Date(u.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="plate space-y-5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/u/${selected.username}`}
              className="font-display text-xl text-parchment-50 hover:underline"
            >
              {selected.username}
            </Link>
            {selected.role !== "user" && <RoleBadge role={selected.role} />}
            {!!selected.is_guest && <Pill>guest</Pill>}
            {isBanned && <Pill tone="warn">banned {untilShort(selected.banned_until)}</Pill>}
            {isMuted && <Pill tone="mute">muted {untilShort(selected.muted_until)}</Pill>}
            <span className="w-full text-sm text-parchment-400 sm:ml-auto sm:w-auto">
              {Math.round(selected.rating)} · {selected.games} games
            </span>
            <p className="w-full text-[13px] text-parchment-400">
              Account age {ageLabel(now - selected.created_at)} (joined{" "}
              {new Date(selected.created_at).toLocaleDateString()})
              {context && (
                <>
                  {" · "}
                  {context.user.has_email ? "email on file" : "no email"}
                  {" · "}
                  {context.user.last_seen_at ? `last seen ${whenShort(context.user.last_seen_at)}` : "never seen"}
                  {context.user.name_flagged && " · username flagged"}
                </>
              )}
            </p>
          </div>

          {/* --- the escalation ladder --- */}
          <div className="border-t border-[color:var(--edge)] pt-4">
            <SectionHead
              title="Sanction"
              blurb="Warn leaves a paper trail. Mute shadow-mutes chat from their next connection. Ban ends their sessions immediately."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SegmentedControl<Sanction>
                value={sanction}
                onChange={setSanction}
                size="sm"
                options={[
                  { value: "warn", label: "Warn" },
                  { value: "mute", label: "Mute" },
                  { value: "ban", label: "Ban", tone: "danger" },
                ]}
              />
              {sanction !== "warn" && (
                <SegmentedControl
                  value={duration}
                  onChange={setDuration}
                  size="sm"
                  options={DURATIONS.map((d) => ({
                    value: d.value,
                    label: d.label,
                    tone: d.value === "perm" ? ("danger" as const) : undefined,
                  }))}
                />
              )}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-label="Reason (required)"
                maxLength={500}
                placeholder="Reason, required (goes in the audit log)"
                className="plate w-full bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--edge-strong)] sm:min-w-[180px] sm:flex-1 sm:py-1.5"
              />
              {needsConfirm ? (
                <ConfirmButton
                  tone="danger"
                  className="w-full sm:w-auto"
                  disabled={!reason}
                  title={reason ? undefined : "Write a reason first"}
                  confirmLabel={`Confirm: ${commitLabel}`}
                  onConfirm={() => act(selected.username, { action: sanction, durationMs, note: reason })}
                >
                  {commitLabel}
                </ConfirmButton>
              ) : (
                <ModButton
                  tone={sanction === "mute" ? "primary" : "default"}
                  className="w-full sm:w-auto"
                  disabled={!reason}
                  title={reason ? undefined : "Write a reason first"}
                  onClick={() => act(selected.username, { action: sanction, durationMs, note: reason })}
                >
                  {commitLabel}
                </ModButton>
              )}
            </div>
          </div>

          {/* --- everything that is not an escalation --- */}
          <div className="border-t border-[color:var(--edge)] pt-4">
            <SectionHead
              title="Account"
              blurb="Reversals, username flags, and role changes. Each one takes the reason written above."
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {isMuted && (
                <ModButton size="sm" disabled={!reason} onClick={() => act(selected.username, { action: "unmute", note: reason })}>
                  Lift mute
                </ModButton>
              )}
              {isBanned && (
                <ModButton size="sm" disabled={!reason} onClick={() => act(selected.username, { action: "unban", note: reason })}>
                  Lift ban
                </ModButton>
              )}
              <ConfirmButton
                tone="danger"
                size="sm"
                disabled={!reason}
                title="Requires the owner to pick a new name; the account, ratings, games, and achievements are kept"
                confirmLabel={`Confirm: flag ${selected.username}`}
                onConfirm={() => act(selected.username, { action: "flag_name", note: reason })}
              >
                Flag username
              </ConfirmButton>
              <ModButton
                size="sm"
                disabled={!reason}
                title="Clear a username flag (false positive)"
                onClick={() => act(selected.username, { action: "unflag_name", note: reason })}
              >
                Clear name flag
              </ModButton>
              {isAdmin && selected.role === "user" && (
                <ConfirmButton
                  tone="primary"
                  size="sm"
                  disabled={!reason}
                  confirmLabel={`Confirm: make ${selected.username} a moderator`}
                  onConfirm={() => act(selected.username, { action: "set_role", role: "mod", note: reason })}
                >
                  Promote to moderator
                </ConfirmButton>
              )}
              {isAdmin && selected.role === "mod" && (
                <ConfirmButton
                  size="sm"
                  disabled={!reason}
                  confirmLabel={`Confirm: demote ${selected.username}`}
                  onConfirm={() => act(selected.username, { action: "set_role", role: "user", note: reason })}
                >
                  Demote to player
                </ConfirmButton>
              )}
            </div>
          </div>

          {message && <p className="text-sm text-parchment-200">{message}</p>}

          {!context && ctxFailed === selected.id ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 border-t border-[color:var(--edge)] pt-4 text-sm text-parchment-200">
              <span>Could not load this player&apos;s history.</span>
              <ModButton
                size="sm"
                onClick={() => {
                  setCtxFailed(null);
                  setCtxAttempt((n) => n + 1);
                }}
              >
                Retry
              </ModButton>
            </div>
          ) : !context ? (
            <p className="border-t border-[color:var(--edge)] pt-4 text-sm text-parchment-400">Loading history…</p>
          ) : (
            <div className="grid gap-4 border-t border-[color:var(--edge)] pt-4 text-sm sm:grid-cols-2">
              <div>
                <h3 className="text-[13px] text-parchment-400">Mod history</h3>
                {context.history.length === 0 ? (
                  <p className="mt-2 text-parchment-300">Clean record.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {context.history.map((h, i) => (
                      <li key={i} className="text-parchment-200">
                        <span className="text-parchment-50">{h.action}</span> by {h.mod_name} ·{" "}
                        <span title={when(h.created_at)}>{whenShort(h.created_at)}</span>
                        {h.note && <span className="text-parchment-400">: {h.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-[13px] text-parchment-400">Recent games</h3>
                {context.recentGames.length === 0 ? (
                  <p className="mt-2 text-parchment-300">No archived games.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {context.recentGames.map((g) => (
                      <li key={g.id} className="text-parchment-200">
                        <Link href={`/game/${g.id}`} className="hover:underline">
                          <span className={g.result === "win" ? "text-verdigris-glow" : g.result === "loss" ? "text-oxblood-glow" : "text-parchment-50"}>
                            {g.result}
                          </span>{" "}
                          vs {g.opponent}
                          {g.opponentIsBot && " (house)"}
                        </Link>{" "}
                        · {g.reason}
                        {g.rated ? " · rated" : ""} · <span title={when(g.completed_at)}>{whenShort(g.completed_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-[13px] text-parchment-400">Reports against them</h3>
                {context.reports.length === 0 ? (
                  <p className="mt-2 text-parchment-300">None.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {context.reports.map((r, i) => (
                      <li key={i} className="text-parchment-200">
                        <span className="text-oxblood-glow">{r.reason}</span> by {r.reporter_name} ({r.status}) ·{" "}
                        <span title={when(r.created_at)}>{whenShort(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-[13px] text-parchment-400">Reports they filed</h3>
                {context.reportsBy.length === 0 ? (
                  <p className="mt-2 text-parchment-300">None.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {context.reportsBy.map((r, i) => (
                      <li key={i} className="text-parchment-200">
                        <span className="text-parchment-50">{r.reason}</span> against {r.reported_name} ({r.status}) ·{" "}
                        <span title={when(r.created_at)}>{whenShort(r.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "3 days", "5 months": how long an account has existed. */
function ageLabel(ms: number): string {
  const days = Math.max(0, Math.floor(ms / 86400000));
  if (days < 1) return "under a day";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months`;
  return `${Math.floor(days / 365)} years`;
}
