"use client";

// Player-filed reports. Each card is one decision: read it, optionally open the
// game or the reported player, then resolve or dismiss. Resolve is the gold
// (primary) action because it is the one that clears the item; dismiss stays
// quiet iron so the two are never confused mid-queue.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Report } from "./types";
import { Empty, FilterChip, Loading, ModButton, ModLinkButton, Pill, postJson, when, whenShort } from "./ui";

export function ReportsSection({
  onHandled,
  onInspectPlayer,
}: {
  onHandled?: () => void;
  onInspectPlayer?: (username: string) => void;
}) {
  const [status, setStatus] = useState<"open" | "all">("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // One note per open report, sent with the decision and kept in the audit log.
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Failures used to vanish (the queue just reloaded); now each card says why.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/mod/reports?status=${status === "open" ? "open" : "all"}`);
    if (res.ok) setReports(((await res.json()) as { reports: Report[] }).reports);
  }, [status]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const close = async (id: string, next: "resolved" | "dismissed") => {
    setBusy(id);
    const res = await postJson("/api/mod/reports", { id, status: next, note: (notes[id] ?? "").trim() || undefined });
    setErrors((prev) => {
      const rest = { ...prev };
      if (res.ok) delete rest[id];
      else rest[id] = res.status === 409 ? "Another moderator already closed this report." : (res.error ?? "Could not save.");
      return rest;
    });
    await load();
    setBusy(null);
    if (res.ok) onHandled?.();
  };

  const openCount = reports?.filter((r) => r.status === "open").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={status === "open"} onClick={() => setStatus("open")}>
          Open
        </FilterChip>
        <FilterChip active={status === "all"} onClick={() => setStatus("all")}>
          Everything
        </FilterChip>
        {reports && (
          <span className="ml-auto text-[12px] text-parchment-400">
            {status === "open"
              ? `${openCount} waiting`
              : `${reports.length} report${reports.length === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {!reports ? (
        <Loading what="reports" />
      ) : reports.length === 0 ? (
        <Empty>{status === "open" ? "Nothing in the queue." : "No reports have ever been filed."}</Empty>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="plate p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={`/u/${r.reported_name}`}
                  className="font-display font-semibold text-parchment-50 hover:underline"
                >
                  {r.reported_name}
                </Link>
                <Pill tone={r.status === "open" ? "warn" : "neutral"}>{r.reason}</Pill>
                <span className="text-parchment-400" title={when(r.created_at)}>
                  by {r.reporter_name} · {whenShort(r.created_at)}
                </span>
                {r.status !== "open" && (
                  <Pill>
                    {r.status} by {r.handled_by}
                  </Pill>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-parchment-100">{r.description}</p>
              {r.handled_note && <p className="mt-1 text-[13px] text-parchment-400">Note: {r.handled_note}</p>}
              {r.status === "open" && (
                <input
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  aria-label={`Note for the report on ${r.reported_name}`}
                  maxLength={500}
                  placeholder="Note (optional, goes in the audit log)"
                  className="plate mt-3 w-full bg-transparent px-3 py-2 text-sm outline-none focus:border-[color:var(--edge-strong)] sm:py-1.5"
                />
              )}
              {errors[r.id] && (
                <p role="alert" className="mt-2 text-[13px] text-oxblood-glow">
                  {errors[r.id]}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "open" && (
                  <>
                    <ModButton
                      tone="primary"
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => close(r.id, "resolved")}
                    >
                      Resolve
                    </ModButton>
                    <ModButton size="sm" disabled={busy === r.id} onClick={() => close(r.id, "dismissed")}>
                      Dismiss
                    </ModButton>
                  </>
                )}
                {r.game_id && (
                  <ModLinkButton href={`/game/${r.game_id}`} size="sm">
                    Open game
                  </ModLinkButton>
                )}
                {onInspectPlayer && (
                  <ModButton size="sm" onClick={() => onInspectPlayer(r.reported_name)}>
                    Inspect {r.reported_name}
                  </ModButton>
                )}
                <ModLinkButton href={`/u/${r.reported_name}`} size="sm" tone="quiet">
                  Profile ↗
                </ModLinkButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
