"use client";

// The moderation console.
//
// It replaces a single row of nine flat tabs (with the house-bot controls pinned
// above all of them) with a grouped rail: Queue, People, Activity, Cards, Site.
// Sections are addressable — /mod#reports opens the report queue — so a link in
// a chat message lands someone on the right screen, and the browser's back
// button walks back through the sections you visited.
//
// The shell owns three things the sections cannot own individually: the mod
// check, the overview payload (one fetch, feeding both the nav badges and the
// dashboard), and handoffs between sections — the dashboard's "work 3 reports"
// button and the chat flag's "inspect this player" both land you in another
// section with its state already set.
//
// Server-side authorization happens in the /api/mod routes; this page just hides
// itself from non-mods.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { isGodPanelUser } from "@/lib/godPanel";
import { AuditLogSection } from "@/components/mod/AuditLogSection";
import { ChatFlagsSection } from "@/components/mod/ChatFlagsSection";
import { ControlsSection } from "@/components/mod/ControlsSection";
import { DashboardSection } from "@/components/mod/DashboardSection";
import { BuffFeedbackSection, NerfFeedbackSection } from "@/components/mod/FeedbackSection";
import { GamesSection } from "@/components/mod/GamesSection";
import { IdeasSection } from "@/components/mod/IdeasSection";
import { PlayersSection } from "@/components/mod/PlayersSection";
import { ReportsSection } from "@/components/mod/ReportsSection";
import { SECTION_TITLE, isSectionId, type SectionId } from "@/components/mod/nav";
import type { Overview } from "@/components/mod/types";
import { ModShell } from "@/components/mod/ModShell";

export default function ModPage() {
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);
  // Opens on the dashboard, not the report queue: a moderator arriving cold
  // needs "is anything wrong" before "here is the oldest report".
  const [section, setSection] = useState<SectionId>("dashboard");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewFailed, setOverviewFailed] = useState(false);
  // A username handed from one section to another (chat flag → player lookup).
  const [pendingPlayer, setPendingPlayer] = useState<string | undefined>();

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  const isMod = me && (me.role === "mod" || me.role === "admin");
  const isAdmin = me?.role === "admin";
  // The god panel is the owners' personal tool, so its toggle only shows for a
  // god-panel account (matched case-insensitively, like the game server).
  const isOwner = !!me && isGodPanelUser(me.username);

  const loadOverview = useCallback(() => {
    fetch("/api/mod/overview")
      .then((r) => (r.ok ? (r.json() as Promise<Overview>) : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        setOverview(json);
        setOverviewFailed(false);
      })
      .catch(() => setOverviewFailed(true));
  }, []);

  useEffect(() => {
    if (isMod) loadOverview();
  }, [isMod, loadOverview]);

  // Sections are addressable via the hash, and the hash is the single source of
  // truth — clicking a rail item writes it, and back/forward reads it back.
  useEffect(() => {
    const apply = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (isSectionId(id)) setSection(id);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const go = useCallback((next: SectionId) => {
    setSection(next);
    if (window.location.hash.replace(/^#/, "") !== next) window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const inspectPlayer = useCallback(
    (username: string) => {
      setPendingPlayer(username);
      go("players");
    },
    [go],
  );

  if (me === undefined) {
    return (
      <ModShell title="Moderation" isAdmin={false}>
        <p className="text-sm text-parchment-400">Loading…</p>
      </ModShell>
    );
  }
  if (!isMod) {
    return (
      <ModShell title="Moderation" isAdmin={false}>
        <p className="text-parchment-200">
          This page is for moderators.{" "}
          {!me && (
            <Link href="/login" className="text-parchment-50 hover:underline">
              Sign in
            </Link>
          )}
        </p>
      </ModShell>
    );
  }

  return (
    <ModShell
      title={SECTION_TITLE[section]}
      current={section}
      isAdmin={!!isAdmin}
      openReports={overview?.queue.openReports ?? 0}
      chatFlags={overview?.queue.unreviewedChatFlags ?? 0}
      onGo={go}
      onInspectPlayer={inspectPlayer}
    >
      {section === "dashboard" && <DashboardSection data={overview} failed={overviewFailed} onGo={go} />}
      {section === "reports" && <ReportsSection onHandled={loadOverview} />}
      {section === "chat" && <ChatFlagsSection onHandled={loadOverview} onInspectPlayer={inspectPlayer} />}
      {/* Keyed on the handed-over player so each handoff mounts a fresh lookup
          rather than editing the open one. */}
      {section === "players" && (
        <PlayersSection
          key={pendingPlayer ?? "roster"}
          isAdmin={!!isAdmin}
          initialQuery={pendingPlayer}
          onActed={loadOverview}
        />
      )}
      {section === "log" && <AuditLogSection />}
      {section === "games" && <GamesSection />}
      {section === "nerfs" && <NerfFeedbackSection />}
      {section === "buffs" && <BuffFeedbackSection />}
      {section === "ideas" && <IdeasSection />}
      {section === "controls" && <ControlsSection isOwner={isOwner} isAdmin={!!isAdmin} />}
    </ModShell>
  );
}
