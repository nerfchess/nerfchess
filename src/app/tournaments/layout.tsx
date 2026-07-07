import type { Metadata } from "next";

// Applies to /tournaments and /tournaments/[id]; no canonical is set because
// it would wrongly point every tournament page at the index.
export const metadata: Metadata = {
  title: "Tournaments: competitive Nerf Chess events",
  description:
    "Play Nerf Chess tournaments: timed, competitive events in Buff and Nerf mode where power-up drafting and secret handicaps meet a live bracket. Join an event and climb the standings.",
  keywords: [
    "nerf chess tournaments",
    "chess variant tournament",
    "power up chess tournament",
    "online chess variant events",
  ],
};

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
