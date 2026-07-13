/** @type {import('next').NextConfig} */
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { execSync } from "node:child_process";

// Deployed-version stamp for the site footer: the most recent PR number in
// the commit log plus the short commit hash, computed at build time.
// Cloudflare Workers Builds clones the repo, so git is available on deploys;
// local dev without git history falls back to "dev".
function buildVersion() {
  try {
    const subjects = execSync("git log -20 --pretty=%s", { stdio: ["ignore", "pipe", "ignore"] }).toString();
    const pr = subjects.match(/#(\d+)/);
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return pr ? `PR #${pr[1]} · ${sha}` : sha;
  } catch {
    return "dev";
  }
}

// Expose Cloudflare bindings (D1, Durable Objects) to route handlers during
// `next dev` via wrangler's platform proxy. Guard to dev only: during a
// production `next build` (e.g. Cloudflare Workers Builds / CI) this call sets
// up the local platform proxy and, because of the Hyperdrive binding, demands a
// local Postgres connection string that CI has no reason to provide — throwing
// and failing the build. Production uses the real bindings at runtime, so the
// dev proxy is never needed there.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

// Content Security Policy. The only third-party origin is Cloudflare Turnstile
// (challenges.cloudflare.com) on the signup form: its api.js script, its widget
// iframe, and the XHRs it makes each need to be allow-listed below.
// Fonts come from Google Fonts (see src/app/layout.tsx).
// 'unsafe-inline' for styles is needed because tailwind + next inject style tags;
// 'unsafe-inline' for scripts is required by Next's hydration boot script.
// 'unsafe-eval' is only needed by webpack's dev-mode source maps, so it is
// kept out of production builds.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${devEval}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' ws: wss: https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_VERSION: buildVersion(),
    // Public Turnstile sitekey for the signup widget. Override per-environment
    // via NEXT_PUBLIC_TURNSTILE_SITEKEY at build time; the secret lives only as
    // the TURNSTILE_SECRET_KEY Worker secret.
    NEXT_PUBLIC_TURNSTILE_SITEKEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "0x4AAAAAADyLZ_9QP6JEhhkU",
    // Tier 3 direct-arena gate: the public base URL of the arena service.
    // Baked to the prod arena here (like the Turnstile sitekey above) so it is
    // inlined at every build and survives CI/dashboard var resets — a runtime
    // wrangler var can't drive it because NEXT_PUBLIC_* is inlined into the
    // client at build time. `||` (not `??`) so a stray empty CI var still falls
    // through to this default. Override with a non-empty NEXT_PUBLIC_ARENA_URL
    // for non-prod; to turn client Tier 3 off, change this default to "".
    // See src/lib/arenaLobby.ts.
    NEXT_PUBLIC_ARENA_URL:
      process.env.NEXT_PUBLIC_ARENA_URL || "https://arena.nerfchess.com",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
