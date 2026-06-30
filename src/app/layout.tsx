import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nerf Chess · chess with secret rules",
  description:
    "Every player gets a secret rule. Win the game and figure out theirs before they figure out yours.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Lichess uses Noto Sans across its UI. Loading at runtime keeps the
            Cloudflare build free of a font-fetch step. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="no-tap-highlight font-body">
        <SettingsBootstrap />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
