import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans } from "next/font/google";
import { AchievementToast } from "@/components/AchievementToast";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import "./globals.css";

// Body text is Noto Sans, the same UI font Lichess ships. next/font self-hosts
// it at build time and exposes it as --font-body, which globals.css and the
// Tailwind font-body family already read.
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

// Headings use Inter, also self-hosted via next/font: the old external
// Google Fonts stylesheet was a render-blocking request on every first paint.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nerfchess.com"),
  title: {
    default: "Nerf Chess · chess with secret rules and power-up cards",
    template: "%s · Nerf Chess",
  },
  description:
    "Nerf Chess is a free online chess variant with two modes: Nerf (every player carries a secret handicap, in the spirit of drawback chess) and Buff (draft power-up cards every 5 moves). Win by capturing the king. Play in your browser, no download.",
  keywords: [
    "nerf chess",
    "drawback chess",
    "chess variant online",
    "chess with power ups",
    "chess cards game",
    "chess with secret rules",
    "free chess variant",
    "play chess variants online",
    "buff chess",
    "chess handicap game",
  ],
  applicationName: "Nerf Chess",
  alternates: { canonical: "/" },
  category: "game",
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
    type: "website",
    siteName: "Nerf Chess",
    url: "https://nerfchess.com",
    title: "Nerf Chess · chess with secret rules and power-up cards",
    description:
      "A free online chess variant. Secret handicaps in Nerf mode, drafted power-up cards in Buff mode, and the game only ends when a king is captured.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Nerf Chess · chess with secret rules and power-up cards",
    description:
      "A free online chess variant. Secret handicaps in Nerf mode, drafted power-up cards in Buff mode, and the game only ends when a king is captured.",
    images: ["/icon-512.png"],
  },
};

// Site-wide structured data, one @graph so a single script tag carries it all:
// - Organization: tells Google which image is the site's logo, so search shows
//   it instead of the generic globe/placeholder.
// - WebSite + SearchAction: names the site and points crawlers at the codex
//   search (sitelinks search box eligibility).
// - VideoGame co-typed with WebApplication: Google only shows software rich
//   results when VideoGame is paired with an application type. Declares the
//   game free (offers price 0), browser-playable, and carries the
//   "Drawback Chess" alternate name AI answer engines associate with the
//   secret-handicap concept.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nerfchess.com/#org",
      name: "Nerf Chess",
      url: "https://nerfchess.com",
      logo: "https://nerfchess.com/icon-512.png",
    },
    {
      "@type": "WebSite",
      "@id": "https://nerfchess.com/#website",
      name: "Nerf Chess",
      url: "https://nerfchess.com",
      publisher: { "@id": "https://nerfchess.com/#org" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://nerfchess.com/codex?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": ["VideoGame", "WebApplication"],
      "@id": "https://nerfchess.com/#game",
      name: "Nerf Chess",
      alternateName: ["Drawback Chess", "Buff Chess", "Power-up Chess"],
      url: "https://nerfchess.com",
      description:
        "A free online chess variant with two modes: Nerf mode gives every player a secret handicap revealed at game end, and Buff mode lets both players draft power-up cards every 5 moves. The game ends by capturing the king, not checkmate.",
      genre: ["Chess variant", "Board game", "Strategy", "Card game"],
      keywords:
        "chess variant, chess with power-ups, power-up chess, buff chess, drawback chess, chess with cards, capture the king chess, chess without checkmate, chess roguelike, chess card game",
      gamePlatform: "Web browser",
      applicationCategory: "GameApplication",
      applicationSubCategory: "Chess",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript",
      inLanguage: "en",
      isAccessibleForFree: true,
      playMode: ["MultiPlayer", "SinglePlayer"],
      numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
      image: "https://nerfchess.com/icon-512.png",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      publisher: { "@id": "https://nerfchess.com/#org" },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={`no-tap-highlight font-body ${notoSans.variable} ${inter.variable}`}>
        <SettingsBootstrap />
        {children}
        {/* Site-wide, desktop-only unlock popups (bottom right). */}
        <AchievementToast />
      </body>
    </html>
  );
}
