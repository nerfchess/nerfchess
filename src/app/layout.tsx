import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import { BackgroundControls } from "@/components/BackgroundControls";
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
        {/* Inter across the whole UI, Lichess-style. Loading at runtime keeps
            the Cloudflare build free of a font-fetch step. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="no-tap-highlight font-body">
        <SettingsBootstrap />
        {children}
        <BackgroundControls />
        <Analytics />
      </body>
    </html>
  );
}
