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
import { NAV_GROUPS, SECTION_TITLE, isSectionId, type NavItem, type SectionId } from "@/components/mod/nav";
import type { Overview } from "@/components/mod/types";
import { CountBadge, Pill } from "@/components/mod/ui";

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

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 py-6 sm:px-10">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/lobby" className="px-3 py-1.5 text-parchment-100 hover:bg-white/5">
            Play
          </Link>
          <Link href="/leaderboard" className="px-3 py-1.5 text-parchment-100 hover:bg-white/5">
            Leaderboard
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-2 sm:px-6 sm:pt-8">
        {me === undefined ? (
          <div className="text-parchment-300">Loading…</div>
        ) : !isMod ? (
          <>
            <h1 className="font-display text-4xl">Moderation</h1>
            <p className="mt-3 text-parchment-200">
              This page is for moderators.{" "}
              {!me && (
                <Link href="/login" className="text-gold-leaf hover:underline">
                  Sign in
                </Link>
              )}
            </p>
          </>
        ) : (
          <>
            {/* One line on a phone: the title and who you are signed in as
                share a row rather than eating two. */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-display text-2xl sm:text-4xl">Moderation</h1>
              <span className="flex items-center gap-2">
                <span className="smallcaps hidden text-xs text-parchment-400 sm:inline">
                  {me.username}
                </span>
                <Pill tone="gold">{me.role}</Pill>
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-4 sm:mt-6 lg:flex-row lg:gap-8">
              <ModNav
                current={section}
                isAdmin={!!isAdmin}
                openReports={overview?.queue.openReports ?? 0}
                chatFlags={overview?.queue.unreviewedChatFlags ?? 0}
                onGo={go}
              />

              <div className="min-w-0 flex-1">
                {/* Phones read the section name off the picker above, so this
                    heading is desktop-only rather than a repeat. */}
                <h2 className="smallcaps hidden border-b border-white/10 pb-2 text-xs text-parchment-400 lg:block">
                  {SECTION_TITLE[section]}
                </h2>
                <div className="mt-4 lg:mt-5">
                  {section === "dashboard" && (
                    <DashboardSection data={overview} failed={overviewFailed} onGo={go} />
                  )}
                  {section === "reports" && <ReportsSection onHandled={loadOverview} />}
                  {section === "chat" && (
                    <ChatFlagsSection onHandled={loadOverview} onInspectPlayer={inspectPlayer} />
                  )}
                  {/* Keyed on the handed-over player so each handoff mounts a
                      fresh lookup rather than editing the open one. */}
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
                  {section === "controls" && (
                    <ControlsSection isOwner={isOwner} isAdmin={!!isAdmin} />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// ---------------- navigation ----------------

// A rail on desktop, a section picker on phones. Both render the same grouped
// list from nav.ts, so there is one place to add a section.
//
// The phone version is deliberately NOT a sideways-scrolling strip. Ten sections
// in a strip means seven of them sit past the right edge with nothing to say so;
// a moderator on a phone would never find the audit log. Instead the current
// section is a full-width sticky button that opens the whole grouped list —
// every section one tap away, with its badge, from anywhere on a long page.
function ModNav({
  current,
  isAdmin,
  openReports,
  chatFlags,
  onGo,
}: {
  current: SectionId;
  isAdmin: boolean;
  openReports: number;
  chatFlags: number;
  onGo: (id: SectionId) => void;
}) {
  const [open, setOpen] = useState(false);

  const badgeFor = (item: NavItem) =>
    item.kind === "section" && item.badge
      ? item.badge === "reports"
        ? openReports
        : chatFlags
      : 0;

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || isAdmin),
  })).filter((g) => g.items.length > 0);

  const currentItem = groups
    .flatMap((g) => g.items)
    .find((i) => i.kind === "section" && i.id === current);
  const pending = openReports + chatFlags;

  const pick = (id: SectionId) => {
    setOpen(false);
    onGo(id);
  };

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-6 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="smallcaps px-2 text-[10px] text-parchment-500">{group.title}</div>
              <ul className="mt-1 space-y-px">
                {group.items.map((item) => (
                  <li key={item.kind === "section" ? item.id : item.href}>
                    <NavEntry
                      item={item}
                      active={item.kind === "section" && item.id === current}
                      badge={badgeFor(item)}
                      onGo={onGo}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Phone / tablet picker. Sticky, so jumping sections never means
          scrolling back up through a screen of statistics first. */}
      {/* Opaque page-base fill plus a hairline, so section content scrolls
          cleanly under the bar instead of ghosting through it. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-white/10 bg-[var(--bg-base)] px-4 pb-2 pt-2 sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="press plate flex min-h-[46px] w-full items-center gap-2.5 px-3.5 py-2 text-left"
        >
          <span aria-hidden className="text-[13px] text-gold-leaf opacity-80">
            {currentItem?.glyph ?? "◈"}
          </span>
          <span className="font-display text-base text-parchment-50">
            {SECTION_TITLE[current]}
          </span>
          {!open && pending > 0 && (
            <span className="ml-auto shrink-0 rounded-[1px] bg-oxblood-glow/20 px-1.5 py-px font-mono text-[10px] tabular-nums text-oxblood-glow">
              {pending} waiting
            </span>
          )}
          <span
            aria-hidden
            className={
              "shrink-0 text-[10px] text-parchment-400 transition-transform " +
              (open ? "rotate-180" : "") +
              (pending > 0 && !open ? " ml-1.5" : " ml-auto")
            }
          >
            ▼
          </span>
        </button>

        {open && (
          <>
            {/* Tapping anywhere else dismisses, the way a menu should. */}
            <div
              className="fixed inset-0 cursor-default"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div className="plate mt-1 max-h-[78vh] overflow-y-auto p-1.5">
              {groups.map((group) => (
                <div key={group.title} className="px-1 py-0.5">
                  <div className="smallcaps px-1.5 text-[10px] text-parchment-500">
                    {group.title}
                  </div>
                  <ul className="mt-0.5 space-y-px">
                    {group.items.map((item) => (
                      <li key={item.kind === "section" ? item.id : item.href}>
                        <NavEntry
                          item={item}
                          active={item.kind === "section" && item.id === current}
                          badge={badgeFor(item)}
                          onGo={pick}
                          roomy
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function NavEntry({
  item,
  active,
  badge,
  onGo,
  roomy,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onGo: (id: SectionId) => void;
  roomy?: boolean;
}) {
  const base =
    "press flex w-full items-center gap-2.5 rounded-[1px] border text-sm transition " +
    (roomy ? "min-h-[40px] px-2.5 py-1.5" : "px-2 py-1.5") +
    " " +
    (active
      ? "border-gold/40 bg-gold-leaf/10 text-gold-leaf"
      : "border-transparent text-parchment-300 hover:border-white/10 hover:bg-white/[0.03] hover:text-parchment-50");

  const inner = (
    <>
      <span aria-hidden className="w-3.5 shrink-0 text-center text-[11px] opacity-70">
        {item.glyph}
      </span>
      <span className="font-display">{item.label}</span>
      {item.kind === "link" ? (
        <span aria-hidden className="ml-auto text-[10px] text-parchment-500">
          ↗
        </span>
      ) : (
        <CountBadge n={badge} />
      )}
    </>
  );

  if (item.kind === "link") {
    return (
      <Link href={item.href} className={base}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onGo(item.id)} aria-current={active ? "page" : undefined} className={base}>
      {inner}
    </button>
  );
}
