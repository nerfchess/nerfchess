// The console's information architecture, in one place.
//
// The old panel put nine unrelated tabs in a single row — a report queue sat
// between the game archive and a card-balance table, and the house-bot controls
// were pinned above all of them on every tab. The sections below are grouped by
// the QUESTION a moderator arrives with, in the order those questions get asked:
//
//   Queue    someone needs a decision from me
//   People   who is this player, and what has been done about them
//   Activity what is actually being played
//   Cards    which cards are working, and what are players asking for
//   Site     the switches that change how nerfchess behaves
//
// Everything reachable from the console lives in exactly one group, including
// the standalone pages (card editor, house personas, the two stats scopes)
// that used to hide as small text links in the page header.

export type SectionId =
  | "dashboard"
  | "reports"
  | "chat"
  | "players"
  | "log"
  | "games"
  | "nerfs"
  | "buffs"
  | "ideas"
  | "controls";

export const SECTION_IDS: SectionId[] = [
  "dashboard",
  "reports",
  "chat",
  "players",
  "log",
  "games",
  "nerfs",
  "buffs",
  "ideas",
  "controls",
];

/** A nav entry: either a section of this console, or a link out to one of the
 *  standalone moderator pages. */
export type NavItem =
  | {
      kind: "section";
      id: SectionId;
      label: string;
      glyph: string;
      /** Which live count, if any, rides on this entry. */
      badge?: "reports" | "chat";
      /** Admin-only entries are hidden from plain moderators. */
      adminOnly?: boolean;
    }
  | { kind: "link"; href: string; label: string; glyph: string; adminOnly?: boolean };

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Queue",
    items: [
      { kind: "section", id: "dashboard", label: "Dashboard", glyph: "◈" },
      { kind: "section", id: "reports", label: "Reports", glyph: "⚑", badge: "reports" },
      { kind: "section", id: "chat", label: "Chat flags", glyph: "✎", badge: "chat" },
    ],
  },
  {
    title: "People",
    items: [
      { kind: "section", id: "players", label: "Players", glyph: "☗" },
      { kind: "section", id: "log", label: "Audit log", glyph: "≡" },
    ],
  },
  {
    title: "Activity",
    items: [
      { kind: "section", id: "games", label: "Game archive", glyph: "♞" },
      { kind: "link", href: "/mod/stats/all", label: "Stats: all games", glyph: "◔" },
      { kind: "link", href: "/mod/stats/humans", label: "Stats: humans", glyph: "◕" },
    ],
  },
  {
    title: "Cards",
    items: [
      { kind: "section", id: "nerfs", label: "Nerf verdicts", glyph: "▼" },
      { kind: "section", id: "buffs", label: "Buff verdicts", glyph: "▲" },
      { kind: "section", id: "ideas", label: "Player ideas", glyph: "✦" },
      { kind: "link", href: "/mod/cards", label: "Card editor", glyph: "✍" },
    ],
  },
  {
    title: "Site",
    items: [
      { kind: "section", id: "controls", label: "Controls", glyph: "⚙" },
      { kind: "link", href: "/mod/house", label: "House personas", glyph: "☖", adminOnly: true },
    ],
  },
];

/** Human title shown above the open section. */
export const SECTION_TITLE: Record<SectionId, string> = {
  dashboard: "Dashboard",
  reports: "Reports",
  chat: "Chat flags",
  players: "Players",
  log: "Audit log",
  games: "Game archive",
  nerfs: "Nerf verdicts",
  buffs: "Buff verdicts",
  ideas: "Player ideas",
  controls: "Site controls",
};

export function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as string[]).includes(value);
}
