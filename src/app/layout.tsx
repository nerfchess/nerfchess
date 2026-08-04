import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Chakra_Petch,
  Fraunces,
  IBM_Plex_Sans,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Noto_Sans,
  Public_Sans,
  Space_Grotesk,
  Spectral,
  Syne,
} from "next/font/google";
import { AchievementToast } from "@/components/AchievementToast";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import "./globals.css";

// ---------------------------------------------------------------------------
// Typefaces.
//
// Every face gets its OWN variable (--f-*) rather than being wired straight to
// --font-display / --font-body. That indirection is load-bearing: next/font
// puts its variables on the element carrying the class, which is <body>, and a
// value set on <body> beats one set on <html> for everything inside it. While
// Inter WAS --font-display, no html[data-theme] rule could override the display
// face — the override would resolve, then lose to body. With the faces parked
// on neutral names, --font-display and --font-body live only in :root and a
// theme block can claim them in plain CSS, with no JS involved at all.
//
// Bundle cost is close to nothing at runtime. A browser downloads a webfont
// only when rendered text actually resolves to it, so a visitor loads the two
// faces their theme uses, not thirteen. What DOES download unconditionally is
// a <link rel="preload">, which next/font emits per face — hence preload:false
// on every flagship face and true (the default) only on the three defaults.
// ---------------------------------------------------------------------------

// The defaults, used by every tint. Noto Sans is the UI font Lichess ships;
// Inter replaced a render-blocking external Google Fonts stylesheet.
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--f-noto",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--f-inter",
});

// Clocks, ratings, ids and board coordinates. --font-mono used to be a system
// stack ("Cascadia Mono", "JetBrains Mono", Consolas), and none of those ship
// on Linux or on phones, so tabular figures fell through to generic monospace
// and the clock's digits stopped lining up. Self-hosted, the face is real
// everywhere.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--f-mono",
});

// --- Flagship pairings ------------------------------------------------------
// One display + one body face each, no two sharing a genus, so the five never
// read as one family with the weight changed. See docs/themes.md.

// Obsidian — volcanic glass. Bricolage's chiselled terminals and width axis
// read as fractured glass rather than as another neutral grotesque.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
  variable: "--f-bricolage",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--f-inter-tight",
});

// Porcelain — glazed white, cobalt ink. Fraunces carries optical-size and
// "wonk" axes; high-contrast ink on paper is what earns the light scheme.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--f-fraunces",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--f-public-sans",
});

// Neon — arcade indigo. Chakra Petch is technical with clipped corners, which
// sidesteps the Orbitron cliché every neon brief reaches for.
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--f-chakra",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--f-space-grotesk",
});

// Jade — lacquer green. Spectral is a low-contrast serif with generous
// counters: lacquerware quiet, not decorative.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--f-spectral",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--f-plex-sans",
});

// Aurora — polar night, violet light. Syne's weights WIDEN rather than just
// thicken, which reads as drifting light. The deliberate risk of the five.
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
  preload: false,
  variable: "--f-syne",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--f-manrope",
});

/** Every face variable, for the <html> class list. */
const FONT_VARS = [
  notoSans,
  inter,
  jetbrainsMono,
  bricolage,
  interTight,
  fraunces,
  publicSans,
  chakraPetch,
  spaceGrotesk,
  spectral,
  plexSans,
  syne,
  manrope,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://nerfchess.com"),
  title: {
    default: "Nerf Chess · chess with power-ups, a free online chess variant",
    template: "%s · Nerf Chess",
  },
  description:
    "Nerf Chess is chess with power-ups: a free online chess variant. Draft power-up cards every 5 moves in Buff mode, or carry a secret handicap and hex your opponent in Nerf mode (in the spirit of drawback chess). Win by capturing the king. Play in your browser, no download.",
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
  // No images here on purpose: the file-based src/app/opengraph-image.tsx
  // supplies a proper 1200x630 preview site-wide, and the codex card routes
  // each render their own per-card image. Twitter falls back to og:image.
  openGraph: {
    type: "website",
    siteName: "Nerf Chess",
    url: "https://nerfchess.com",
    title: "Nerf Chess · chess with power-ups, a free online chess variant",
    description:
      "Chess with power-ups: a free online chess variant. Draft power-up cards every 5 moves in Buff mode, take a secret handicap in Nerf mode, and win by capturing the king.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nerf Chess · chess with power-ups, a free online chess variant",
    description:
      "Chess with power-ups: a free online chess variant. Draft power-up cards every 5 moves in Buff mode, take a secret handicap in Nerf mode, and win by capturing the king.",
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
  // viewport-fit=cover lets the page paint into the display cutout / home-bar
  // area on notched phones, so the env(safe-area-inset-*) guards on fixed UI
  // have room to work. User zoom is intentionally left enabled (no
  // maximum-scale / user-scalable lock) for accessibility.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme matches DEFAULT_SETTINGS.siteTheme ("dark", the Classic
    // palette) so first paint is already the default; SettingsBootstrap then
    // applies whatever the user actually chose. This used to say "crimson"
    // while the settings default was dark, which gave every fresh visitor a
    // crimson first paint that flipped after hydration.
    // The face variables live on <html>, not <body>: --font-display and
    // --font-body are claimed per theme by html[data-theme] rules, and a value
    // set on <body> would beat them for everything inside it.
    <html lang="en" data-theme="dark" className={FONT_VARS}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="no-tap-highlight font-body">
        <SettingsBootstrap />
        {children}
        {/* Site-wide, desktop-only unlock popups (bottom right). */}
        <AchievementToast />
      </body>
    </html>
  );
}
