import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import "./globals.css";

// Body text is Noto Sans, the same UI font Lichess ships. next/font self-hosts
// it at build time and exposes it as --font-body, which globals.css and the
// Tailwind font-body family already read. Headings keep Inter (see below).
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nerfchess.com"),
  title: "Nerf Chess · chess with secret rules",
  description:
    "Every player gets a secret rule. Win the game and figure out theirs before they figure out yours.",
  // Google only shows a favicon in search results if it can crawl one in a
  // 48px-multiple raster size; the SVG alone gets ignored and the result
  // shows the default globe.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon-180.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    siteName: "Nerf Chess",
    url: "https://nerfchess.com",
    title: "Nerf Chess · chess with secret rules",
    description:
      "Every player gets a secret rule. Win the game and figure out theirs before they figure out yours.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};

// Tells Google which image is the site's logo (Organization structured data),
// so search can show it in place of the generic globe/placeholder.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nerf Chess",
  url: "https://nerfchess.com",
  logo: "https://nerfchess.com/icon-512.png",
};

// resizes-content makes the mobile on-screen keyboard shrink the layout
// viewport, so bottom-fixed UI (the in-game move/chat drawer) stays visible
// above the keyboard instead of being covered by it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inter stays as the display face for headings (--font-display).
            Body text is Noto Sans, wired up via next/font above. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={`no-tap-highlight font-body ${notoSans.variable}`}>
        <SettingsBootstrap />
        {children}
      </body>
    </html>
  );
}
