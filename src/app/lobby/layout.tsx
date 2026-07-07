import type { Metadata } from "next";

// /lobby is a client component; this server layout supplies its metadata.
// Targets "play chess variant online" and matchmaking queries.
export const metadata: Metadata = {
  title: "Lobby: play Nerf Chess online against real people",
  description:
    "Join the Nerf Chess lobby and get matched against a real opponent. Rated Buff and Nerf queues, live games to watch, and challenges you can accept in one click. Free chess-variant matchmaking in your browser.",
  keywords: [
    "play chess variant online",
    "chess with power ups multiplayer",
    "online chess variant lobby",
    "nerf chess lobby",
    "buff chess online",
    "chess variant matchmaking",
  ],
  alternates: { canonical: "/lobby" },
  openGraph: {
    title: "Lobby: play Nerf Chess online against real people",
    description:
      "Get matched against a real opponent in the Nerf Chess lobby. Rated Buff and Nerf queues, live games, and one-click challenges.",
    url: "https://nerfchess.com/lobby",
  },
};

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
