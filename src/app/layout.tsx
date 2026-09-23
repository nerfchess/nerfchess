import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { AchievementToast } from "@/components/AchievementToast";
import { SettingsBootstrap } from "@/components/SettingsBootstrap";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { HOME_DESCRIPTION, THEME_COLOR } from "@/lib/seo";
import { LAST_MODE_COOKIE, parseMode } from "@/lib/modeCookie";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { PRE_PAINT_SCRIPT } from "@/lib/session/prePaint";
import { SessionProvider } from "@/lib/session/SessionProvider";
import { parseWho, WHO_COOKIE } from "@/lib/session/who";
import "./globals.css";
import "./zen.css";

// ---------------------------------------------------------------------------
// Typefaces.
//
// Lichess sets the whole interface in Noto Sans, and so do we: one face for
// headings and body alike, with weight doing the hierarchy. JetBrains Mono
// carries the tabular chrome (clocks, ratings, ids, board coordinates).
//
// Each face still gets its OWN variable (--f-*) rather than being wired
// straight to --font-display / --font-body. The roles live in :root in
// globals.css, so a component asks for a role and never for a face.
// ---------------------------------------------------------------------------

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--f-noto",
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

/** Every face variable, for the <html> class list. */
const FONT_VARS = [notoSans, jetbrainsMono].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://nerfchess.com"),
  title: {
    default: "Nerf Chess · chess with power-ups, a free online chess variant",
    template: "%s · Nerf Chess",
  },
  description: HOME_DESCRIPTION,
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
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Nerf Chess · chess with power-ups, a free online chess variant",
    description: HOME_DESCRIPTION,
  },
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
  // Browser chrome matches the page background (design-system --bg).
  themeColor: THEME_COLOR,
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Who is this, before anything renders (brief section 4, decision Q1): the
  // display cookie says which header to draw, so a signed-in visitor gets the
  // final header on the first paint instead of an unknown one that grows when
  // /api/auth/me answers. Reading cookies makes pages render per request, but
  // there is no database read here: the hint is a cookie, trusted for layout
  // only, and /me stays the authority (src/lib/session/who.ts).
  const jar = await cookies();
  const hasSession = !!jar.get(SESSION_COOKIE)?.value;
  const hint = hasSession ? parseWho(jar.get(WHO_COOKIE)?.value) : null;
  const lastMode = parseMode(jar.get(LAST_MODE_COOKIE)?.value);
  return (
    // data-theme matches DEFAULT_SETTINGS.siteTheme ("dark") for the rare
    // visitor with scripts off; the pre-paint script below replaces it (and
    // stamps data-anim, zen, board and rail prefs) before the first paint.
    // suppressHydrationWarning covers exactly those attributes on <html>.
    // The face variables live on <html>, not <body>: --font-display and
    // --font-body are roles resolved in :root, and a value set on <body> would
    // beat them for everything inside it.
    <html lang="en" data-theme="dark" className={FONT_VARS} suppressHydrationWarning>
      <head>
        {/* Must stay the first script in <head>: it has to run before the
            stylesheet paints anything. */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
        {/* Organization, WebSite and VideoGame in one graph (src/components/seo/JsonLd.tsx). */}
        <SiteJsonLd />
      </head>
      <body className="no-tap-highlight font-body">
        <SessionProvider hint={hint} hasSession={hasSession} lastMode={lastMode}>
          <SettingsBootstrap />
          {children}
          {/* Site-wide, desktop-only unlock popups (bottom right). */}
          <AchievementToast />
        </SessionProvider>
      </body>
    </html>
  );
}
